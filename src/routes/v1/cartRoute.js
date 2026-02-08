import express from 'express';
import { body, param } from 'express-validator';
import * as CartController from '../../controllers/CartController.js';
import authMiddleware from '../../middleware/authMiddleware.js';

const router = express.Router();

// Optional authentication middleware (falls back to no-op)
const optionalAuth =
  authMiddleware?.optional ?? ((req, res, next) => next());

// GET cart (guest or authenticated)
router.get('/api/cart', optionalAuth, CartController.getCart);

// POST add item to cart
router.post(
  '/api/cart/items',
  // add-to-cart now requires authenticated user
  authMiddleware.verifyToken,
  body('productId').isMongoId().withMessage('productId is required'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .toInt()
    .withMessage('quantity must be >= 1'),
  CartController.addItem
);

// PATCH update item quantity
router.patch(
  '/api/cart/items',
  optionalAuth,
  body('itemId').isMongoId().withMessage('Invalid itemId'),
  body('quantity')
    .isInt({ min: 0 })
    .toInt()
    .withMessage('quantity must be >= 0'),
  CartController.updateItem
);

// DELETE remove item from cart
router.delete(
  '/api/cart/items/:itemId',
  optionalAuth,
  param('itemId').isMongoId().withMessage('Invalid itemId'),
  CartController.removeItem
);

// POST checkout (requires authentication - user must be logged in)
router.post(
  '/api/cart/checkout',
  authMiddleware.verifyToken,
  body('payment').optional().isObject(),
  CartController.checkout
);

// POST merge (compatibility) - requires auth but sessionId not required in auth-only flow
router.post('/api/cart/merge', authMiddleware.verifyToken, CartController.mergeCart);

const cartRoute = router;
export default cartRoute;