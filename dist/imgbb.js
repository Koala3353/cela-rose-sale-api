"use strict";
/**
 * ImgBB Image Upload Service
 *
 * Uses ImgBB's API to host payment proof images.
 * API docs: https://api.imgbb.com/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToImgBB = uploadToImgBB;
/**
 * Upload an image to ImgBB and return the public URL
 */
async function uploadToImgBB(imageBuffer, fileName) {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
        throw new Error('IMGBB_API_KEY environment variable is required');
    }
    const base64Image = imageBuffer.toString('base64');
    try {
        // ImgBB uses form data
        const formData = new URLSearchParams();
        formData.append('key', apiKey);
        formData.append('image', base64Image);
        formData.append('name', fileName);
        const response = await fetch('https://api.imgbb.com/1/upload', {
            method: 'POST',
            body: formData,
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ImgBB] Upload failed:', response.status, errorText);
            throw new Error(`ImgBB upload failed: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success || !result.data?.url) {
            console.error('[ImgBB] Invalid response:', result);
            throw new Error('Invalid response from ImgBB');
        }
        console.log('[ImgBB] Uploaded:', fileName, '->', result.data.url);
        return result.data.url;
    }
    catch (error) {
        console.error('[ImgBB] Error uploading image:', error);
        throw new Error(`Failed to upload to ImgBB: ${error.message}`);
    }
}
//# sourceMappingURL=imgbb.js.map