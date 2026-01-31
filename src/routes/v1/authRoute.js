import express from "express";
import { register, verifyOtp, login, addUserAddress, getAddresses } from "../../controllers/AuthControllers.js";
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

router.post("/api/auth/register", register);
router.post("/api/auth/verify-otp", verifyOtp);
router.post("/api/auth/login", login);

// Protected user endpoints
router.get("/api/auth/addresses", verifyToken, getAddresses);
router.post("/api/auth/addresses", verifyToken, addUserAddress);

export const authRouter = router;