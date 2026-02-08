import express from "express";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { createFAQController, deleteFaqHandler, getFAQsByProductIdController, updateFaqHandler } from "../../controllers/FaqControllers.js";

const router = express.Router();

// Public: list FAQs for a product
router.get("/api/faqs/:productId", getFAQsByProductIdController);

// Admin: create FAQ for a product
router.post("/api/faqs/:productId", verifyToken, createFAQController);

// Admin: update FAQ by id
router.patch("/api/faqs/:faqId", verifyToken, updateFaqHandler);

// Admin: delete FAQ by id
router.delete("/api/faqs/:faqId", verifyToken, deleteFaqHandler);

export const faqRouter = router;