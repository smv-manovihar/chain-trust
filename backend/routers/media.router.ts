import { Router } from 'express';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { authenticateJWT as protect, checkRole } from '../middlewares/auth.middleware.js';
import { s3Client, S3_BUCKET } from '../services/s3.service.js';

const router:Router = Router();
// S3 init is now handled globally via s3.service.ts

// Configure Multer to use memory storage temporarily before pushing to S3
// This avoids needing multer-s3 and gives us more control over the S3Client commands directly
const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB limit
	fileFilter: (_req, file, cb) => {
		const ext = path.extname(file.originalname).toLowerCase();
		const allowed = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'];
		if (!allowed.includes(ext)) {
			return cb(new Error('Only images and PDF documents are allowed'));
		}
		cb(null, true);
	},
});

const checkUploadAuth = checkRole(['manufacturer', 'employee', 'customer']);

router.post('/', protect, checkUploadAuth, upload.array('images', 5), async (req, res) => {
	try {
		if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
			return res.status(400).json({ message: 'No files uploaded' });
		}

		const user = (req as any).user;
		const isCustomer = user.role === 'customer';
		const prefix = isCustomer ? 'customer-uploads' : 'products';

		const files = req.files as Express.Multer.File[];
		const uploadPromises = files.map(async (file) => {
			const ext = path.extname(file.originalname);
			// Generate random filename to prevent collisions
			const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
			const key = `${prefix}/${filename}`;

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

// 1. PUBLIC Product Images
router.get('/products/*key', async (req, res) => {
	try {
		const keyList = req.params.key as unknown as string[];
		const key = `products/${keyList.join('/')}`; // Express 5 glob captures as array
		
		const command = new GetObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		});

		const { Body, ContentType } = await s3Client.send(command);
		if (!Body) {
			return res.status(404).json({ message: 'File not found' });
		}

		res.setHeader('Content-Type', ContentType || 'image/jpeg');
		res.setHeader('Cache-Control', 'public, max-age=86400');
		(Body as any).pipe(res);
	} catch (error: any) {
		if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
			return res.status(404).json({ message: 'File not found' });
		}
		console.error('Error proxying from S3:', error);
		res.status(500).json({ message: 'Error fetching image' });
	}
});

// 2. PROTECTED Customer Uploads
router.get('/customer-uploads/*key', protect, async (req, res) => {
	try {
		const userId = (req as any).user.id;
		const keyList = req.params.key as unknown as string[];
		const fullKey = `customer-uploads/${keyList.join('/')}`;

		// SECURITY: Ownership check
		// Instead of a slow DB query for every image, we can enforce path-based access
		// if we ensure upload prefix is always user-specific. 
		// For now, let's check CabinetItem to be robust.
		const CabinetItem = (await import('../models/cabinet.model.js')).default;
		const hasAccess = await CabinetItem.findOne({
			userId,
			$or: [
				{ images: { $regex: fullKey } },
				{ 'prescriptions.url': { $regex: fullKey } }
			]
		});

		if (!hasAccess) {
			return res.status(403).json({ message: 'Access denied to this file' });
		}

		const command = new GetObjectCommand({
			Bucket: S3_BUCKET,
			Key: fullKey,
		});

		const { Body, ContentType } = await s3Client.send(command);
		if (!Body) {
			return res.status(404).json({ message: 'File not found' });
		}

		res.setHeader('Content-Type', ContentType || 'application/octet-stream');
		res.setHeader('Cache-Control', 'private, max-age=3600');
		(Body as any).pipe(res);
	} catch (error: any) {
		if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
			return res.status(404).json({ message: 'File not found' });
		}
		console.error('Error proxying from S3:', error);
		res.status(500).json({ message: 'Error fetching file' });
	}
});

// Legacy catch-all for backward compatibility (optional but safer)
router.get('/*key', async (req, res) => {
	try {
		const keyList = req.params.key as unknown as string[];
		const key = keyList.join('/');
		// Don't allow access onto customer-uploads through public catch-all
		if (key.startsWith('customer-uploads')) {
			return res.status(401).json({ message: 'Authentication required' });
		}

		const command = new GetObjectCommand({
			Bucket: S3_BUCKET,
			Key: key,
		});

		const { Body, ContentType } = await s3Client.send(command);
		if (!Body) {
			return res.status(404).json({ message: 'File not found' });
		}

		res.setHeader('Content-Type', ContentType || 'image/jpeg');
		res.setHeader('Cache-Control', 'public, max-age=86400');
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
