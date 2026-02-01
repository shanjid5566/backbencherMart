import { validationResult } from 'express-validator';
import * as cartService from '../services/cartService.js';

// Extract user and session identifiers from request
function extractIdentifiers(req) {
  // be defensive: req, req.cookies may be undefined in some environments
  const userId = (req && (req.user?.id || req.user?._id)) || null; // support different token payload shapes

  const sessionIdFromCookie = req && req.cookies && req.cookies.cartSessionId;
  const sessionIdFromBody = req && req.body && req.body.sessionId;
  const sessionIdFromQuery = req && req.query && req.query.sessionId;

  const sessionId = sessionIdFromCookie || sessionIdFromBody || sessionIdFromQuery || null;

  return { userId, sessionId };
}

// GET /api/v1/cart
export async function getCart(req, res, next) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);
    const cart = await cartService.createOrGetCart({ userId, sessionId });
    // If a guest cart was created and the client didn't provide a sessionId, return cookie so client can persist it
    try {
      if (!sessionId && cart?.sessionId) {
        // set cookie for 30 days by default; not httpOnly so client JS can read if needed
        const maxAge = cart.expiresAt ? new Date(cart.expiresAt).getTime() - Date.now() : 30 * 24 * 60 * 60 * 1000;
        res.cookie('cartSessionId', cart.sessionId, { maxAge, httpOnly: false, sameSite: 'Lax' });
      }
    } catch (cookieErr) {
      // ignore cookie errors (e.g., if cookie-parser not installed), still return cart
    }

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

    const { userId, sessionId } = extractIdentifiers(req);
    const { productId, quantity, selectedOptions } = req.body;

    const cart = await cartService.addItem({
      userId,
      sessionId,
      productId,
      quantity,
      selectedOptions,
    });

    // if a guest cart was just created, ensure client receives sessionId cookie
    try {
      if (!sessionId && cart?.sessionId) {
        const maxAge = cart.expiresAt ? new Date(cart.expiresAt).getTime() - Date.now() : 30 * 24 * 60 * 60 * 1000;
        res.cookie('cartSessionId', cart.sessionId, { maxAge, httpOnly: false, sameSite: 'Lax' });
      }
    } catch (cookieErr) {
      // ignore
    }

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

    const { userId, sessionId } = extractIdentifiers(req);
    const {itemId, quantity } = req.body;

    const cart = await cartService.updateItemQty({
      userId,
      sessionId,
      itemId,
      quantity,
    });

    res.json(cart);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/v1/cart/items
export async function removeItem(req, res, next) {
  try {
    const {userId, sessionId } = extractIdentifiers(req);
    const { itemId: bodyItemId } = req.body;

    const cart = await cartService.removeItem({
      userId,
      sessionId,
      itemId: bodyItemId,
    });

    res.json(cart);
  } catch (err) {
    next(err);
  }
}

// POST /api/v1/cart/checkout
export async function checkout(req, res, next) {
  try {
    const { userId, sessionId } = extractIdentifiers(req);
    const paymentData = req.body.payment || {};
    const metadata = req.body.metadata || {};

    const result = await cartService.checkout({
      userId,
      sessionId,
      paymentData,
      metadata,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}
