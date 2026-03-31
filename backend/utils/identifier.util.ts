import mongoose from 'mongoose';

/**
 * Resolves an item from a Mongoose model using either its MongoDB _id or a Business ID.
 * Supports:
 * - Batch: _id or batchNumber
 * - Product: _id or productId
 */
export async function resolveItem<T>(
	Model: mongoose.Model<T>,
	identifier: string,
	queryContext: Record<string, any> = {},
	populate: any = ''
): Promise<T | null> {
	const isObjectId = mongoose.isValidObjectId(identifier);
	
	const businessIdField = (Model.modelName === 'Batch') ? 'batchNumber' : 'productId';

	const query = {
		...queryContext,
		$or: [
			...(isObjectId ? [{ _id: identifier }] : []),
			{ [businessIdField]: identifier }
		]
	};

	let findQuery = Model.findOne(query);
	if (populate) findQuery = findQuery.populate(populate as any);
	
	return await findQuery;
}

/**
 * Standardized slug generator for manual items.
 * Example: "Vitamin C 500mg" -> "vitamin-c-500mg"
 */
export function generateIdSlug(name: string): string {
	return name
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}
