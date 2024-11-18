    import express from "express";
    import ffmpeg from "fluent-ffmpeg";

    const app = express();
    app.use(express.json());

    app.post("/process-video", (req, res) => {
        // We expect the request to have a body including the path of the video input file
        const inputFilePath = req.body.inputFilePath;
        const outputFilePath = req.body.outputFilePath;

        if(!inputFilePath || !outputFilePath){
            res.status(400).send("Bad Request: Missing file path.")
        }

        // Remember to look into documentation or chatgpt stuff like this on how ffmpeg works etc
        ffmpeg(inputFilePath)
            .outputOptions("-vf", "scale=-1:360")
            .on("end", () => {
                res.status(200).send("Video processed successfully");
            })
            .on("error", (err: Error) => {
                console.log(`An error occured: ${err.message}`);
                res.status(500).send(`Internal Server Error: ${err.message}`)
            })
            .save(outputFilePath);
    });

    // vv Helpful for deployment, the environment may specify a different port
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Video processing service listening at http://localhost:${port}`);
    });