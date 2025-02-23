import express from 'express';
import ffmpeg from 'fluent-ffmpeg';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello World');
});

app.post('/process-video', (req, res) => {
    const inputFilePath = req.body.inputFilePath;
    const outputFilePath = req.body.outputFilePath;

    if (!inputFilePath || !outputFilePath) {
        res.status(400).send('Missing input or output file path');
        return;
    }

    const videoStream = ffmpeg(inputFilePath);
    videoStream
        .outputOptions('-vf', 'scale=-2:360')
        .on('end', () => {
            res.status(200).send('Video processing Finished...');
        })
        .on('error', (err) => {
            res.status(500).send(`Error processing video: ${err.message}`);
        })
        .on('stderr', (stderr) => {
            console.error(`FFmpeg stderr: ${stderr}`);
        })
        .save(outputFilePath);
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})