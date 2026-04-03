import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { asyncHandler, createError } from '../middleware/errorHandler.js';

export const transactionsRouter = Router();

// GET /api/transactions - Get all transactions with optional filters
transactionsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await DataService.getUser('demo@financeflow.local');
  
  const options = {
    type: req.query.type as 'income' | 'expense' | undefined,
    category: req.query.category as string | undefined,
    limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
  };

  const transactions = await DataService.getTransactionsByUserId(user.id, options);

  res.json({
    success: true,
    data: transactions
  });
}));

// POST /api/transactions - Create new transaction
transactionsRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await DataService.getUser('demo@financeflow.local');
  
  const { type, description, category, amount, currency, occurredAt } = req.body;

  // Validation
  if (!type || !description || !category || !amount) {
    throw createError('Missing required fields: type, description, category, amount', 400);
  }

  if (!['income', 'expense'].includes(type)) {
    throw createError('Type must be either "income" or "expense"', 400);
  }

  if (typeof amount !== 'number' || amount <= 0) {
    throw createError('Amount must be a positive number', 400);
  }

  const transactionData = {
    type,
    description: description.trim(),
    category: category.trim(),
    amount,
    currency: currency || 'INR',
    occurredAt: occurredAt || new Date().toISOString()
  };

  const transaction = await DataService.createTransaction(user.id, transactionData);

  res.status(201).json({
    success: true,
    data: transaction
  });
}));

// PUT /api/transactions/:id - Update transaction
transactionsRouter.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await DataService.getUser('demo@financeflow.local');
  const transactionId = parseInt(req.params.id);

  if (isNaN(transactionId)) {
    throw createError('Invalid transaction ID', 400);
  }

  const updateData: any = {};
  const allowedFields = ['type', 'description', 'category', 'amount', 'currency', 'occurredAt'];
  
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (Object.keys(updateData).length === 0) {
    throw createError('No valid fields provided for update', 400);
  }

  // Validation
  if (updateData.type && !['income', 'expense'].includes(updateData.type)) {
    throw createError('Type must be either "income" or "expense"', 400);
  }

  if (updateData.amount && (typeof updateData.amount !== 'number' || updateData.amount <= 0)) {
    throw createError('Amount must be a positive number', 400);
  }

  const transaction = await DataService.updateTransaction(transactionId, user.id, updateData);

  res.json({
    success: true,
    data: transaction
  });
}));

// DELETE /api/transactions/:id - Delete transaction
transactionsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = await DataService.getUser('demo@financeflow.local');
  const transactionId = parseInt(req.params.id);

  if (isNaN(transactionId)) {
    throw createError('Invalid transaction ID', 400);
  }

  await DataService.deleteTransaction(transactionId, user.id);

  res.json({
    success: true,
    message: 'Transaction deleted successfully'
  });
}));