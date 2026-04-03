import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const dashboardRouter = Router();

// GET /api/dashboard - Get complete dashboard data
dashboardRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  // For now, using demo user. In production, get from JWT token
  const user = await DataService.getUser('demo@financeflow.local');
  const stats = await DataService.getUserStats(user.id);
  const goals = await DataService.getGoalsByUserId(user.id);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      },
      stats,
      goals
    }
  });
}));

// GET /api/dashboard/stats - Get just the stats
dashboardRouter.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const user = await DataService.getUser('demo@financeflow.local');
  const stats = await DataService.getUserStats(user.id);

  res.json({
    success: true,
    data: stats
  });
}));