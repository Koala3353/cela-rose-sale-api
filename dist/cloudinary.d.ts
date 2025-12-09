/**
 * Upload an image to Cloudinary from a buffer
 * @param imageBuffer Buffer containing the image data
 * @param folder Folder to store the image in (default: 'rose-sale-proofs')
 * @returns Public URL of the uploaded image
 */
export declare function uploadToCloudinary(imageBuffer: Buffer, fileName: string, // Cloudinary uses public_id, often doesn't need extension
folder?: string): Promise<string>;
//# sourceMappingURL=cloudinary.d.ts.map