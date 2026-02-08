import User from "../models/user.js";
import Order from "../models/order.js";
import Product from "../models/product.js";
import Review from "../models/review.js";

/**
 * Get dashboard statistics
 * @returns {Object} Dashboard stats
 */
export const getDashboardStats = async () => {
  // Get current month start and last month start
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Total users - current vs last month
  const totalUsers = await User.countDocuments();
  const usersLastMonth = await User.countDocuments({
    createdAt: { $lt: currentMonthStart },
  });
  const usersThisMonth = totalUsers - usersLastMonth;
  const userGrowth = usersLastMonth > 0 
    ? ((usersThisMonth / usersLastMonth) * 100).toFixed(2) 
    : 0;

  // Total products
  const totalProducts = await Product.countDocuments();
  const productsLastMonth = await Product.countDocuments({
    createdAt: { $lt: currentMonthStart },
  });
  const productsThisMonth = totalProducts - productsLastMonth;
  const productGrowth = productsLastMonth > 0
    ? ((productsThisMonth / productsLastMonth) * 100).toFixed(2)
    : 0;

  // Total orders - current vs last month
  const totalOrders = await Order.countDocuments();
  const ordersLastMonth = await Order.countDocuments({
    createdAt: { $lt: currentMonthStart },
  });
  const ordersThisMonth = totalOrders - ordersLastMonth;
  const orderGrowth = ordersLastMonth > 0
    ? ((ordersThisMonth / ordersLastMonth) * 100).toFixed(2)
    : 0;

  // Total revenue - only from paid orders
  const revenueAgg = await Order.aggregate([
    { $match: { "payment.status": "paid" } },
    { $group: { _id: null, total: { $sum: "$subTotal" } } },
  ]);
  const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

  const revenueLastMonthAgg = await Order.aggregate([
    {
      $match: {
        "payment.status": "paid",
        createdAt: { $lt: currentMonthStart },
      },
    },
    { $group: { _id: null, total: { $sum: "$subTotal" } } },
  ]);
  const revenueLastMonth = revenueLastMonthAgg.length > 0 ? revenueLastMonthAgg[0].total : 0;
  const revenueThisMonth = totalRevenue - revenueLastMonth;
  const revenueGrowth = revenueLastMonth > 0
    ? ((revenueThisMonth / revenueLastMonth) * 100).toFixed(2)
    : 0;

  return {
    totalUsers,
    userGrowth: parseFloat(userGrowth),
    totalProducts,
    productGrowth: parseFloat(productGrowth),
    totalOrders,
    orderGrowth: parseFloat(orderGrowth),
    totalRevenue: totalRevenue.toFixed(2),
    revenueGrowth: parseFloat(revenueGrowth),
  };
};

/**
 * Get sales overview for last 7 days
 * @returns {Array} Daily sales data
 */
export const getSalesOverview = async ({ days = 7 }) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const salesData = await Order.aggregate([
    {
      $match: {
        "payment.status": "paid",
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" },
        },
        revenue: { $sum: "$subTotal" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } },
  ]);

  // Format data with day labels
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const formattedData = salesData.map((item) => {
    const date = new Date(item._id.year, item._id.month - 1, item._id.day);
    return {
      date: date.toISOString().split("T")[0],
      day: dayLabels[date.getDay()],
      revenue: parseFloat(item.revenue.toFixed(2)),
      orders: item.orders,
    };
  });

  return formattedData;
};

/**
 * Get low stock products
 * @param {Number} threshold - Stock threshold
 * @returns {Array} Products with low stock
 */
export const getLowStockProducts = async ({ threshold = 15 }) => {
  const products = await Product.find({
    stock: { $lte: threshold, $gt: 0 },
  })
    .select("name stock image category")
    .sort({ stock: 1 })
    .limit(10);

  return products.map((p) => ({
    id: p._id,
    name: p.name,
    stock: p.stock,
    image: p.image?.[0] || null,
    category: p.category,
  }));
};

/**
 * Get recent orders
 * @param {Number} limit - Number of orders to fetch
 * @returns {Array} Recent orders
 */
export const getRecentOrders = async ({ limit = 10 }) => {
  const orders = await Order.find()
    .populate("user", "firstName lastName email")
    .populate("items.product", "name")
    .sort({ createdAt: -1 })
    .limit(limit);

  return orders.map((order) => ({
    id: order._id,
    orderId: order.orderId || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
    customer: order.user
      ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() || order.user.email
      : "Guest",
    customerEmail: order.user?.email || null,
    date: order.createdAt,
    total: order.subTotal,
    status: order.status,
    itemCount: order.items.length,
  }));
};

