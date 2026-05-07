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
import { initAllJobs } from './jobs/index.js';
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
app.use(express.json({ limit: '25mb', strict: false }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
	res.on('finish', () => {
		console.log(`${new Date().toISOString().replace('T', '-').replace('Z', '')} - ${req.method} ${req.originalUrl} - ${res.statusCode}`);
	});
	next();
});

// Global API rate limiting
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 2000, // 2000 requests per 15 minutes
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
app.use('/api/auth', apiLimiter, authRouter);
app.use('/api/company', apiLimiter, companyRouter);
app.use('/api/products', apiLimiter, productRouter);
app.use('/api/batches', apiLimiter, batchRouter);
app.use('/api/media', apiLimiter, mediaRouter);
app.use('/api/users', apiLimiter, userRouter);
app.use('/api/categories', apiLimiter, categoryRouter);
app.use('/api/notifications', apiLimiter, notificationRouter);
app.use('/api/analytics', apiLimiter, analyticsRouter);
app.use('/api/cabinet', apiLimiter, cabinetRouter);

// 404 handler
app.use((_req, res) => {
	res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
	// Handle body-parser SyntaxErrors (e.g. malformed JSON)
	if (err instanceof SyntaxError && (err as any).status === 400 && 'body' in err) {
		return res.status(400).json({ message: 'Invalid JSON payload. Please check your request body.' });
	}

	console.error('Unhandled error:', err);
	res.status(err.status || 500).json({ 
		message: err.message || 'Internal server error',
		...(process.env.NODE_ENV === 'development' && { stack: err.stack })
	});
});

// Start server
const startServer = async () => {
	await connectDB();
	await initS3();
	initAllJobs();

	const server = app.listen(Number(PORT), '0.0.0.0', () => {
		console.log(`Server is running on port ${PORT} (accessible at 0.0.0.0)`);
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
