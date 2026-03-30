import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import {
	S3_ENDPOINT,
	S3_REGION,
	S3_ACCESS_KEY,
	S3_SECRET_KEY,
	S3_BUCKET,
} from '../config/config.js';

if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
	console.warn('S3 credentials are missing. Media features will be limited.');
}

const s3Client = new S3Client({
	endpoint: S3_ENDPOINT,
	region: S3_REGION,
	credentials: {
		accessKeyId: S3_ACCESS_KEY,
		secretAccessKey: S3_SECRET_KEY,
	},
	forcePathStyle: true, // Necessary for MinIO compatibility
});

// Auto-create bucket if it doesn't exist (useful for local MinIO dev)
export const initS3 = async () => {
	try {
		await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
	} catch (error: any) {
		if (error.$metadata?.httpStatusCode === 404) {
			console.log(`Bucket ${S3_BUCKET} not found. Creating...`);
			try {
				await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
				console.log(`Bucket ${S3_BUCKET} created successfully.`);
			} catch (createError) {
				console.error(`Failed to create bucket ${S3_BUCKET}`, createError);
			}
		} else {
			console.error(`Error checking bucket ${S3_BUCKET}`, error);
		}
	}
};

/**
 * Deletes a file from S3 given its public API URL or direct key.
 * @param fileUrl The URL (e.g. /api/media/products/3f84...png) or direct key
 */
export const deleteFile = async (fileUrl: string) => {
	try {
		if (!fileUrl) return;

		// Extract key from URL
		// Example: /api/media/products/someid.png -> products/someid.png
		let key = fileUrl;
		if (fileUrl.startsWith('/api/media/')) {
			key = fileUrl.replace('/api/media/', '');
		}

		console.log(`Attempting to delete image from storage: ${key}`);

		await s3Client.send(new DeleteObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		}));

		return true;
	} catch (error) {
		console.error(`Error deleting file from S3: ${fileUrl}`, error);
		return false;
	}
};

export { s3Client, S3_BUCKET };
export default {
	s3Client,
	S3_BUCKET,
	initS3,
	deleteFile
};
