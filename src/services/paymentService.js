import Stripe from 'stripe';
import Order from '../models/order.js';
import Product from '../models/product.js';

// Initialize Stripe with API key validation
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('⚠️ STRIPE_SECRET_KEY is not configured. Payment features will not work.');
  console.error('Please add STRIPE_SECRET_KEY to your environment variables.');
}

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Create Stripe checkout session with order
 */
export async function createCheckoutSession({ userId, cart, metadata = {} }) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.');
  }
  
  if (!cart || !cart.items || cart.items.length === 0) {
    throw new Error('Cart is empty');
  }
  
  try {
    // Validate cart items and prepare line items
    const lineItems = [];
    
    for (const item of cart.items) {
      // Get product ID (handle both populated and non-populated)
      const productId = item.product?._id || item.product;
      const product = await Product.findById(productId);
      
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Check stock availability
      if (typeof product.stock === 'number' && product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.title || product.name}`);
      }

      lineItems.push({
        price_data: {
          currency: process.env.STRIPE_CURRENCY || 'usd',
          product_data: {
            name: item.title || product.title || product.name || 'Product',
            description: item.selectedOptions 
              ? `Options: ${JSON.stringify(item.selectedOptions)}` 
              : undefined,
            images: product.images?.length 
              ? [product.images[0]] 
              : undefined,
          },
          unit_amount: Math.round(item.price * 100), // Convert to cents
        },
        quantity: item.quantity,
      });
    }

    // Calculate total
    const subTotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Create pending order
    const order = await Order.create({
      user: userId,
      items: cart.items.map(item => ({
        product: item.product._id || item.product,
        quantity: item.quantity,
        price: item.price,
        title: item.title,
        selectedOptions: item.selectedOptions || {},
      })),
      subTotal,
      metadata,
      payment: {
        status: 'pending',
        gateway: 'stripe',
      },
      status: 'created',
    });

    // Create Stripe checkout session
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${frontendUrl}/order/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order._id}`,
      cancel_url: `${frontendUrl}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
      },
      customer_email: metadata.email || undefined,
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // Expire in 30 minutes
    });

    // Update order with session ID
    await Order.findByIdAndUpdate(order._id, {
      'payment.transactionId': session.id,
    });

    return {
      sessionId: session.id,
      url: session.url,
      orderId: order._id,
    };
  } catch (error) {
    console.error('Checkout session creation error:', error);
    // Re-throw with more context
    const errorMessage = error.message || 'Unknown error';
    throw new Error(`Checkout session creation failed: ${errorMessage}`);
  }
}

/**
 * Verify payment session and get order status
 */
export async function verifySession({ sessionId, userId }) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.');
  }
  
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      throw new Error('Session not found');
    }

    const orderId = session.metadata?.orderId;

    if (!orderId) {
      throw new Error('Invalid session: missing orderId');
    }

    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify user owns this order
    if (order.user.toString() !== userId.toString()) {
      throw new Error('Unauthorized access to order');
    }

    return {
      paymentStatus: session.payment_status,
      sessionStatus: session.status,
      order,
    };
  } catch (error) {
    throw new Error(`Payment verification failed: ${error.message}`);
  }
}

/**
 * Handle successful payment (called by webhook)
 */
export async function handleSuccessfulPayment({ session }) {
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    throw new Error('No orderId in session metadata');
  }

  // Update order to paid and process it
  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      'payment.status': 'paid',
      'payment.gateway': 'stripe',
      'payment.transactionId': session.payment_intent,
      'payment.raw': session,
      status: 'processing',
    },
    { new: true }
  ).populate('items.product');

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  // Deduct stock for each item
  for (const item of order.items) {
    if (item.product && typeof item.product.stock === 'number') {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: -item.quantity } }
      );
    }
  }

  return order;
}

/**
 * Handle failed payment (called by webhook)
 */
export async function handleFailedPayment({ paymentIntent }) {
  const orderId = paymentIntent.metadata?.orderId;

  if (!orderId) {
    return null;
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      'payment.status': 'failed',
      'payment.raw': paymentIntent,
      status: 'cancelled',
    },
    { new: true }
  );

  return order;
}

/**
 * Handle refund (called by webhook)
 */
export async function handleRefund({ charge }) {
  const paymentIntent = charge.payment_intent;

  // Find order by payment intent ID
  const order = await Order.findOne({
    'payment.transactionId': paymentIntent,
  }).populate('items.product');

  if (!order) {
    return null;
  }

  // Restore stock
  for (const item of order.items) {
    if (item.product && typeof item.product.stock === 'number') {
      await Product.findByIdAndUpdate(
        item.product._id,
        { $inc: { stock: item.quantity } }
      );
    }
  }

  // Update order
  await Order.findByIdAndUpdate(order._id, {
    'payment.status': 'refunded',
    status: 'refunded',
    'payment.raw': charge,
  });

  return order;
}

/**
 * Create refund for an order
 */
export async function createRefund({ orderId, userId, amount = null }) {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to environment variables.');
  }
  
  try {
    const order = await Order.findById(orderId).populate('items.product');

    if (!order) {
      throw new Error('Order not found');
    }

    // Verify user owns this order (unless admin - add admin check if needed)
    if (order.user.toString() !== userId.toString()) {
      throw new Error('Unauthorized access to order');
    }

    if (order.payment.status !== 'paid') {
      throw new Error('Can only refund paid orders');
    }

    if (!order.payment.transactionId) {
      throw new Error('No payment transaction found');
    }

    // Create refund in Stripe
    const refundData = {
      payment_intent: order.payment.transactionId,
    };

    if (amount) {
      refundData.amount = Math.round(amount * 100); // Partial refund
    }

    const refund = await stripe.refunds.create(refundData);

    // Update order
    await Order.findByIdAndUpdate(orderId, {
      'payment.status': 'refunded',
      status: 'refunded',
    });

    // Restore stock
    for (const item of order.items) {
      if (item.product && typeof item.product.stock === 'number') {
        await Product.findByIdAndUpdate(
          item.product._id,
          { $inc: { stock: item.quantity } }
        );
      }
    }

    return {
      success: true,
      refundId: refund.id,
      orderId: order._id,
    };
  } catch (error) {
    throw new Error(`Refund failed: ${error.message}`);
  }
}

/**
 * Get Stripe publishable key
 */
export function getPublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY;
}

export default {
  createCheckoutSession,
  verifySession,
  handleSuccessfulPayment,
  handleFailedPayment,
  handleRefund,
  createRefund,
  getPublishableKey,
};
