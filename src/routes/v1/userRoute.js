import express from "express";
import {
  getProfile,
  updateProfile,
  getOrders,
  updatePassword,
  deleteAccount,
} from "../../controllers/UserController.js";
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All user routes require authentication
router.use(verifyToken);

// Profile routes
router.get("/api/user/profile", getProfile);
router.put("/api/user/profile", updateProfile);

// Orders routes
router.get("/api/user/orders", getOrders);

// Settings routes
router.put("/api/user/change-password", updatePassword);
router.delete("/api/user/account", deleteAccount);

export const userRouter = router;
