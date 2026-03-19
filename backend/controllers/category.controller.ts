import { Request, Response } from 'express';
import Category from '../models/category.model.js';

// POST /api/categories — Create a new category
export const createCategory = async (req: Request, res: Response) => {
	try {
		const { name, description } = req.body;

		if (!name) {
			return res.status(400).json({ message: 'Category name is required.' });
		}

		const userId = (req as any).user?.id;

		// Duplicate check
		const existing = await Category.findOne({ name, createdBy: userId });
		if (existing) {
			return res.status(400).json({ message: 'A category with this name already exists.' });
		}

		const category = new Category({
			name,
			description,
			createdBy: userId,
		});

		await category.save();
		res.status(201).json({ message: 'Category created successfully.', category });
	} catch (error: any) {
		console.error('Create category error:', error);
		if (error.code === 11000) {
			return res.status(400).json({ message: 'Category name already exists.' });
		}
		res.status(500).json({ message: 'Internal server error' });
	}
};

// GET /api/categories — List all categories for the manufacturer
export const listCategories = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const categories = await Category.find({ createdBy: userId }).sort({ createdAt: -1 }).lean();
		res.json({ categories });
	} catch (error) {
		console.error('List categories error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};

// PUT /api/categories/:id — Update a category
export const updateCategory = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const category = await Category.findById(req.params.id);

		if (!category) {
			return res.status(404).json({ message: 'Category not found' });
		}
		if (category.createdBy.toString() !== userId) {
			return res.status(403).json({ message: 'Not authorized' });
		}

		const { name, description } = req.body;

		if (name) category.name = name;
		if (description !== undefined) category.description = description;

		await category.save();
		res.json({ message: 'Category updated.', category });
	} catch (error: any) {
		console.error('Update category error:', error);
		if (error.code === 11000) {
			return res.status(400).json({ message: 'Category name already exists.' });
		}
		res.status(500).json({ message: 'Internal server error' });
	}
};

// DELETE /api/categories/:id — Remove a category
export const deleteCategory = async (req: Request, res: Response) => {
	try {
		const userId = (req as any).user?.id;
		const category = await Category.findById(req.params.id);

		if (!category) {
			return res.status(404).json({ message: 'Category not found' });
		}
		if (category.createdBy.toString() !== userId) {
			return res.status(403).json({ message: 'Not authorized' });
		}

		await category.deleteOne();
		res.json({ message: 'Category deleted.' });
	} catch (error) {
		console.error('Delete category error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
};
