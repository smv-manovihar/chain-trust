import { Router } from 'express';
import { S3Client, PutObjectCommand, HeadBucketCommand, CreateBucketCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { authenticateJWT as protect, checkRole } from '../middlewares/auth.middleware.js';
import {
	S3_ENDPOINT,
	S3_REGION,
	S3_ACCESS_KEY,
	S3_SECRET_KEY,
	S3_BUCKET,
} from '../config/config.js';

const router:Router = Router();

if (!S3_ACCESS_KEY || !S3_SECRET_KEY) {
	console.error('S3 credentials are missing. Uploads will fail.');
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
const initBucket = async () => {
	try {
		await s3Client.send(new HeadBucketCommand({ Bucket: S3_BUCKET }));
	} catch (error: any) {
		if (error.$metadata?.httpStatusCode === 404) {
			console.log(`Bucket ${S3_BUCKET} not found. Creating...`);
			try {
				await s3Client.send(new CreateBucketCommand({ Bucket: S3_BUCKET }));
				console.log(`Bucket ${S3_BUCKET} created successfully.`);
				// Note: in a real production system you'd also want to set public-read policy here
				// so the images are viewable by the frontend.
			} catch (createError) {
				console.error(`Failed to create bucket ${S3_BUCKET}`, createError);
			}
		} else {
			console.error(`Error checking bucket ${S3_BUCKET}`, error);
		}
	}
};
initBucket();

// Configure Multer to use memory storage temporarily before pushing to S3
// This avoids needing multer-s3 and gives us more control over the S3Client commands directly
const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
	fileFilter: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		if (ext !== '.png' && ext !== '.jpg' && ext !== '.jpeg' && ext !== '.webp') {
			return cb(new Error('Only images are allowed'));
		}
		cb(null, true);
	},
});

const checkManufacturer = checkRole(['manufacturer', 'employee']);

router.post('/', protect, checkManufacturer, upload.array('images', 5), async (req, res) => {
	try {
		if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
			return res.status(400).json({ message: 'No files uploaded' });
		}

		const files = req.files as Express.Multer.File[];
		const uploadPromises = files.map(async (file) => {
			const ext = path.extname(file.originalname);
			// Generate random filename to prevent collisions
			const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
			const key = `products/${filename}`;

			const command = new PutObjectCommand({
				Bucket: S3_BUCKET,
				Key: key,
				Body: file.buffer,
				ContentType: file.mimetype,
			});

			await s3Client.send(command);

			// Return relative proxy URL instead of direct S3 link
			return `/api/media/${key}`;
		});

		const imageUrls = await Promise.all(uploadPromises);

		res.status(200).json({ urls: imageUrls });
	} catch (error) {
		console.error('Error uploading to S3/MinIO:', error);
		res.status(500).json({ message: 'Failed to upload images' });
	}
});

router.get('/*key', async (req, res) => {
	try {
		// Express 5 `/*key` parses path segments into an array.
		const key = (req.params.key as string[]).join('/');

		const command = new GetObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		});

		const { Body, ContentType } = await s3Client.send(command);

		if (!Body) {
			return res.status(404).json({ message: 'File not found' });
		}

		res.setHeader('Content-Type', ContentType || 'image/jpeg');
		// Cache for 1 day for better performance
		res.setHeader('Cache-Control', 'public, max-age=86400');

		// Stream the body to response
		(Body as any).pipe(res);
	} catch (error: any) {
		if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
			return res.status(404).json({ message: 'File not found' });
		}
		console.error('Error proxying from S3:', error);
		res.status(500).json({ message: 'Error fetching image' });
	}
});

export default router;
