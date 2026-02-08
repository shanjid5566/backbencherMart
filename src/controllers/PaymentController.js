import Cart from '../models/cart.js';
import * as paymentService from '../services/paymentService.js';

/**
 * Create a Stripe checkout session
 * POST /api/v1/payment/create-checkout-session
 */
export async function createCheckoutSession(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get cart (don't populate - we have denormalized data)
    const cart = await Cart.findOne({ user: userId });
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const metadata = req.body.metadata || {};

    // Create checkout session via service
    const result = await paymentService.createCheckoutSession({
      userId,
      cart,
      metadata,
    });

    // Clear cart after successful checkout session creation
    cart.items = [];
    await cart.save();

    res.json({
      success: true,
      sessionId: result.sessionId,
      url: result.url,
      orderId: result.orderId,
    });

  } catch (err) {
    console.error('Stripe checkout error:', err);
    next(err);
  }
}

/**
 * Verify payment status
 * GET /api/v1/payment/verify/:sessionId
 */
export async function verifyPayment(req, res, next) {
  try {
    const { sessionId } = req.params;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const result = await paymentService.verifySession({ sessionId, userId });

    res.json({
      success: true,
      paymentStatus: result.paymentStatus,
      sessionStatus: result.sessionStatus,
      order: result.order,
    });

  } catch (err) {
    console.error('Payment verification error:', err);
    next(err);
  }
}

/**
 * Create refund for an order
 * POST /api/v1/payment/refund
 */
export async function createRefund(req, res, next) {
  try {
    const userId = req.user?.id || req.user?._id;
    const { orderId, amount } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!orderId) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const result = await paymentService.createRefund({ orderId, userId, amount });

    res.json(result);

  } catch (err) {
    console.error('Refund error:', err);
    next(err);
  }
}

/**
 * Get Stripe publishable key
 * GET /api/v1/payment/config
 */
export async function getConfig(req, res) {
  res.json({
    publishableKey: paymentService.getPublishableKey(),
  });
}

export default {
  createCheckoutSession,
  verifyPayment,
  createRefund,
  getConfig,
};
