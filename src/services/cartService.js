import mongoose from 'mongoose';
import Cart from '../models/cart.js';
import Product from '../models/product.js';
import Order from '../models/order.js';

const GUEST_TTL_DAYS = 30;

// Create or return a cart based on userId or sessionId
export async function createOrGetCart({ userId, sessionId }) {
  if (userId) {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId });
      cart.setGuestTTL(null);
      await cart.save();
    }
    return cart;
  }

  if (sessionId) {
    let cart = await Cart.findOne({ sessionId });
    if (!cart) {
      cart = new Cart({ sessionId });
      cart.setGuestTTL(GUEST_TTL_DAYS);
      await cart.save();
    }
    return cart;
  }

  const newSessionId = new mongoose.Types.ObjectId().toString();
  const cart = new Cart({ sessionId: newSessionId });
  cart.setGuestTTL(GUEST_TTL_DAYS);
  await cart.save();
  return cart;
}

// Add item to cart (matched by product + selectedOptions)
export async function addItem({
  userId,
  sessionId,
  productId,
  quantity = 1,
  selectedOptions = {},
}) {
  const cart = await createOrGetCart({ userId, sessionId });
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

  cart.setGuestTTL(GUEST_TTL_DAYS);
  await cart.save();
  return cart;
}

// Update quantity of a cart item
export async function updateItemQty({ userId, sessionId, itemId, quantity }) {
  const cart = await createOrGetCart({ userId, sessionId });
  const item = cart.items.id(itemId);
  if (!item) throw new Error('Item not found');

  if (quantity <= 0) {
    item.remove();
  } else {
    item.quantity = quantity;
  }

  cart.setGuestTTL(GUEST_TTL_DAYS);
  await cart.save();
  return cart;
}

// Remove item from cart
export async function removeItem({ userId, sessionId, itemId }) {
  const cart = await createOrGetCart({ userId, sessionId });
  cart.items.id(itemId)?.remove();
  cart.setGuestTTL(GUEST_TTL_DAYS);
  await cart.save();
  return cart;
}

// Clear all cart items
export async function clearCart({ userId, sessionId }) {
  const cart = await createOrGetCart({ userId, sessionId });
  cart.items = [];
  cart.setGuestTTL(null);
  await cart.save();
  return cart;
}

// Merge guest cart into authenticated user's cart
export async function mergeGuestCart({ userId, sessionId }) {
  if (!userId || !sessionId) {
    return createOrGetCart({ userId, sessionId });
  }

  const guestCart = await Cart.findOne({ sessionId });
  if (!guestCart) {
    return createOrGetCart({ userId, sessionId });
  }

  const session = await mongoose.startSession();
  try {
    let resultCart;

    await session.withTransaction(async () => {
      let userCart = await Cart.findOne({ user: userId }).session(session);
      if (!userCart) {
        userCart = new Cart({ user: userId, items: [] });
      }

      for (const gIt of guestCart.items) {
        const match = userCart.items.find(
          uIt =>
            uIt.product.toString() === gIt.product.toString() &&
            JSON.stringify(uIt.selectedOptions || {}) ===
              JSON.stringify(gIt.selectedOptions || {})
        );

        if (match) {
          match.quantity += gIt.quantity;
        } else {
          userCart.items.push({
            product: gIt.product,
            quantity: gIt.quantity,
            price: gIt.price,
            title: gIt.title,
            thumbnail: gIt.thumbnail,
            selectedOptions: gIt.selectedOptions,
          });
        }
      }

      userCart.setGuestTTL(null);
      await userCart.save({ session });
      await Cart.deleteOne({ _id: guestCart._id }).session(session);

      resultCart = userCart;
    });

    return resultCart;
  } finally {
    session.endSession();
  }
}

// Checkout process with stock and price revalidation
export async function checkout({ userId, sessionId, paymentData = {}, metadata = {} }) {
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const cartQuery = userId ? { user: userId } : { sessionId };
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
