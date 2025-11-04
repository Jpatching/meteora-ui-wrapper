import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import referralService from '../services/referralService';
import { ValidationError } from '../utils/errors';
import { ApiResponse, CreateReferralRequest } from '../utils/types';

const router = Router();

// Get leaderboard
router.get(
  '/leaderboard',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 100;

    const leaderboard = await referralService.getLeaderboard(limit);

    const response: ApiResponse = {
      success: true,
      data: leaderboard,
    };

    res.json(response);
  })
);

// Get user referral stats
router.get(
  '/:wallet/stats',
  asyncHandler(async (req: Request, res: Response) => {
    const { wallet } = req.params;

    if (!wallet) {
      throw new ValidationError('Wallet address is required');
    }

    const stats = await referralService.getUserStats(wallet);

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  })
);

// Validate referral code
router.get(
  '/validate/:code',
  asyncHandler(async (req: Request, res: Response) => {
    const { code } = req.params;

    if (!code) {
      throw new ValidationError('Referral code is required');
    }

    const validation = await referralService.validateCode(code);

    const response: ApiResponse = {
      success: true,
      data: validation,
    };

    res.json(response);
  })
);

// Create referral relationship
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data: CreateReferralRequest = req.body;

    if (!data.referrer_wallet || !data.referee_wallet || !data.referral_code) {
      throw new ValidationError('Missing required fields');
    }

    const referral = await referralService.createReferral(data);

    const response: ApiResponse = {
      success: true,
      data: referral,
      message: 'Referral created successfully',
    };

    res.status(201).json(response);
  })
);

export default router;
