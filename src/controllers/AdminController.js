import {
  getDashboardStats,
  getSalesOverview,
  getLowStockProducts,
  getRecentOrders,
  getAllUsers,
  getAllOrders,
  updateOrderStatus,
  getAllReviews,
  deleteReviewAdmin,
  getMonthlyRevenue,
  getSalesByCategory,
  getBusinessMetrics,
  updateUserAdmin,
  deleteUserAdmin,
} from "../services/adminService.js";

/**
 * Middleware to check if user is admin
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden: Admin access required" });
  }
  next();
};

/**
 * Get dashboard statistics
 */
export const getDashboardStatsController = async (req, res) => {
  try {
    const stats = await getDashboardStats();
    return res.status(200).json(stats);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Get sales overview
 */
export const getSalesOverviewController = async (req, res) => {
  try {
    const { days } = req.query;
    const salesData = await getSalesOverview({ days: days ? parseInt(days) : 7 });
    return res.status(200).json({ salesData });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Get products with low stock
 */
export const getLowStockProductsController = async (req, res) => {
  try {
    const { threshold } = req.query;
    const products = await getLowStockProducts({
      threshold: threshold ? parseInt(threshold) : 15,
    });
    return res.status(200).json({ products, count: products.length });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Get recent orders
 */
export const getRecentOrdersController = async (req, res) => {
  try {
    const { limit } = req.query;
    const orders = await getRecentOrders({
      limit: limit ? parseInt(limit) : 10,
    });
    return res.status(200).json({ orders, count: orders.length });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Get all users with filters
 */
export const getAllUsersController = async (req, res) => {
  try {
    const { page, limit, search, role, status } = req.query;
    const result = await getAllUsers({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      search,
      role,
      status,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Get all orders with filters
 */
export const getAllOrdersController = async (req, res) => {
  try {
    const { page, limit, status, search } = req.query;
    const result = await getAllOrders({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      status,
      search,
    });
    return res.status(200).json(result);
  } catch (error) {
    const statusCode = error.status || 500;
    return res.status(statusCode).json({ message: error.message });
  }
};

/**
 * Update order status
 */
export const updateOrderStatusController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const result = await updateOrderStatus({ orderId, status });
    return res.status(200).json({
      message: "Order status updated successfully",
      order: result,
    });
  } catch (error) {
    const statusCode = error.status || 500;
    return res.status(statusCode).json({ message: error.message });
  }
};

/**
 * Get all reviews with filters
 */
export const getAllReviewsController = async (req, res) => {
  try {
    const { page, limit, productId, rating } = req.query;
    const result = await getAllReviews({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      productId,
      rating,
    });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Delete review (admin only)
 */
export const deleteReviewController = async (req, res) => {
  try {
    const { reviewId } = req.params;

    if (!reviewId) {
      return res.status(400).json({ message: "Review ID is required" });
    }

    const result = await deleteReviewAdmin({ reviewId });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Get monthly revenue analytics
 */
export const getMonthlyRevenueController = async (req, res) => {
  try {
    const { months } = req.query;
    const data = await getMonthlyRevenue({
      months: months ? parseInt(months) : 6,
    });
    return res.status(200).json({ data });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Get sales by category analytics
 */
export const getSalesByCategoryController = async (req, res) => {
  try {
    const data = await getSalesByCategory();
    return res.status(200).json({ data });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Get business metrics (conversion rate, avg order value, retention)
 */
export const getBusinessMetricsController = async (req, res) => {
  try {
    const metrics = await getBusinessMetrics();
    return res.status(200).json(metrics);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Update user (admin only)
 */
export const updateUserController = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = await updateUserAdmin({ userId, updates });
    return res.status(200).json({ message: "User updated successfully", user });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

/**
 * Delete user (admin only)
 */
export const deleteUserController = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await deleteUserAdmin({ userId });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};
