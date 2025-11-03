import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import analyticsService from '../services/analyticsService';
import { ApiResponse } from '../utils/types';

const router = Router();

// Get platform statistics
router.get(
  '/platform',
  asyncHandler(async (req: Request, res: Response) => {
    const stats = await analyticsService.getPlatformStats();

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  })
);

// Get referral analytics
router.get(
  '/referrals',
  asyncHandler(async (req: Request, res: Response) => {
    const analytics = await analyticsService.getReferralAnalytics();

    const response: ApiResponse = {
      success: true,
      data: analytics,
    };

    res.json(response);
  })
);

// Get volume over time
router.get(
  '/volume',
  asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const data = await analyticsService.getVolumeOverTime(days);

    const response: ApiResponse = {
      success: true,
      data,
    };

    res.json(response);
  })
);

// Get top pools
router.get(
  '/pools/top',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const pools = await analyticsService.getTopPools(limit);

    const response: ApiResponse = {
      success: true,
      data: pools,
    };

    res.json(response);
  })
);

// Get user growth
router.get(
  '/growth',
  asyncHandler(async (req: Request, res: Response) => {
    const days = parseInt(req.query.days as string) || 30;
    const data = await analyticsService.getUserGrowth(days);

    const response: ApiResponse = {
      success: true,
      data,
    };

    res.json(response);
  })
);

// Get tier distribution
router.get(
  '/tiers',
  asyncHandler(async (req: Request, res: Response) => {
    const distribution = await analyticsService.getTierDistribution();

    const response: ApiResponse = {
      success: true,
      data: distribution,
    };

    res.json(response);
  })
);

export default router;
