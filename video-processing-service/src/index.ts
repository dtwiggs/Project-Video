    import express from "express";
    import ffmpeg from "fluent-ffmpeg";
    import { convertVideo, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, setupDirectories, uploadProcessedVideo } from "./storage";

    setupDirectories();

    const app = express();
    app.use(express.json());

    app.post("/process-video", async (req, res): Promise<any> => {
        // Get the bucket and filename from a Cloud Pub/Sub message
        let data;
        try {
            const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
            data = JSON.parse(message);
            if(!data.name) {
                throw new Error('Invalid message payload received');
            }
        } catch (error) {
            console.error(error);
            return res.status(400).send('Bad request: missing filename.');
        }

        const inputFileName = data.name;
        const outputFileName = `processed-${inputFileName}`;

        // Download the raw video from cloud storage
        await downloadRawVideo(inputFileName);

        // Process the video and convert to 360p
        try {
            await convertVideo(inputFileName, outputFileName);
        } catch(err) {
            await Promise.all([
                deleteRawVideo(inputFileName),
                deleteProcessedVideo(outputFileName)
            ]);
            console.log(err);
            return res.status(500).send('Internal Server Error: video processing failed.')
        }
        // Upload the processed video to cloud storage
        await uploadProcessedVideo(outputFileName);

        await Promise.all([
            deleteRawVideo(inputFileName),
            deleteProcessedVideo(outputFileName)
        ]);
        
        return res.status(200).send('Processing finished successfully');
    });

    // vv Helpful for deployment, the environment may specify a different port
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Video processing service listening at http://localhost:${port}`);
    });