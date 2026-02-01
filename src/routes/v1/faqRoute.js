import express from "express";
import { verifyToken } from "../../middleware/authMiddleware.js";
import { createFAQController, deleteFaqHandler, getFAQsByProductIdController, updateFaqHandler } from "../../controllers/FaqControllers.js";

const router = express.Router();

// Route to get FAQs by product ID
router.get("/api/faqs/:productId",getFAQsByProductIdController)

// Route to create a new FAQ entry, protected by token verification
router.post("/api/faqs/:productId", verifyToken, createFAQController);

// update FAQ route can be added here similarly, protected by verifyToken middleware

router.patch("/api/faqs", verifyToken, updateFaqHandler);

// delete FAQ route can be added here similarly, protected by verifyToken middleware
router.delete("/api/faqs", verifyToken, deleteFaqHandler);

export const faqRouter = router;