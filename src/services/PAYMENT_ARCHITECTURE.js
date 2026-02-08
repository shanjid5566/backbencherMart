/**
 * STRIPE PAYMENT INTEGRATION - ARCHITECTURE OVERVIEW
 * 
 * This file documents the complete Stripe integration following your project's naming conventions.
 */

// ============================================================================
// FILE STRUCTURE
// ============================================================================

/*
src/
├── controllers/
│   └── PaymentController.js          ✅ HTTP request/response handling
├── services/
│   └── paymentService.js             ✅ Stripe SDK & business logic
├── routes/v1/
│   └── paymentRoute.js               ✅ API route definitions
├── models/
│   └── order.js                      ✅ Order schema (already existed)
│   └── cart.js                       ✅ Cart schema (already existed)
api/
└── stripe-webhook.js                 ✅ Vercel serverless webhook handler
*/

// ============================================================================
// PAYMENT FLOW DIAGRAM
// ============================================================================

/*
1. USER CHECKOUT
   ↓
   POST /api/v1/payment/create-checkout-session
   → PaymentController.createCheckoutSession()
   → paymentService.createCheckoutSession()
   → Creates pending Order
   → Creates Stripe Checkout Session
   → Returns checkout URL

2. STRIPE CHECKOUT
   ↓
   User redirected to Stripe-hosted page
   → Enters payment details
   → Stripe processes payment

3. WEBHOOK (on success)
   ↓
   POST /api/stripe-webhook
   → stripe-webhook.js handler
   → Verifies signature
   → paymentService.handleSuccessfulPayment()
   → Updates Order: status="processing", payment.status="paid"
   → Deducts stock from products

4. USER REDIRECT
   ↓
   Stripe redirects to: /order/success?session_id=cs_xxx
   → Frontend calls: GET /api/v1/payment/verify/:sessionId
   → Returns order details and payment status
*/

// ============================================================================
// API ENDPOINTS
// ============================================================================

/*
PUBLIC ENDPOINTS:
  GET  /api/v1/payment/config
  → Get Stripe publishable key for frontend

PROTECTED ENDPOINTS (Require JWT):
  POST /api/v1/payment/create-checkout-session
  → Create Stripe checkout session
  → Body: { metadata: { email, shippingAddress, ... } }
  
  GET  /api/v1/payment/verify/:sessionId
  → Verify payment status after redirect
  
  POST /api/v1/payment/refund
  → Create full or partial refund
  → Body: { orderId, amount? }

WEBHOOK ENDPOINT (Stripe signature verified):
  POST /api/stripe-webhook
  → Handles: checkout.session.completed
  → Handles: payment_intent.payment_failed
  → Handles: charge.refunded
*/

// ============================================================================
// SERVICE LAYER FUNCTIONS (paymentService.js)
// ============================================================================

/*
createCheckoutSession({ userId, cart, metadata })
  → Validates cart items
  → Checks stock availability
  → Creates pending Order
  → Creates Stripe Checkout Session
  → Returns { sessionId, url, orderId }

verifySession({ sessionId, userId })
  → Retrieves Stripe session
  → Verifies user owns order
  → Returns { paymentStatus, sessionStatus, order }

handleSuccessfulPayment({ session })
  → Called by webhook
  → Updates order to "paid" and "processing"
  → Deducts stock from products

handleFailedPayment({ paymentIntent })
  → Called by webhook
  → Updates order to "failed" and "cancelled"

handleRefund({ charge })
  → Called by webhook
  → Updates order to "refunded"
  → Restores stock

createRefund({ orderId, userId, amount? })
  → Creates Stripe refund
  → Full or partial refund
  → Restores stock
  → Returns { success, refundId, orderId }

getPublishableKey()
  → Returns Stripe publishable key for frontend
*/

// ============================================================================
// ORDER STATUS FLOW
// ============================================================================

