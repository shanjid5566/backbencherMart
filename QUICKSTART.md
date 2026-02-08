# 🚀 Quick Start - Stripe Payment Integration

## Files Created/Updated

✅ **src/services/paymentService.js** - NEW - Stripe business logic
✅ **src/controllers/PaymentController.js** - UPDATED - Payment endpoints
✅ **src/routes/v1/paymentRoute.js** - UPDATED - Payment routes
✅ **api/stripe-webhook.js** - UPDATED - Webhook handler
✅ **vercel.json** - UPDATED - Vercel config for webhooks
✅ **.env.example** - UPDATED - Added Stripe variables

## Naming Conventions Followed

✅ Controllers: `PaymentController.js` (PascalCase)
✅ Services: `paymentService.js` (camelCase)
✅ Routes: `paymentRoute.js` (camelCase)

## 🎯 Quick Test (5 minutes)

### 1. Add Stripe keys to .env

```bash
# Copy example and add your keys
cp .env.example .env

# Edit .env and add:
STRIPE_SECRET_KEY=sk_test_51xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx  # Get this after webhook setup
STRIPE_CURRENCY=usd
```

### 2. Start server

```bash
npm run dev
```

### 3. Test the flow

#### A. Login and get token
```bash
POST http://localhost:4000/api/v1/auth/login
```

#### B. Add items to cart
```bash
POST http://localhost:4000/api/cart/items
Authorization: Bearer YOUR_TOKEN
{
  "productId": "65f...",
  "quantity": 2
}
```

#### C. Create Stripe checkout
```bash
POST http://localhost:4000/api/v1/payment/create-checkout-session
Authorization: Bearer YOUR_TOKEN
{
  "metadata": {
    "email": "test@example.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/c/pay/...",
  "orderId": "65f..."
}
```

#### D. Open the URL in browser
- Visit the `url` from response
- Use test card: `4242 4242 4242 4242`
- Any future expiry, any CVC

#### E. Get redirected to success page
- After payment, Stripe redirects to: `http://localhost:3000/order/success?session_id=cs_test_...`

#### F. Verify payment
```bash
GET http://localhost:4000/api/v1/payment/verify/cs_test_...
Authorization: Bearer YOUR_TOKEN
```

## 📦 What Happens During Checkout

1. ✅ **Validates cart** - Ensures items exist and in stock
2. ✅ **Creates pending order** - Order saved with status "created"
3. ✅ **Creates Stripe session** - Generates checkout URL
4. ✅ **Clears cart** - User's cart is emptied
5. ✅ **User pays** - Redirected to Stripe checkout
6. ✅ **Webhook triggered** - `checkout.session.completed` event
7. ✅ **Order updated** - Status → "processing", payment → "paid"
8. ✅ **Stock deducted** - Inventory updated
9. ✅ **User redirected** - Back to your success page

## 🔧 Important Notes

### Two Checkout Options

**Option 1: Stripe Checkout (NEW)**
```
POST /api/v1/payment/create-checkout-session
```
- ✅ Uses Stripe hosted checkout page
- ✅ PCI compliant (no card handling on your server)
- ✅ Stock deducted only after successful payment
- ✅ Handles webhooks for payment confirmation
- **USE THIS FOR STRIPE PAYMENTS**

**Option 2: Cart Checkout (OLD)**
```
POST /api/cart/checkout
```
- ⚠️ Creates order immediately
- ⚠️ Deducts stock immediately
- ⚠️ No payment integration
- **Use for other payment gateways or COD**

### Stock Management

- Stock is checked during checkout session creation
- Stock is NOT deducted until payment succeeds
- If payment fails, stock remains unchanged
- Refunds automatically restore stock

## 🐛 Common Issues

### "Cart is empty"
- Make sure user has items in cart
- Cart must belong to authenticated user

### Webhook not working locally
- Use Stripe CLI to forward webhooks:
  ```bash
  stripe listen --forward-to localhost:4000/api/stripe-webhook
  ```

### "Authentication required"
- All endpoints require valid JWT token
- Get token from login endpoint first

### Order created but payment status still "pending"
- Check webhook is configured correctly
- Check webhook secret in .env
- Check Stripe dashboard for webhook delivery attempts

## 📚 Full Documentation

See `STRIPE_SETUP.md` for complete documentation.

## ✅ Ready for Production

Before going live:
- [ ] Switch to live Stripe keys (starts with `sk_live_`)
- [ ] Update webhook URL to production domain
- [ ] Test with real cards in test mode first
- [ ] Set up webhook monitoring
- [ ] Add error logging (Sentry, etc.)
- [ ] Add email notifications for orders
- [ ] Set up order tracking system
