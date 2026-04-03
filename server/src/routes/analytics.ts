import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const analyticsRouter = Router();

// GET /api/analytics/overview - Get analytics overview
analyticsRouter.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const user = await DataService.getUser('demo@financeflow.local');
  const months = req.query.months ? parseInt(req.query.months as string) : 12;
  
  const stats = await DataService.getUserStats(user.id, months);

  res.json({
    success: true,
    data: {
      monthlyComparison: stats.monthlyData,
      categoryBreakdown: stats.categoryBreakdown,
      totalIncome: stats.totalIncome,
      totalExpenses: stats.totalExpenses,
      savingsRate: stats.savingsRate
    }
  });
}));