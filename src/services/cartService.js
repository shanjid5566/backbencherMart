import mongoose from 'mongoose';
import Cart from '../models/cart.js';
import Product from '../models/product.js';
import Order from '../models/order.js';

// Create or return a cart for an authenticated user
export async function createOrGetCart({ userId }) {
  if (!userId) throw new Error('Authentication required');

  let cart = await Cart.findOne({ user: userId });
  if (!cart) {
    cart = new Cart({ user: userId });
    // ensure no guest TTL on authenticated carts
    if (typeof cart.setGuestTTL === 'function') cart.setGuestTTL(null);
    await cart.save();
  }
  return cart;
}

// Add item to cart (matched by product + selectedOptions)
export async function addItem({ userId, productId, quantity = 1, selectedOptions = {} }) {
  if (!userId) throw new Error('Authentication required');
  const cart = await createOrGetCart({ userId });
  const product = await Product.findById(productId).lean();
  if (!product) throw new Error('Product not found');

  const existing = cart.items.find(
    it =>
      it.product.toString() === productId &&
      JSON.stringify(it.selectedOptions || {}) ===
        JSON.stringify(selectedOptions || {})
  );

  if (existing) {
    existing.quantity = Math.max(1, existing.quantity + quantity);
  } else {
    cart.items.push({
      product: product._id,
      quantity,
      price: product.price,
      title: product.title || product.name,
      thumbnail: product.thumbnail || product.images?.[0],
      selectedOptions,
    });
  }

  await cart.save();
  return cart;
}

// Update quantity of a cart item
export async function updateItemQty({ userId, itemId, quantity }) {
  if (!userId) throw new Error('Authentication required');
  const cart = await createOrGetCart({ userId });
  const item = cart.items.id(itemId);
  if (!item) throw new Error('Item not found');

  if (quantity <= 0) {
    cart.items.pull(itemId);
  } else {
    item.quantity = quantity;
  }

  await cart.save();
  return cart;
}

// Remove item from cart
export async function removeItem({ userId, itemId }) {
  if (!userId) throw new Error('Authentication required');
  const cart = await createOrGetCart({ userId });
  
  // Use pull() to remove item by _id
  cart.items.pull(itemId);
  
  await cart.save();
  return cart;
}

// Clear all cart items
export async function clearCart({ userId }) {
  if (!userId) throw new Error('Authentication required');
  const cart = await createOrGetCart({ userId });
  cart.items = [];
  if (typeof cart.setGuestTTL === 'function') cart.setGuestTTL(null);
  await cart.save();
  return cart;
}

// Merge guest cart into authenticated user's cart
export async function mergeGuestCart({ userId /*, sessionId */ }) {
  // Guest/session-based carts are no longer used in the auth-only flow.
  // Keep this helper to return the user's cart for compatibility.
  if (!userId) throw new Error('Authentication required');
  return createOrGetCart({ userId });
}

// Checkout process with stock and price revalidation
export async function checkout({ userId, sessionId, paymentData = {}, metadata = {} }) {
  // Require authenticated user for checkout — guests can add to cart but must log in to place order
  if (!userId) {
    throw new Error('Authentication required for checkout');
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const cartQuery = { user: userId };
      const cart = await Cart.findOne(cartQuery)
        .session(session)
        .populate('items.product');

      if (!cart || cart.items.length === 0) {
        throw new Error('Cart is empty');
      }

      for (const it of cart.items) {
        const prod = await Product.findById(it.product._id).session(session);
        if (!prod) throw new Error('Product not found during checkout');
        if (typeof prod.stock === 'number' && prod.stock < it.quantity) {
          throw new Error(`Out of stock: ${prod._id}`);
        }
        it.price = prod.price;
      }

      cart.subTotal = cart.items.reduce(
        (sum, it) => sum + it.price * it.quantity,
        0
      );

      const orderPayload = {
        user: userId || null,
        items: cart.items.map(it => ({
          product: it.product._id,
          quantity: it.quantity,
          price: it.price,
          title: it.title,
          selectedOptions: it.selectedOptions,
        })),
        subTotal: cart.subTotal,
        metadata,
        payment: {
          status: 'pending',
          gateway: paymentData.gateway || null,
        },
      };

      const order = await Order.create([orderPayload], { session });

      for (const it of cart.items) {
        if (typeof it.product.stock === 'number') {
          const updated = await Product.updateOne(
            { _id: it.product._id, stock: { $gte: it.quantity } },
            { $inc: { stock: -it.quantity } }
          ).session(session);

          if (updated.nModified === 0) {
            throw new Error(`Stock update failed for ${it.product._id}`);
          }
        }
      }

      cart.items = [];
      cart.setGuestTTL(null);
      await cart.save({ session });

      result = { success: true, orderId: order[0]._id };
    });

    return result;
  } finally {
    session.endSession();
  }
}

export default {
  createOrGetCart,
  addItem,
  updateItemQty,
  removeItem,
  clearCart,
  mergeGuestCart,
  checkout,
};
