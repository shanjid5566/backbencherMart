# Stripe Payment Integration Setup Guide

## ✅ Implementation Complete

Your Stripe payment integration is now fully implemented with the following structure:

```
src/
├── controllers/
│   └── PaymentController.js      # Handles HTTP requests/responses
├── services/
│   └── paymentService.js         # Stripe business logic & API calls
├── routes/v1/
│   └── paymentRoute.js           # Payment API endpoints
api/
└── stripe-webhook.js             # Vercel serverless webhook handler
```

---

## 📋 Setup Steps

### 1. Get Stripe API Keys

1. Sign up/login at [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. Go to **Developers → API keys**
3. Copy your keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### 2. Configure Environment Variables

Add to your `.env` file:

```env
# Stripe Payment
STRIPE_SECRET_KEY=sk_test_your_actual_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_CURRENCY=usd

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### 3. Set Up Webhook (After Deployment)

1. Deploy your app to Vercel
2. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
3. Click **Add endpoint**
4. Enter your webhook URL: `https://yourdomain.com/api/stripe-webhook`
5. Select events to listen to:
   - ✅ `checkout.session.completed`
   - ✅ `payment_intent.payment_failed`
   - ✅ `charge.refunded`
6. Copy the **Signing secret** (starts with `whsec_`) and add to `.env`

---

## 🚀 API Endpoints

### 1. Get Stripe Config (Public)
```http
GET /api/v1/payment/config
```

**Response:**
```json
{
  "publishableKey": "pk_test_..."
}
```

---

### 2. Create Checkout Session (Protected)
```http
POST /api/v1/payment/create-checkout-session
Authorization: Bearer <token>
Content-Type: application/json

{
  "metadata": {
    "email": "customer@example.com",
    "shippingAddress": "123 Main St"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "orderId": "65f123..."
}
```

**What it does:**
1. Validates user's cart
2. Creates pending order in database
3. Creates Stripe checkout session
4. Clears user's cart
5. Returns URL to redirect user to Stripe checkout

---

### 3. Verify Payment (Protected)
```http
GET /api/v1/payment/verify/:sessionId
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "paymentStatus": "paid",
  "sessionStatus": "complete",
  "order": { /* order object */ }
}
```

---

### 4. Create Refund (Protected)
```http
POST /api/v1/payment/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "65f123...",
  "amount": 50.00  // Optional: partial refund
}
```

**Response:**
```json
{
  "success": true,
  "refundId": "re_...",
  "orderId": "65f123..."
}
```

---

## 🎨 Frontend Integration

### Step 1: Load Stripe.js
```html
<!-- Add to your HTML head -->
<script src="https://js.stripe.com/v3/"></script>
```

### Step 2: Checkout Flow

```javascript
// 1. Get Stripe publishable key
const configRes = await fetch('/api/v1/payment/config');
const { publishableKey } = await configRes.json();
const stripe = Stripe(publishableKey);

// 2. Create checkout session
const response = await fetch('/api/v1/payment/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    metadata: {
      email: 'customer@example.com',
      shippingAddress: '123 Main St'
    }
  })
});

const { url, sessionId, orderId } = await response.json();

// 3. Redirect to Stripe Checkout
window.location.href = url;
```

### Step 3: Handle Success Page

```javascript
// On your success page (/order/success)
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');
const orderId = urlParams.get('order_id');

// Verify payment
const verifyRes = await fetch(`/api/v1/payment/verify/${sessionId}`, {
  headers: {
    'Authorization': `Bearer ${userToken}`
  }
});

const { order, paymentStatus } = await verifyRes.json();

if (paymentStatus === 'paid') {
  // Show success message
  console.log('Order confirmed!', order);
}
```

---

## 🔄 Payment Flow

1. **User adds items to cart** → Standard cart operations
2. **User clicks "Checkout"** → `POST /api/v1/payment/create-checkout-session`
3. **Backend creates:**
   - Pending order in database
   - Stripe checkout session
   - Clears cart
4. **User redirected to Stripe** → Enters payment details
5. **Stripe processes payment** → Sends webhook to `/api/stripe-webhook`
6. **Webhook handler:**
   - Verifies signature
   - Updates order status to "paid"
   - Deducts stock
7. **User redirected back** → `success_url` with session_id
8. **Frontend verifies** → `GET /api/v1/payment/verify/:sessionId`

---

## 🔒 Security Features

✅ **Webhook signature verification** - Ensures webhooks are from Stripe
✅ **User authentication** - All endpoints require valid JWT
✅ **Order ownership check** - Users can only access their own orders
✅ **Stock validation** - Prevents overselling
✅ **Price recalculation** - Uses server-side prices, not client prices
✅ **Idempotent operations** - Webhook handlers are safe to retry

---

## 🧪 Testing

### Test in Development (Stripe Test Mode)

1. Use test card numbers:
   - **Success:** `4242 4242 4242 4242`
   - **Decline:** `4000 0000 0000 0002`
   - **Requires Auth:** `4000 0025 0000 3155`
   
2. Any future expiry date, any CVC, any ZIP

3. Test webhook locally using Stripe CLI:
```bash
# Install Stripe CLI
# https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:4000/api/stripe-webhook
```

---

## 📊 Order Status Flow

```
created → processing → completed
   ↓
cancelled (if payment fails)
   ↓
refunded (if refund issued)
```

### Payment Status:
- `pending` - Order created, awaiting payment
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

---

## 🐛 Troubleshooting

### Webhook not receiving events?
- Check webhook signature secret is correct
- Verify endpoint URL is accessible
- Check Stripe dashboard logs

### Payment not updating order?
- Check webhook is configured with correct events
- Check database connection in webhook handler
- Check `orderId` is in session metadata

### "Cart is empty" error?
- User must add items to cart first
- Cart must belong to authenticated user

---

## 📝 Environment Variables Checklist

- [ ] `STRIPE_SECRET_KEY` - From Stripe Dashboard
- [ ] `STRIPE_PUBLISHABLE_KEY` - From Stripe Dashboard  
- [ ] `STRIPE_WEBHOOK_SECRET` - From Webhook settings
- [ ] `STRIPE_CURRENCY` - Default: `usd`
- [ ] `FRONTEND_URL` - Your frontend domain
- [ ] `MONGO_URI` - MongoDB connection string
- [ ] `JWT_SECRET` - For authentication

---

## 🎯 Next Steps

1. Add your Stripe keys to `.env`
2. Test checkout flow locally
3. Deploy to Vercel
4. Configure webhook in Stripe Dashboard
5. Test with real test cards
6. Switch to live mode when ready

---

## 💡 Tips

- Always use test mode until you're ready for production
- Monitor webhook events in Stripe Dashboard
- Set up email notifications for successful orders
- Consider adding shipping address validation
- Add order confirmation emails
- Implement inventory management

---

For more information, visit [Stripe Documentation](https://stripe.com/docs)
