import { Router, Request, Response } from 'express';
import { DataService } from '../services/dataService.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const goalsRouter = Router();

// GET /api/goals - Get all goals for user
goalsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const user = await DataService.getUser('demo@financeflow.local');
  const goals = await DataService.getGoalsByUserId(user.id);

  res.json({
    success: true,
    data: goals
  });
}));