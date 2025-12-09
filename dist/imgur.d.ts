/**
 * Imgur Image Upload Service
 *
 * Uses Imgur's anonymous upload API to host payment proof images.
 * No authentication required for anonymous uploads (limited to 50 uploads/hour)
 *
 * For production, register an app at https://api.imgur.com/oauth2/addclient
 * and set IMGUR_CLIENT_ID environment variable
 */
/**
 * Upload an image to Imgur and return the public URL
 */
export declare function uploadToImgur(imageBuffer: Buffer, fileName: string): Promise<string>;
//# sourceMappingURL=imgur.d.ts.map