/**
 * Get all users with filters
 */
export const getAllUsers = async ({ page = 1, limit = 20, search, role, status }) => {
  const query = {};

  if (search) {
    query.$or = [
      { email: { $regex: search, $options: "i" } },
      { firstName: { $regex: search, $options: "i" } },
      { lastName: { $regex: search, $options: "i" } },
    ];
  }

  if (role) {
    query.role = role;
  }

  if (status === "verified") {
    query.isVerified = true;
  } else if (status === "unverified") {
    query.isVerified = false;
  }

  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .select("-passwordHash -otp")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    users: users.map((u) => ({
      id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
      isVerified: u.isVerified,
      createdAt: u.createdAt,
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get all orders with filters
 */
export const getAllOrders = async ({ page = 1, limit = 20, status, search }) => {
  const query = {};

  if (status && status !== "all") {
    query.status = status;
  }

  if (search) {
    // Search by order ID or customer email
    query.$or = [
      { orderId: { $regex: search, $options: "i" } },
    ];
  }

  const total = await Order.countDocuments(query);
  const orders = await Order.find(query)
    .populate("user", "firstName lastName email")
    .populate("items.product", "name image")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    orders: orders.map((order) => ({
      id: order._id,
      orderId: order.orderId || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
      customer: order.user
        ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim() || order.user.email
        : "Guest",
      customerEmail: order.user?.email || null,
      date: order.createdAt,
      total: order.subTotal,
      status: order.status,
      paymentStatus: order.payment?.status || "pending",
      items: order.items.map((item) => ({
        product: item.product?.name || item.title,
        quantity: item.quantity,
        price: item.price,
        image: item.product?.image?.[0] || null,
      })),
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Update order status
 */
export const updateOrderStatus = async ({ orderId, status }) => {
  const validStatuses = ["created", "processing", "shipped", "delivered", "cancelled", "refunded"];

  if (!validStatuses.includes(status)) {
    const error = new Error("Invalid order status");
    error.status = 400;
    throw error;
  }

  const order = await Order.findByIdAndUpdate(
    orderId,
    { status },
    { new: true, runValidators: true }
  ).populate("user", "firstName lastName email");

  if (!order) {
    const error = new Error("Order not found");
    error.status = 404;
    throw error;
  }

  return {
    id: order._id,
    orderId: order.orderId || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
    status: order.status,
    customer: order.user
      ? `${order.user.firstName || ""} ${order.user.lastName || ""}`.trim()
      : "Guest",
  };
};

/**
 * Get all reviews with filters
 */
export const getAllReviews = async ({ page = 1, limit = 20, productId, rating }) => {
  const query = {};

  if (productId) {
    query.productId = productId;
  }

  if (rating) {
    query.rating = parseInt(rating);
  }

  const total = await Review.countDocuments(query);
  const reviews = await Review.find(query)
    .populate("productId", "name image totalReviews")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    reviews: reviews.map((r) => ({
      id: r._id,
      product: {
        id: r.productId?._id,
        name: r.productId?.name,
        image: r.productId?.image?.[0],
        totalReviews: r.productId?.totalReviews,
      },
      user: r.userName,
      userEmail: r.userEmail,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
    })),
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Delete review (admin)
 */
export const deleteReviewAdmin = async ({ reviewId }) => {
  const review = await Review.findByIdAndDelete(reviewId);

  if (!review) {
    const error = new Error("Review not found");
    error.status = 404;
    throw error;
  }

  // Update product ratings
  const reviewsForProduct = await Review.find({ productId: review.productId });
  const avgRating = reviewsForProduct.length > 0
    ? reviewsForProduct.reduce((sum, r) => sum + r.rating, 0) / reviewsForProduct.length
    : 0;

  await Product.findByIdAndUpdate(review.productId, {
    averageRatings: avgRating,
    totalReviews: reviewsForProduct.length,
  });

  return { message: "Review deleted successfully" };
};

/**
 * Get analytics - Monthly revenue for last 6 months
 */
export const getMonthlyRevenue = async ({ months = 6 }) => {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const revenueData = await Order.aggregate([
    {
      $match: {
        "payment.status": "paid",
        createdAt: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
        revenue: { $sum: "$subTotal" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } },
  ]);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  return revenueData.map((item) => ({
    month: monthNames[item._id.month - 1],
    year: item._id.year,
    revenue: parseFloat(item.revenue.toFixed(2)),
    orders: item.orders,
  }));
};

/**
 * Get sales by category
 */
export const getSalesByCategory = async () => {
  const salesData = await Order.aggregate([
    { $match: { "payment.status": "paid" } },
    { $unwind: "$items" },
    {
      $lookup: {
        from: "products",
        localField: "items.product",
        foreignField: "_id",
        as: "productInfo",
      },
    },
    { $unwind: "$productInfo" },
    {
      $group: {
        _id: "$productInfo.dressStyle",
        revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
        items: { $sum: "$items.quantity" },
      },
    },
    { $sort: { revenue: -1 } },
  ]);

  const total = salesData.reduce((sum, item) => sum + item.revenue, 0);

  return salesData.map((item) => ({
    category: item._id || "Uncategorized",
    revenue: parseFloat(item.revenue.toFixed(2)),
    items: item.items,
    percentage: total > 0 ? parseFloat(((item.revenue / total) * 100).toFixed(2)) : 0,
  }));
};

/**
 * Get conversion rate and other metrics
 */
export const getBusinessMetrics = async () => {
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  // Total users and orders this month
  const usersThisMonth = await User.countDocuments({
    createdAt: { $gte: currentMonthStart },
  });
  const ordersThisMonth = await Order.countDocuments({
    "payment.status": "paid",
    createdAt: { $gte: currentMonthStart },
  });

  // Last month
  const usersLastMonth = await User.countDocuments({
    createdAt: { $gte: lastMonthStart, $lt: currentMonthStart },
  });
  const ordersLastMonth = await Order.countDocuments({
    "payment.status": "paid",
    createdAt: { $gte: lastMonthStart, $lt: currentMonthStart },
  });

  // Conversion rate (orders / users)
  const conversionRate = usersThisMonth > 0 ? (ordersThisMonth / usersThisMonth) * 100 : 0;
  const lastConversionRate = usersLastMonth > 0 ? (ordersLastMonth / usersLastMonth) * 100 : 0;
  const conversionChange = lastConversionRate > 0
    ? conversionRate - lastConversionRate
    : 0;

  // Average order value
  const avgOrderAgg = await Order.aggregate([
    { $match: { "payment.status": "paid" } },
    { $group: { _id: null, avg: { $avg: "$subTotal" } } },
  ]);
  const avgOrderValue = avgOrderAgg.length > 0 ? avgOrderAgg[0].avg : 0;

  const avgOrderLastMonthAgg = await Order.aggregate([
    {
      $match: {
        "payment.status": "paid",
        createdAt: { $gte: lastMonthStart, $lt: currentMonthStart },
      },
    },
    { $group: { _id: null, avg: { $avg: "$subTotal" } } },
  ]);
  const avgOrderLastMonth = avgOrderLastMonthAgg.length > 0 ? avgOrderLastMonthAgg[0].avg : 0;
  const avgOrderChange = avgOrderLastMonth > 0 ? avgOrderValue - avgOrderLastMonth : 0;

  // Customer retention (users with 2+ orders)
  const repeatCustomers = await Order.aggregate([
    { $match: { "payment.status": "paid", user: { $ne: null } } },
    { $group: { _id: "$user", orderCount: { $sum: 1 } } },
    { $match: { orderCount: { $gte: 2 } } },
    { $count: "total" },
  ]);
  const totalCustomers = await User.countDocuments();
  const retentionRate = totalCustomers > 0
    ? ((repeatCustomers.length > 0 ? repeatCustomers[0].total : 0) / totalCustomers) * 100
    : 0;

  return {
    conversionRate: parseFloat(conversionRate.toFixed(2)),
    conversionChange: parseFloat(conversionChange.toFixed(2)),
    avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
    avgOrderChange: parseFloat(avgOrderChange.toFixed(2)),
    customerRetention: parseFloat(retentionRate.toFixed(2)),
  };
};

/**
 * Update a user (admin only)
 */
export const updateUserAdmin = async ({ userId, updates }) => {
  if (!userId) {
    const error = new Error("User ID is required");
    error.status = 400;
    throw error;
  }

  const allowed = ["firstName", "lastName", "role", "isVerified"];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { $set: data },
    { new: true, runValidators: true }
  ).select("-passwordHash -otp");

  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return {
    id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    createdAt: user.createdAt,
  };
};

/**
 * Delete a user (admin only)
 */
export const deleteUserAdmin = async ({ userId }) => {
  if (!userId) {
    const error = new Error("User ID is required");
    error.status = 400;
    throw error;
  }

  const deleted = await User.findByIdAndDelete(userId).select("-passwordHash -otp");

  if (!deleted) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return {
    message: "User deleted successfully",
    id: deleted._id,
    email: deleted.email,
  };
};
