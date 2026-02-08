import express from 'express';
import { body } from 'express-validator';
import * as PaymentController from '../../controllers/PaymentController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();

// Get Stripe config (public endpoint)
router.get('/api/v1/payment/config', PaymentController.getConfig);

// Create Stripe checkout session
router.post(
  '/api/v1/payment/create-checkout-session',
  authMiddleware.verifyToken,
  body('metadata').optional().isObject(),
  PaymentController.createCheckoutSession
);

// Verify payment status
router.get(
  '/api/v1/payment/verify/:sessionId',
  authMiddleware.verifyToken,
  PaymentController.verifyPayment
);

// Create refund (admin/user endpoint)
router.post(
  '/api/v1/payment/refund',
  authMiddleware.verifyToken,
  body('orderId').isMongoId().withMessage('Valid order ID required'),
  body('amount').optional().isNumeric().withMessage('Amount must be numeric'),
  PaymentController.createRefund
);

export { router as paymentRouter };
export default router;
