import { Types } from 'mongoose';
import Scan, { IScan } from '../models/scan.model.js';

interface SuspiciousnessResult {
	isSuspicious: boolean;
	reason: string | null;
}

// Helper to calculate distance between two lat/lng points in kilometers (Haversine formula)
function calculateDistanceKM(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371; // Radius of the earth in km
	const dLat = (lat2 - lat1) * (Math.PI / 180);
	const dLon = (lon2 - lon1) * (Math.PI / 180);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export const calculateSuspiciousness = async (
	batchId: Types.ObjectId,
	unitIndex: number,
	newScanIp: string,
	newScanLatitude?: number,
	newScanLongitude?: number
): Promise<SuspiciousnessResult> => {
	try {
		// 1. Get recent scans for this specific unit
		const recentScans = await Scan.find({ batch: batchId, unitIndex })
			.sort({ createdAt: -1 })
			.limit(20)
			.lean();

		if (recentScans.length === 0) {
			return { isSuspicious: false, reason: null }; // First scan is never suspicious
		}

		// 2. High Scan Count Check
		// If a single unit is scanned more than 5 times by different visitors, it's highly suspicious.
		// (Assuming a medicine packet is only scanned by a manufacturer, distributor, pharmacy, and end-consumer)
		const uniqueVisitors = new Set(recentScans.map(s => s.visitorId));
		if (uniqueVisitors.size > 3) {
			return { 
				isSuspicious: true, 
				reason: `Unit has an abnormally high number of scans by different users (${uniqueVisitors.size} unique users). Potential counterfeit.` 
			};
		}

		// 3. Geographic Jump & Multi-Location Check
		if (newScanLatitude !== undefined && newScanLongitude !== undefined) {
			const lastGeoScan = recentScans.find(s => s.latitude !== undefined && s.longitude !== undefined);
			
			if (lastGeoScan && lastGeoScan.latitude !== undefined && lastGeoScan.longitude !== undefined) {
				const distanceKM = calculateDistanceKM(
					lastGeoScan.latitude, 
					lastGeoScan.longitude, 
					newScanLatitude, 
					newScanLongitude
				);
				
				const timeDiffHours = (Date.now() - new Date(lastGeoScan.createdAt).getTime()) / (1000 * 60 * 60);

				// If the scan occurred in a vastly different location (>500km) within a very short time (<2 hours)
				// Or simultaneously in two different cities, it's impossible travel.
				if (timeDiffHours < 2 && distanceKM > 500) {
					return {
						isSuspicious: true,
						reason: `Unit was scanned in conflicting geographic locations (${Math.round(distanceKM)}km apart) within an impossible timeframe (${timeDiffHours.toFixed(1)} hours). Potential duplicate QR codes.`
					};
				}
			}
		}

		// New: Multi-City logic (Last 24 hours)
		const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
		const recentDayScans = recentScans.filter(s => new Date(s.createdAt) > twentyFourHoursAgo);
		const uniqueCities = new Set(recentDayScans.map(s => s.city).filter(Boolean));
		if (uniqueCities.size > 2) {
			return {
				isSuspicious: true,
				reason: `Unit scans detected in more than 2 unique cities (${Array.from(uniqueCities).join(', ')}) within 24 hours. Highly indicative of counterfeit mass-production.`
			};
		}

		// 4. IP Velocity & Frequency Check
		// Multiple rapid scans from different IPs in a short window.
		const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
		const recentHourScans = recentScans.filter(s => new Date(s.createdAt) > oneHourAgo);
		
		// New: Frequency Threshold (regardless of IP)
		if (recentHourScans.length >= 5) {
			return {
				isSuspicious: true,
				reason: `Abnormal scan volume detected (${recentHourScans.length} unique scans in under 1 hour). Individual units are rarely scanned this frequently by consumers.`
			};
		}

		const uniqueIPsInHour = new Set(recentHourScans.map(s => s.ip).filter(Boolean));
		if (uniqueIPsInHour.size >= 3 && !uniqueIPsInHour.has(newScanIp)) {
			// E.g., if we see 3 different IPs already in the last hour, and now a 4th IP.
			return {
				isSuspicious: true,
				reason: `Unit is being flooded with scans from multiple IP addresses simultaneously. Potential automated enumeration or mass-counterfeit.`
			};
		}

		return { isSuspicious: false, reason: null };
	} catch (error) {
		console.error('Error calculating suspiciousness:', error);
		// Fail open so we don't break verification, but log it.
		return { isSuspicious: false, reason: null };
	}
};
