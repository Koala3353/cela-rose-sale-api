import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

/**
 * Configure Cloudinary with environment variables
 */
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload an image to Cloudinary from a buffer
 * @param imageBuffer Buffer containing the image data
 * @param folder Folder to store the image in (default: 'rose-sale-proofs')
 * @returns Public URL of the uploaded image
 */
export async function uploadToCloudinary(
    imageBuffer: Buffer,
    fileName: string, // Cloudinary uses public_id, often doesn't need extension
    folder: string = 'rose-sale-proofs'
): Promise<string> {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                public_id: fileName,
                resource_type: 'image',
            },
            (error, result) => {
                if (error) {
                    console.error('[Cloudinary] Upload failed:', error);
                    return reject(new Error(`Cloudinary upload failed: ${error.message}`));
                }
                if (!result || !result.secure_url) {
                    return reject(new Error('Cloudinary upload successful but no URL returned'));
                }

                console.log('[Cloudinary] Uploaded:', fileName, '->', result.secure_url);
                resolve(result.secure_url);
            }
        );

        // Create a readable stream from the buffer and pipe it to Cloudinary
        const stream = new Readable();
        stream.push(imageBuffer);
        stream.push(null); // Signal end of stream
        stream.pipe(uploadStream);
    });
}
