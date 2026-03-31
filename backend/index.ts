import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';

import { PORT, FRONTEND_URL } from './config/config.js';
import { connectDB, getDBStatus } from './database/db.js';

import companyRouter from './routers/company.router.js';
import authRouter from './routers/auth.router.js';
import productRouter from './routers/product.router.js';
import mediaRouter from './routers/media.router.js';
import userRouter from './routers/user.router.js';
import batchRouter from './routers/batch.router.js';
import categoryRouter from './routers/category.router.js';
import notificationRouter from './routers/notification.router.js';
import analyticsRouter from './routers/analytics.router.js';
import cabinetRouter from './routers/cabinet.router.js';
import { startCronJobs } from './jobs/cron.js';
import { initS3 } from './services/s3.service.js';

// Initialize Express
const app = express();

// Trust proxy for rate limiting behind reverse proxies
app.set('trust proxy', 1);

// CORS
app.use(
	cors({
		origin: [FRONTEND_URL, 'http://127.0.0.1:3000', 'http://localhost:3000'],
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
		allowedHeaders: [
			'Content-Type',
			'Authorization',
			'X-Refresh-Token',
			'X-Requested-With',
			'Accept',
		],
		exposedHeaders: ['Authorization'],
	}),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
	res.on('finish', () => {
		console.log(`${new Date().toISOString().replace('T', '-').replace('Z', '')} - ${req.method} ${req.originalUrl} - ${res.statusCode}`);
	});
	next();
});

// Rate limiting for auth routes
const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
	message: { message: 'Too many requests, please try again later' },
});

// Health check
app.get('/api/health', (_req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		db: getDBStatus(),
	});
});

// Routes
app.use('/api/auth', authLimiter, authRouter);
app.use('/api/company', authLimiter, companyRouter);
app.use('/api/products', productRouter);
app.use('/api/batches', batchRouter);
app.use('/api/media', mediaRouter);
app.use('/api/users', userRouter);
app.use('/api/categories', categoryRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/cabinet', cabinetRouter);

// 404 handler
app.use((_req, res) => {
	res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error('Unhandled error:', err);
	res.status(500).json({ message: 'Internal server error' });
});

// Start server
const startServer = async () => {
	await connectDB();
	await initS3();
	startCronJobs();

	const server = app.listen(PORT, () => {
		console.log(`Server is running on port ${PORT}`);
	});

	// Graceful shutdown
	const shutdown = async () => {
		console.log('Shutting down gracefully...');
		server.close(() => {
			console.log('Server closed');
			process.exit(0);
		});

		setTimeout(() => {
			console.error('Could not close connections in time, forcing shutdown');
			process.exit(1);
		}, 10000);
	};

	process.on('SIGINT', shutdown);
	process.on('SIGTERM', shutdown);
};

startServer();
