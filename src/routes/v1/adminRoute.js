import express from "express";
import {
  requireAdmin,
  getDashboardStatsController,
  getSalesOverviewController,
  getLowStockProductsController,
  getRecentOrdersController,
  getAllUsersController,
  getAllOrdersController,
  updateOrderStatusController,
  getAllReviewsController,
  deleteReviewController,
  getMonthlyRevenueController,
  getSalesByCategoryController,
  getBusinessMetricsController,
  updateUserController,
  deleteUserController,
} from "../../controllers/AdminController.js";
import { verifyToken } from "../../middleware/authMiddleware.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken);
router.use(requireAdmin);

// Dashboard routes
router.get("/api/admin/dashboard/stats", getDashboardStatsController);
router.get("/api/admin/dashboard/sales-overview", getSalesOverviewController);
router.get("/api/admin/dashboard/low-stock", getLowStockProductsController);
router.get("/api/admin/dashboard/recent-orders", getRecentOrdersController);

// User management routes
router.get("/api/admin/users", getAllUsersController);
router.patch("/api/admin/users/:userId", updateUserController);
router.delete("/api/admin/users/:userId", deleteUserController);

// Order management routes
router.get("/api/admin/orders", getAllOrdersController);
router.patch("/api/admin/orders/:orderId/status", updateOrderStatusController);

// Review management routes
router.get("/api/admin/reviews", getAllReviewsController);
router.delete("/api/admin/reviews/:reviewId", deleteReviewController);

// Analytics routes
router.get("/api/admin/analytics/monthly-revenue", getMonthlyRevenueController);
router.get("/api/admin/analytics/sales-by-category", getSalesByCategoryController);
router.get("/api/admin/analytics/business-metrics", getBusinessMetricsController);

export const adminRouter = router;
