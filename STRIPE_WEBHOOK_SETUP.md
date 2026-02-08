# Stripe Webhook Setup Guide

## ✅ Complete Stripe Integration

Your e-commerce app now has a complete Stripe payment integration with:
- **Payment Controller** → Creates Stripe checkout sessions
- **Webhook Handler** → Processes payment confirmations
- **Order Management** → Updates order status automatically

## 🔧 Configuration Steps

### 1. Environment Variables

Add these to your `.env` file:

```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...           # From Stripe Dashboard
STRIPE_WEBHOOK_SECRET=whsec_...         # From Webhook setup (see step 2)

# MongoDB
MONGO_URI=mongodb://localhost:27017/ecommerce

# Frontend URL (for redirects)
FRONTEND_URL=http://localhost:3000      # Your React app URL
```

For **Vercel deployment**, add the same variables in:
- Vercel Dashboard → Your Project → Settings → Environment Variables

### 2. Get Your Webhook Secret

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click **"Add endpoint"**
3. Enter your webhook URL:
   ```
   # Local testing
   http://localhost:4000/api/stripe-webhook
   
   # Production (Vercel)
   https://your-app.vercel.app/api/stripe-webhook
   ```
4. Select events to listen for:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
5. Click **"Add endpoint"**
6. Click **"Reveal"** under "Signing secret" and copy the value (starts with `whsec_`)
7. Add it to your `.env` as `STRIPE_WEBHOOK_SECRET`

## � Payment Flow

### Frontend Integration

```javascript
// 1. User clicks "Checkout" button
const response = await fetch('/api/v1/payment/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`,
  },
  body: JSON.stringify({
    metadata: {
      // Optional: shipping address, coupon code, etc.
      shippingAddress: '123 Main St',
    },
  }),
});

const { url, orderId } = await response.json();

// 2. Redirect to Stripe Checkout
window.location.href = url;

// 3. After payment, user is redirected to:
// Success: https://yoursite.com/order/success?session_id=cs_xxx
// Cancel:  https://yoursite.com/cart

// 4. Verify payment status (on success page)
const verifyResponse = await fetch(`/api/v1/payment/verify/${sessionId}`, {
  headers: {
    'Authorization': `Bearer ${userToken}`,
  },
});

const { paymentStatus, order } = await verifyResponse.json();
```

## 🔌 API Endpoints

### 1. Create Checkout Session

**POST** `/api/v1/payment/create-checkout-session`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "metadata": {
    "shippingAddress": "Optional address",
    "couponCode": "Optional code"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "orderId": "65f..."
}
```

### 2. Verify Payment

**GET** `/api/v1/payment/verify/:sessionId`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "paymentStatus": "paid",
  "orderStatus": "processing",
  "order": { /* order object */ }
}
```

## 📝 Important Notes

### Automatic Order Creation

The checkout flow automatically:
1. ✅ Validates cart items
2. ✅ Creates an order with `payment.status = 'pending'`
3. ✅ Decrements product stock
4. ✅ Clears the cart
5. ✅ Creates Stripe checkout session with `orderId` in metadata
6. ✅ Returns checkout URL to redirect user

### Webhook Updates Order

When payment succeeds, the webhook:
1. ✅ Verifies Stripe signature
2. ✅ Extracts `orderId` from session metadata
3. ✅ Updates order:
   - `payment.status` → `'paid'`
   - `payment.transactionId` → Stripe payment intent ID
   - `status` → `'processing'`

### Webhook Events Handled

| Event | Action |
|-------|--------|
| `checkout.session.completed` | ✅ Marks order as **paid** and **processing** |
| `payment_intent.payment_failed` | ❌ Marks payment as **failed** |
| `charge.refunded` | 💰 Marks order as **refunded** |

## 🧪 Testing Locally

### Option 1: Stripe CLI (Recommended)

```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to your local server
stripe listen --forward-to http://localhost:4000/api/stripe-webhook

# Copy the webhook signing secret (whsec_...) it displays
# Add it to your .env file as STRIPE_WEBHOOK_SECRET
```

In another terminal:
```bash
npm run dev
```

Now test payments with Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`

### Option 2: Ngrok (Alternative)

```bash
# Start your server
npm run dev

# In another terminal, expose it
ngrok http 4000

# Use the ngrok URL in Stripe webhook settings:
# https://abc123.ngrok.io/api/stripe-webhook
```

## 🚀 Deployment to Vercel

### 1. Deploy your app

```bash
vercel --prod
```

### 2. Add environment variables in Vercel

Go to: **Vercel Dashboard → Project → Settings → Environment Variables**

Add:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `MONGO_URI`
- `FRONTEND_URL`
- `JWT_SECRET`

### 3. Update Stripe webhook URL

In Stripe Dashboard → Webhooks:
```
https://your-app.vercel.app/api/stripe-webhook
```

## 🔍 Troubleshooting

### ❌ "No signatures found matching the expected signature"
**Cause:** Wrong `STRIPE_WEBHOOK_SECRET` or body parser enabled

**Fix:**
- Make sure webhook secret is correct
- The `/api/stripe-webhook.js` has `bodyParser: false` in config ✅

### ❌ "Missing orderId in metadata"
**Cause:** Checkout session doesn't have `orderId`

**Fix:**
- Use the `/api/v1/payment/create-checkout-session` endpoint ✅
- It automatically adds `orderId` to metadata

### ❌ "Order not found"
**Cause:** The `orderId` doesn't exist or database connection failed

**Fix:**
- Check MongoDB connection
- Verify order was created before checkout session

### ℹ️ Webhook not triggering locally
**Cause:** Stripe can't reach localhost

**Fix:**
- Use Stripe CLI: `stripe listen --forward-to http://localhost:4000/api/stripe-webhook`
- Or use ngrok to expose your local server

## 📁 File Structure

```
/
├── api/
│   └── stripe-webhook.js         ← Vercel Serverless Function (webhook)
├── src/
│   ├── controllers/
│   │   └── PaymentController.js  ← Creates checkout sessions
│   ├── routes/v1/
│   │   └── paymentRoute.js       ← Payment API routes
│   ├── models/
│   │   └── order.js              ← Order model
│   └── services/
│       └── cartService.js        ← Checkout logic
└── .env.example                   ← Environment variables template
```

## 🎯 Key Points

1. **Separate webhook from Express:** The webhook runs as a Vercel Serverless Function in `/api/stripe-webhook.js`, not as an Express route. This is because Vercel deploys each file in `/api` as an independent serverless function.

2. **Body parser disabled:** The webhook needs raw request body for signature verification, so `bodyParser: false` in the config.

3. **Automatic metadata:** The `PaymentController.createCheckoutSession` automatically adds `orderId` to Stripe session metadata. You don't need to manually handle this.

4. **Order creation happens first:** The checkout flow creates the order BEFORE redirecting to Stripe. The webhook then updates the order status when payment succeeds.

5. **Stock deduction:** Stock is decremented immediately during checkout (before payment), not after webhook. If payment fails, you may want to add logic to restore stock.

## 📚 Next Steps

- [ ] Test payment flow end-to-end
- [ ] Add error handling for failed payments
- [ ] Implement refund logic
- [ ] Add email notifications on successful payment
- [ ] Implement stock restoration for failed payments
- [ ] Add payment retry logic
- [ ] Set up production webhook endpoint

---

**Need help?** Check the [Stripe Documentation](https://stripe.com/docs/payments/checkout) or [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)

