import { validationResult } from 'express-validator';
import * as cartService from '../services/cartService.js';

// Extract user and session identifiers from request
function extractIdentifiers(req) {
  // be defensive: req, req.cookies may be undefined in some environments
  const userId = (req && (req.user?.id || req.user?._id)) || null; // support different token payload shapes
  return { userId };
}

// GET /api/v1/cart
export async function getCart(req, res, next) {
  try {
    const { userId } = extractIdentifiers(req);
    const cart = await cartService.createOrGetCart({ userId });
    res.json(cart);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/cart/items
export async function addItem(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { userId } = extractIdentifiers(req);
    const { productId, quantity, selectedOptions } = req.body;
    const cart = await cartService.addItem({ userId, productId, quantity, selectedOptions });
    res.status(200).json(cart);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/v1/cart/items
export async function updateItem(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = extractIdentifiers(req);
    const { itemId, quantity } = req.body;

    const cart = await cartService.updateItemQty({ userId, itemId, quantity });

    res.json(cart);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/cart/items/:itemId
export async function removeItem(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { userId } = extractIdentifiers(req);
    const { itemId } = req.params;

    const cart = await cartService.removeItem({ userId, itemId });

    res.json(cart);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/cart/checkout
export async function checkout(req, res, next) {
  try {
    const { userId } = extractIdentifiers(req);
    const paymentData = req.body.payment || {};
    const metadata = req.body.metadata || {};

    const result = await cartService.checkout({ userId, paymentData, metadata });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/cart/merge
export async function mergeCart(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { userId } = extractIdentifiers(req);

    const cart = await cartService.mergeGuestCart({ userId });
    res.json(cart);
  } catch (err) {
    next(err);
  }
}