/*
ORDER.STATUS:
  created     → Order created, payment pending
  processing  → Payment successful, order being processed
  completed   → Order fulfilled
  cancelled   → Payment failed or order cancelled
  refunded    → Payment refunded

ORDER.PAYMENT.STATUS:
  pending     → Awaiting payment
  paid        → Payment successful
  failed      → Payment failed
  refunded    → Payment refunded
*/

// ============================================================================
// ENVIRONMENT VARIABLES REQUIRED
// ============================================================================

/*
STRIPE_SECRET_KEY          → sk_test_... or sk_live_...
STRIPE_PUBLISHABLE_KEY     → pk_test_... or pk_live_...
STRIPE_WEBHOOK_SECRET      → whsec_... (from webhook settings)
STRIPE_CURRENCY            → usd, eur, gbp, etc. (default: usd)
FRONTEND_URL               → http://localhost:3000 (for redirects)
MONGO_URI                  → MongoDB connection string
JWT_SECRET                 → For authentication
*/

// ============================================================================
// SECURITY FEATURES
// ============================================================================

/*
✅ Webhook signature verification - Ensures webhooks are authentic
✅ JWT authentication - All endpoints require valid token
✅ User authorization - Users can only access their own orders
✅ Server-side price validation - Prevents price manipulation
✅ Stock validation - Prevents overselling
✅ Idempotent operations - Safe to retry webhooks
✅ PCI compliance - No card data touches your server
*/

// ============================================================================
// NAMING CONVENTIONS USED
// ============================================================================

/*
Controllers:  PascalCase  → PaymentController.js
Services:     camelCase   → paymentService.js
Routes:       camelCase   → paymentRoute.js
Functions:    camelCase   → createCheckoutSession()
Constants:    UPPER_CASE  → STRIPE_SECRET_KEY
*/

// ============================================================================
// INTEGRATION WITH EXISTING CODE
// ============================================================================

/*
✅ Uses existing Cart model from cart.js
✅ Uses existing Order model from order.js
✅ Uses existing authMiddleware for JWT verification
✅ Follows existing route structure (/api/v1/...)
✅ Compatible with existing cart operations
✅ Does not conflict with legacy checkout endpoint
*/

// ============================================================================
// DEPENDENCIES
// ============================================================================

/*
npm packages required:
  - stripe (✅ installed)
  - express (✅ already exists)
  - express-validator (✅ already exists)
  - jsonwebtoken (✅ already exists)
  - mongoose (✅ already exists)
*/

// ============================================================================
// DEPLOYMENT (Vercel)
// ============================================================================

/*
vercel.json configuration:
  ✅ Main app: /src/index.js
  ✅ Webhook: /api/stripe-webhook.js (serverless function)
  
Routes:
  /api/stripe-webhook → api/stripe-webhook.js (priority route)
  /* → src/index.js (catch-all)
  
After deployment:
  1. Get production URL
  2. Configure webhook in Stripe Dashboard
  3. Add webhook URL: https://yourdomain.com/api/stripe-webhook
  4. Copy webhook signing secret to .env
*/

// ============================================================================
// TESTING
// ============================================================================

/*
Test Cards (Stripe Test Mode):
  Success:      4242 4242 4242 4242
  Decline:      4000 0000 0000 0002
  Auth Req:     4000 0025 0000 3155
  
  Use: Any future expiry, any CVC, any ZIP

Local Webhook Testing:
  $ stripe listen --forward-to localhost:4000/api/stripe-webhook
  $ stripe trigger checkout.session.completed
*/

// ============================================================================
// NEXT STEPS
// ============================================================================

/*
1. ✅ Add Stripe API keys to .env
2. ✅ Test locally with Stripe CLI
3. ✅ Deploy to Vercel
4. ✅ Configure webhook in Stripe Dashboard
5. ⬜ Add email notifications for orders
6. ⬜ Add order tracking system
7. ⬜ Add admin dashboard for order management
8. ⬜ Switch to live mode when ready
*/

export default {
  documentation: 'See STRIPE_SETUP.md for detailed docs',
  quickStart: 'See QUICKSTART.md for quick testing guide',
  testRequests: 'See test-stripe.http for API examples',
};
