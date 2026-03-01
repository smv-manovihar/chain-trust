import { Router } from 'express';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import { authenticateJWT as protect } from '../middlewares/auth.middleware.js';
import {
	S3_ENDPOINT,
	S3_REGION,
	S3_ACCESS_KEY,
	S3_SECRET_KEY,
	S3_BUCKET,
	S3_PUBLIC_URL,
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

router.post('/', protect, upload.array('images', 5), async (req, res) => {
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

			return `${S3_PUBLIC_URL}/${key}`;
		});

		const imageUrls = await Promise.all(uploadPromises);

		res.status(200).json({ urls: imageUrls });
	} catch (error) {
		console.error('Error uploading to S3/MinIO:', error);
		res.status(500).json({ message: 'Failed to upload images' });
	}
});

export default router;
