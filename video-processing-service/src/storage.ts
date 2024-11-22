// 1. Handles all the google cloud storage (GCS) file interactions
// 2. Local file interactions too

import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const storage = new Storage();

const rawVideoBucketName = "daltons-raw-videos";
const processedVideoBucketName = "daltons-processed-videos";

const localRawVideoPath = "./raw-videos";
const localProcessedVideoPath = "./processed-videos";

/**
 * Creates local directories for raw and processed files within docker container
 **/
export function setupDirectories(){
    ensureDirectoryExistence(localRawVideoPath);
    ensureDirectoryExistence(localProcessedVideoPath);
}

/** 
* @param rawVideoName - The name of the file to convert from {@link localRawVideoPath}
* @param processedVideoName - The name of the file to convert to {@link localProcessedVideoPath}
* @returns A promise that resolves when the video has been converted.
**/
// Backticks allow for multiple parameters
export function convertVideo(rawVideoName: string, processedVideoName: string){
    // Wrap function in a javascript promise so we know from index.ts when this finishes
    return new Promise<void>((resolve, reject) => {
        ffmpeg(`${localRawVideoPath}/${rawVideoName}`)
        .outputOptions("-vf", "scale=-1:360")
        .on("end", () => {
            console.log("Processed finished successfully");
            resolve();
        })
        .on("error", (err: Error) => {
            console.log(`An error occurred: ${err.message}`);
            reject(err);
        })
        .save(`${localProcessedVideoPath}/${processedVideoName}`);
    })
}

/**
 * @param fileName - The name of the file to download from the {@link rawVideoBucketName} bucket
 * into the {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been downloaded.
 */
export async function downloadRawVideo(fileName: string){
    await storage.bucket(rawVideoBucketName)
        .file(fileName)
        .download({destination: `${localRawVideoPath}/${fileName}`});

    console.log(`gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}.`);
}

/**
 * @param fileName - The name of the file to upload from the {@link localProcessedVideoPath}
 * folder into the {@link processedVideoBucketName}.
 * @returns A promise that resolves when the file has been uploaded.
 */
export async function uploadProcessedVideo(fileName: string){
    const bucket = storage.bucket(processedVideoBucketName);

    await bucket.upload(`${localProcessedVideoPath}/${fileName}`, {destination: fileName});

    console.log(`${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}`);

    await bucket.file(fileName).makePublic();
}

/**
 * @param fileName - The file name of the raw video we want to delete from {@link localRawVideoPath}
 * @returns A promise that resolves if the file is properly deleted.
 */
export function deleteRawVideo(fileName: string){
    return deleteFile(`${localRawVideoPath}/${fileName}`);
}

/**
 * @param fileName - The file name of the processed video that we want to delete from {@link localProcessedVideoPath}
 * @returns A promise that resolves if the file is properly deleted.
 */
export function deleteProcessedVideo(fileName: string){
    return deleteFile(`${localProcessedVideoPath}/${fileName}`);
}

/**
 * @param filePath - The name of the file to delete from the {@link localRawVideoPath}
 *  and {@link localProcessedVideoPath} folders once put into the buckets.
 * @returns A promise that resolves when the file has been deleted.
 */
function deleteFile(filePath: string): Promise<void>{
    return new Promise((resolve, reject) => {
        if(fs.existsSync(filePath)) {
            fs.unlink(filePath, (err) =>{
                if(err) {
                    console.log(`Failed to delete file at ${filePath}`, err);
                    reject(err);                    
                } else {
                    console.log(`File deleted at ${filePath}`);
                    resolve();
                }
            })
        } else {
            console.log(`File was not found at ${filePath}, skipping the delete.`);
            resolve();
            // MIGHT WANT TO REJECT, figure it out. Resolving just keeps the file there.
        }
    })
}

/**
 * Ensures a directory exists, creating one if necessary.
 * @param dirPath - The directory path to check for existence.
 */
function ensureDirectoryExistence(dirPath: string){
    if(!fs.existsSync(dirPath)){
        fs.mkdirSync(dirPath, { recursive: true }); // recursive true enables creating nested directories
        console.log(`Directory created at ${dirPath}`)
    }
}