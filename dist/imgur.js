"use strict";
/**
 * Imgur Image Upload Service
 *
 * Uses Imgur's anonymous upload API to host payment proof images.
 * No authentication required for anonymous uploads (limited to 50 uploads/hour)
 *
 * For production, register an app at https://api.imgur.com/oauth2/addclient
 * and set IMGUR_CLIENT_ID environment variable
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToImgur = uploadToImgur;
/**
 * Upload an image to Imgur and return the public URL
 */
async function uploadToImgur(imageBuffer, fileName) {
    // Use client ID from env, or fall back to anonymous upload
    const clientId = process.env.IMGUR_CLIENT_ID || 'a1b2c3d4e5f6g7h'; // Default anonymous client ID
    const base64Image = imageBuffer.toString('base64');
    try {
        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: {
                'Authorization': `Client-ID ${clientId}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image: base64Image,
                type: 'base64',
                name: fileName,
                title: `Payment Proof - ${fileName}`,
                description: `Celadon Rose Sale payment proof uploaded at ${new Date().toISOString()}`,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Imgur] Upload failed:', response.status, errorText);
            throw new Error(`Imgur upload failed: ${response.status} ${response.statusText}`);
        }
        const result = await response.json();
        if (!result.success || !result.data?.link) {
            console.error('[Imgur] Invalid response:', result);
            throw new Error('Invalid response from Imgur');
        }
        console.log('[Imgur] Uploaded:', fileName, '->', result.data.link);
        return result.data.link;
    }
    catch (error) {
        console.error('[Imgur] Error uploading image:', error);
        throw new Error(`Failed to upload to Imgur: ${error.message}`);
    }
}
//# sourceMappingURL=imgur.js.map