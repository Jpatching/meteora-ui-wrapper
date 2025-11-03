import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import userService from '../services/userService';
import { ValidationError } from '../utils/errors';
import { ApiResponse, CreateUserRequest, RecordTransactionRequest } from '../utils/types';

const router = Router();

// Get or create user
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const data: CreateUserRequest = req.body;

    if (!data.wallet_address) {
      throw new ValidationError('Wallet address is required');
    }

    const user = await userService.createUser(data);

    const response: ApiResponse = {
      success: true,
      data: user,
      message: user ? 'User retrieved' : 'User created successfully',
    };

    res.status(200).json(response);
  })
);

// Get user by wallet
router.get(
  '/:wallet',
  asyncHandler(async (req: Request, res: Response) => {
    const { wallet } = req.params;

    if (!wallet) {
      throw new ValidationError('Wallet address is required');
    }

    const user = await userService.getUser(wallet);

    const response: ApiResponse = {
      success: true,
      data: user,
    };

    res.json(response);
  })
);

// Get user tier info
router.get(
  '/:wallet/tier',
  asyncHandler(async (req: Request, res: Response) => {
    const { wallet } = req.params;

    if (!wallet) {
      throw new ValidationError('Wallet address is required');
    }

    const tierInfo = await userService.getUserTier(wallet);

    const response: ApiResponse = {
      success: true,
      data: tierInfo,
    };

    res.json(response);
  })
);

// Get user transactions
router.get(
  '/:wallet/transactions',
  asyncHandler(async (req: Request, res: Response) => {
    const { wallet } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!wallet) {
      throw new ValidationError('Wallet address is required');
    }

    const transactions = await userService.getUserTransactions(wallet, limit, offset);

    const response: ApiResponse = {
      success: true,
      data: transactions,
    };

    res.json(response);
  })
);

// Record transaction
router.post(
  '/transactions',
  asyncHandler(async (req: Request, res: Response) => {
    const data: RecordTransactionRequest = req.body;

    if (!data.user_wallet || !data.transaction_signature) {
      throw new ValidationError('Missing required fields');
    }

    const transaction = await userService.recordTransaction(data);

    const response: ApiResponse = {
      success: true,
      data: transaction,
      message: 'Transaction recorded successfully',
    };

    res.status(201).json(response);
  })
);

export default router;
