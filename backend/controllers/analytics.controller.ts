import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Scan from '../models/scan.model.js';
import Batch from '../models/batch.model.js';

/**
 * GET /api/analytics/timeline
 * Get aggregated scan counts over time, optionally grouped by product or batch.
 * Query params: from (ISO date), to (ISO date), groupBy ('total' | 'product' | 'batch')
 */
export const getTimelineAnalytics = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { from, to, groupBy = 'total', productId, batchNumber } = req.query;

		let startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		let endDate = to ? new Date(to as string) : new Date();

		// Ensure full day coverage if requested via YYYY-MM-DD
		if (from && (from as string).length === 10) startDate.setUTCHours(0, 0, 0, 0);
		if (to && (to as string).length === 10) endDate.setUTCHours(23, 59, 59, 999);

		const batchMatch: any = { createdBy: userId };
		if (batchNumber) batchMatch.batchNumber = batchNumber as string;
		if (productId) {
			if (mongoose.Types.ObjectId.isValid(productId as string)) {
				batchMatch.product = new mongoose.Types.ObjectId(productId as string);
			} else {
				batchMatch.productId = productId as string;
			}
		}

		const batchIds = (await Batch.find(batchMatch).select('_id')).map(b => b._id);

		if (batchIds.length === 0) {
			return res.json({ history: [], metadata: { totals: { all: 0 } } });
		}

		const matchStage = {
			batch: { $in: batchIds },
			createdAt: { $gte: startDate, $lte: endDate }
		};

		let groupStage: any = {
			_id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
			count: { $sum: 1 }
		};

		const pipeline: any[] = [{ $match: matchStage }];

		if (groupBy === 'product' || groupBy === 'batch') {
			// Join with Batch to get names
			pipeline.push({
				$lookup: {
					from: 'batches',
					localField: 'batch',
					foreignField: '_id',
					as: 'batchInfo'
				}
			});
			pipeline.push({ $unwind: '$batchInfo' });

			const groupKey = groupBy === 'product' ? '$batchInfo.productName' : '$batchInfo.batchNumber';
			
			pipeline.push({
				$group: {
					_id: {
						date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
						entity: groupKey
					},
					count: { $sum: 1 }
				}
			});

			pipeline.push({ $sort: { "_id.date": 1 } });
		} else {
			pipeline.push({ $group: groupStage });
			pipeline.push({ $sort: { _id: 1 } });
		}

		const results = await Scan.aggregate(pipeline);

		// Format dynamic series data
		// Expected: { date: "...", "Product A": 10, "Product B": 5 }
		const historyMap: Record<string, any> = {};
		const entityTotals: Record<string, number> = { all: 0 };

		results.forEach(item => {
			if (groupBy === 'total') {
				historyMap[item._id] = { date: item._id, count: item.count };
				entityTotals.all += item.count;
			} else {
				const date = item._id.date;
				const entity = item._id.entity;
				if (!historyMap[date]) historyMap[date] = { date };
				historyMap[date][entity] = item.count;
				
				entityTotals[entity] = (entityTotals[entity] || 0) + item.count;
				entityTotals.all += item.count;
			}
		});

		res.json({ 
			history: Object.values(historyMap),
			metadata: { totals: entityTotals }
		});
	} catch (error) {
		console.error('Timeline analytics error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

/**
 * GET /api/analytics/geographic
 * Get scan distribution by location within a timeframe.
 * Query params: from, to
 */
export const getGeographicAnalytics = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { from, to, productId, batchNumber } = req.query;

		let startDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
		let endDate = to ? new Date(to as string) : new Date();

		if (from && (from as string).length === 10) startDate.setUTCHours(0, 0, 0, 0);
		if (to && (to as string).length === 10) endDate.setUTCHours(23, 59, 59, 999);

		const batchMatch: any = { createdBy: userId };
		if (batchNumber) batchMatch.batchNumber = batchNumber as string;
		if (productId) {
			if (mongoose.Types.ObjectId.isValid(productId as string)) {
				batchMatch.product = new mongoose.Types.ObjectId(productId as string);
			} else {
				batchMatch.productId = productId as string;
			}
		}

		const batchIds = (await Batch.find(batchMatch).select('_id')).map(b => b._id);

		if (batchIds.length === 0) return res.json({ distribution: [] });

		const distribution = await Scan.aggregate([
			{ 
				$match: { 
					batch: { $in: batchIds },
					createdAt: { $gte: startDate, $lte: endDate }
				} 
			},
			{
				$group: {
					_id: { country: "$country", city: "$city" },
					count: { $sum: 1 }
				}
			},
			{ $sort: { count: -1 } },
			{ $limit: 20 }
		]);

		res.json({ 
			distribution: distribution.map(d => ({
				country: d._id.country || 'Unknown',
				city: d._id.city || 'Unknown',
				count: d.count
			}))
		});
	} catch (error) {
		console.error('Geo analytics error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

/**
 * GET /api/analytics/details (Deep Dive)
 * Paginated list of scans with advanced filters.
 * Query params: from, to, page, limit, productId, batchNumber, country, suspiciousOnly
 */
export const getScanDetails = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const { 
			from, to, 
			page = 1, limit = 20, 
			productId, batchNumber,
			country, suspiciousOnly 
		} = req.query;

		const skip = (Number(page) - 1) * Number(limit);
		let startDate = from ? new Date(from as string) : undefined;
		let endDate = to ? new Date(to as string) : undefined;

		if (from && (from as string).length === 10 && startDate) startDate.setUTCHours(0, 0, 0, 0);
		if (to && (to as string).length === 10 && endDate) endDate.setUTCHours(23, 59, 59, 999);

		// 1. Find relevant batch IDs
		const batchMatch: any = { createdBy: userId };
		if (batchNumber) batchMatch.batchNumber = batchNumber as string;
		if (productId) {
			if (mongoose.Types.ObjectId.isValid(productId as string)) {
				batchMatch.product = new mongoose.Types.ObjectId(productId as string);
			} else {
				batchMatch.productId = productId as string;
			}
		}

		const batches = await Batch.find(batchMatch).select('_id productName batchNumber');
		const batchIds = batches.map(b => b._id);

		if (batchIds.length === 0) {
			return res.json({ scans: [], total: 0, page: Number(page), limit: Number(limit) });
		}

		// 2. Build Scan Match Query
		const scanMatch: any = { batch: { $in: batchIds } };
		if (startDate || endDate) {
			scanMatch.createdAt = {};
			if (startDate) scanMatch.createdAt.$gte = startDate;
			if (endDate) scanMatch.createdAt.$lte = endDate;
		}
		if (country) scanMatch.country = country;
		
		// If suspiciousOnly, we might need to join or have a flag. 
		// For now, let's keep it simple or implement the suspicious flag if added.

		const total = await Scan.countDocuments(scanMatch);
		const scans = await Scan.find(scanMatch)
			.sort({ createdAt: -1 })
			.skip(skip)
			.limit(Number(limit))
			.populate({ path: 'batch', select: 'batchNumber productName' });

		res.json({
			scans,
			total,
			page: Number(page),
			limit: Number(limit),
			totalPages: Math.ceil(total / Number(limit))
		});
	} catch (error) {
		console.error('Scan details error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

/**
 * GET /api/analytics/threats
 */
export const getThreatAnalytics = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const batches = await Batch.find({ createdBy: userId }).select('_id');
		const batchIds = batches.map(b => b._id);

		if (batchIds.length === 0) return res.json({ threats: [] });

		const threats = await Scan.aggregate([
			{ $match: { batch: { $in: batchIds } } },
			{
				$group: {
					_id: { batch: "$batch", unit: "$unitIndex" },
					uniqueVisitors: { $addToSet: "$visitorId" },
					totalScans: { $sum: 1 }
				}
			},
			{
				$project: {
					batch: "$_id.batch",
					unit: "$_id.unit",
					visitorCount: { $size: "$uniqueVisitors" },
					totalScans: 1
				}
			},
			{ $match: { visitorCount: { $gt: 3 } } },
			{ $sort: { visitorCount: -1 } },
			{ $limit: 10 }
		]);

		const populatedThreats = await Batch.populate(threats, { path: 'batch', select: 'batchNumber productName' });
		res.json({ threats: populatedThreats });
	} catch (error) {
		console.error('Threat analytics error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
