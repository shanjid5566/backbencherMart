import express from "express";
import { getProducts, createProductHandler, updateProductHandler, updateProductStockHandler, deleteProductHandler } from "../../controllers/ProductControllers.js";
import { getReviews, postReview, patchReview, deleteReview } from "../../controllers/ReviewControllers.js";
import { verifyToken } from "../../middleware/authMiddleware.js";
import multer from "multer";

// Use memory storage; files will be uploaded to Cloudinary directly from memory buffer
const storage = multer.memoryStorage();
const upload = multer({
	storage,
	limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
	fileFilter: (req, file, cb) => {
		if (!file.mimetype.startsWith("image/")) {
			return cb(new Error("Only image files are allowed"), false);
		}
		cb(null, true);
	},
});

const router = express.Router();

// Products
router.get("/api/products", getProducts);

// Reviews for a product
router.get("/api/products/:productId/reviews", getReviews);
router.post("/api/products/:productId/reviews", verifyToken, postReview);
router.patch("/api/reviews/:reviewId", verifyToken, patchReview);
// Also allow reviewId in body: PATCH /api/reviews
router.patch("/api/reviews", verifyToken, patchReview);
// Delete review (by param or by body)
router.delete("/api/reviews/:reviewId", verifyToken, deleteReview);
router.delete("/api/reviews", verifyToken, deleteReview);
// Admin product management
// Admin create product: accept up to 8 files under either `images` or `image` field names
router.post(
	"/api/admin/products",
	verifyToken,
	upload.fields([
		{ name: "images", maxCount: 8 },
		{ name: "image", maxCount: 8 },
	]),
	createProductHandler,
);
router.put("/api/admin/products/:productId", verifyToken, updateProductHandler);
router.patch("/api/admin/products/:productId/stock", verifyToken, updateProductStockHandler);
router.delete("/api/admin/products/:productId", verifyToken, deleteProductHandler);

// Export the router

export const productRouter = router;
