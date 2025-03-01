import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

const storage = new Storage();

const rawVideoBucketName = 'aromal-raw-videos';
const processedVideoBucketName = 'aromal-processed-videos';

const localRawVideoPath = './raw-videos';
const localProcessedVideoPath = './processed-videos';


/**
 * Sets up the necessary directories for storing raw and processed videos.
 * 
 * This function checks if the local directories for raw and processed videos
 * exist, and if they do not, it creates them. This is essential for ensuring
 * that the application has the required file structure to store video files
 * during processing.
 * 
 * @returns {} This function does not return a value.
 */
export function setupDirectories(): void {
    ensureDirExists(localRawVideoPath);
    ensureDirExists(localProcessedVideoPath);
}


/**
 * Downloads a raw video file from the specified Google Cloud Storage bucket.
 * 
 * This function retrieves a video file from the 'aromal-raw-videos' bucket 
 * using the provided file name. The downloaded file is returned as a string 
 * representation of the file's content.
 * 
 * @param fileName - The name of the video file to be downloaded from the raw video bucket.
 * @returns A promise that resolves to the content of the downloaded video file as a string.
 * @throws An error if the download fails or the file does not exist.
 */
export async function downloadRawVideo(fileName: string) {
    await storage.bucket(rawVideoBucketName).file(fileName).download({
        destination: `${localRawVideoPath}/${fileName}`,
    });
    console.log(`gs://${rawVideoBucketName}/${fileName} downloaded to ${localRawVideoPath}/${fileName}`);
}


export async function uploadProcessedVideo(fileName: string): Promise<void> {
    const bucket = storage.bucket(processedVideoBucketName);
    await bucket.upload(`${localProcessedVideoPath}/${fileName}`, { destination: fileName });
    await bucket.file(fileName).makePublic();
    console.log(`${localProcessedVideoPath}/${fileName} uploaded to gs://${processedVideoBucketName}/${fileName}`);
}


function deleteFile(fileName: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (fs.existsSync(`${localRawVideoPath}/${fileName}`)) {
            fs.unlink(`${localRawVideoPath}/${fileName}`, (err) => {
                if (err) {
                    console.error(`Error deleting ${fileName} from ${localRawVideoPath}: ${err}`);
                    reject(err);
                } else {
                    console.log(`File ${fileName} deleted from ${localRawVideoPath}`);
                    resolve();
                }
            });
        } else {
            console.log(`File ${fileName} does not exist`);
            resolve();
        }
    });
}


/**
 * @param fileName - The name of the file to delete from the
 * {@link localRawVideoPath} folder.
 * @returns A promise that resolves when the file has been deleted.
 * 
 */
export function deleteRawVideo(fileName: string) {
    return deleteFile(`${localRawVideoPath}/${fileName}`);
  }
  
  
  /**
  * @param fileName - The name of the file to delete from the
  * {@link localProcessedVideoPath} folder.
  * @returns A promise that resolves when the file has been deleted.
  * 
  */
  export function deleteProcessedVideo(fileName: string) {
    return deleteFile(`${localProcessedVideoPath}/${fileName}`);
  }


/**
 * Converts a video from the raw video bucket and saves it to the processed video bucket.
 * 
 * This function uses FFmpeg to process the video located at the specified path in the 
 * local raw video directory. It applies a scaling filter to the video and saves the 
 * processed video to the specified output path.
 * 
 * @param rawVideoBucketName - The name of the raw video file to be processed.
 * @param processedVideoBucketName - The name of the processed video file to be saved.
 * @returns A promise that resolves when the video processing is complete or rejects 
 *          if an error occurs during processing.
 */
export function convertVideo(rawVideoBucketName: string, processedVideoBucketName: string): Promise<void> {
    return new Promise((resolve, reject) => {
        ffmpeg(`${localRawVideoPath}/${rawVideoBucketName}`)
        .outputOptions('-vf', 'scale=-2:360')
        .on('end', () => {
            console.log('Processing finished successfully');
            resolve(); // Call resolve to indicate processing is finished
        })
        .on('error', (err) => {
            console.error(`Error processing video: ${err.message}`);
            reject(err); // Reject with error
        })
        .on('stderr', (stderr) => {
            console.error(`FFmpeg stderr: ${stderr}`);
        })
        .save(`${localProcessedVideoPath}/${processedVideoBucketName}`); // Save to processed path
    });
}


function ensureDirExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

