import express, { Request, Response } from 'express';
import ffmpeg from 'fluent-ffmpeg';
import { convertVideo, deleteProcessedVideo, deleteRawVideo, downloadRawVideo, setupDirectories, uploadProcessedVideo } from './storage';

setupDirectories();

const app = express();
app.use(express.json());

app.get('/', (req: Request, res: Response) => {
    res.send('Hello World');
});

app.post('/process-video', async (req: Request, res: Response) : Promise<any> => {

    // Get the bucket and filename from the Cloud Pub/Sub message
    let data: any;
    try {
      const message = Buffer.from(req.body.message.data, 'base64').toString('utf8');
      data = JSON.parse(message);
      if (!data.name) {
        throw new Error('Invalid message payload received.');
      }
    } catch (error) {
      console.error(error);
      return res.status(400).send('Bad Request: missing filename.');
    }
  
    const inputFileName = data.name;
    const outputFileName = `processed-${inputFileName}`;
  
    // Download the raw video from Cloud Storage
    await downloadRawVideo(inputFileName);
  
    // Process the video into 360p
    try { 
      await convertVideo(inputFileName, outputFileName)
    } catch (err) {
      await Promise.all([
        deleteRawVideo(inputFileName),
        deleteProcessedVideo(outputFileName)
      ]);
      return res.status(500).send('Processing failed');
    }
    
    // Upload the processed video to Cloud Storage
    await uploadProcessedVideo(outputFileName);
  
    await Promise.all([
      deleteRawVideo(inputFileName),
      deleteProcessedVideo(outputFileName)
    ]);
  
    return res.status(200).send('Processing finished successfully');
});


const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})