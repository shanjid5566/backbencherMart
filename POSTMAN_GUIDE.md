# 📮 Postman Collection - Quick Start Guide

## Import the Collection

### Step 1: Open Postman
Download from [postman.com](https://www.postman.com/downloads/) if you don't have it

### Step 2: Import Collection
1. Click **Import** button (top left)
2. Drag and drop: `E-Commerce-API-Collection.postman_collection.json`
3. Or click **Choose Files** and select the file
4. Click **Import**

---

## ⚙️ Configure Variables

### Update Base URL
1. Click on the collection name: **E-Commerce App - Complete API Collection**
2. Go to **Variables** tab
3. Update `baseUrl`:
   - **Local:** `http://localhost:4000`
   - **Production:** `https://your-app.vercel.app`

---

## 🚀 Quick Test Flow

### 1. Register/Login
```
POST /api/v1/auth/login
```
- Email: `john@example.com`
- Password: `Password123!`
- ✅ Token will auto-save to `{{authToken}}`

### 2. Get Products
```
GET /api/products
```
- No auth required
- Copy a product ID for next step

### 3. Add to Cart
```
POST /api/cart/items
```
- Replace `productId` with actual product ID
- Requires auth (automatic)

### 4. Get Cart
```
GET /api/cart
```
- View your cart items

### 5. Create Checkout
```
POST /api/v1/payment/create-checkout-session
```
- Returns Stripe checkout URL
- Copy the `url` and open in browser

### 6. Verify Payment
```
GET /api/v1/payment/verify/:sessionId
```
- Replace `:sessionId` with session ID from checkout

---

## 📋 Collection Structure

### 🔐 Authentication (2 requests)
- ✅ Register User
- ✅ Login User (auto-saves token)

### 🛍️ Products (5 requests)
- Get All Products (public)
- Get Product by ID (public)
- Create Product (admin)
- Update Product (admin)
- Delete Product (admin)

### 🛒 Cart (5 requests)
- Get Cart
- Add Item to Cart
- Update Item Quantity
- Remove Item
- Merge Cart

### 💳 Payment - Stripe (5 requests)
- Get Stripe Config (public)
- Create Checkout Session
- Verify Payment
- Create Full Refund
- Create Partial Refund

### ❓ FAQ (4 requests)
- Get All FAQs (public)
- Create FAQ (admin)
- Update FAQ (admin)
- Delete FAQ (admin)

---

## 🔑 Variables Explained

### Collection Variables

**`baseUrl`**
- Default: `http://localhost:4000`
- Change to your deployed URL for testing production

**`authToken`**
- Auto-populated after login
- Used for all authenticated requests
- Manually set if needed

---

## 💡 Features

### ✅ Auto Token Management
Login request automatically saves token to variable

### ✅ Pre-filled Examples
All requests have example data ready to test

### ✅ Test Scripts
Checkout session logs important info to console

### ✅ Descriptions
Each request has clear description of what it does

---

## 🧪 Test Card Numbers (Stripe)

For payment testing, use these test cards:

**Successful Payment:**
```
Card: 4242 4242 4242 4242
Expiry: 12/34
CVC: 123
ZIP: Any
```

**Payment Declined:**
```
Card: 4000 0000 0000 0002
```

**Requires Authentication:**
```
Card: 4000 0025 0000 3155
```

---

## 🎯 Test Workflow Example

### Complete Purchase Flow:

1. **Login**
   ```
   POST /api/v1/auth/login
   ```

2. **Browse Products**
   ```
   GET /api/products
   ```

3. **Add to Cart**
   ```
   POST /api/cart/items
   Body: { "productId": "...", "quantity": 2 }
   ```

4. **View Cart**
   ```
   GET /api/cart
   ```

5. **Checkout**
   ```
   POST /api/v1/payment/create-checkout-session
   ```

6. **Open Stripe URL** (from response)
   - Complete payment with test card

7. **Verify**
   ```
   GET /api/v1/payment/verify/:sessionId
   ```

---

## 🔧 Tips

### View Response
- Click **Body** tab after sending request
- Use **Pretty** view for formatted JSON

### Save Requests
- Make changes and click **Save**
- Create new requests with **Add Request**

### Environment Variables
For multiple environments:
1. Create Environment (Development, Staging, Production)
2. Add `baseUrl` to each
3. Switch between environments easily

### Share Collection
Export and share with team:
- Right-click collection → Export
- Share `.json` file

---

## 📝 Common Request Bodies

### Login
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### Add to Cart
```json
{
  "productId": "65f1234567890abcdef12345",
  "quantity": 2
}
```

### Checkout
```json
{
  "metadata": {
    "email": "customer@example.com",
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "US"
    },
    "phone": "+1 555-123-4567"
  }
}
```

---

## 🐛 Troubleshooting

### "Unauthorized" Error
- Make sure you logged in first
- Check if token is saved in Variables
- Manually copy token if needed

### "Product not found"
- Get actual product ID from GET /api/products
- Replace placeholder IDs in requests

### "Cart is empty"
- Add items to cart first
- Check if items were added successfully

### Connection Error
- Verify `baseUrl` is correct
- Make sure backend server is running
- Check if port matches (default: 4000)

---

## 📚 Next Steps

1. ✅ Import collection to Postman
2. ✅ Update `baseUrl` variable
3. ✅ Test login endpoint
4. ✅ Try complete purchase flow
5. ✅ Test payment with Stripe test cards
6. ✅ Explore other endpoints

---

## 🎉 You're Ready!

Your Postman collection is ready to test all API endpoints. Happy testing! 🚀
