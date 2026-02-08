import User from "../models/user.js";
import Order from "../models/order.js";
import bcrypt from "bcryptjs";

/**
 * Get user profile with statistics
 * @param {string} userId - User ID
 * @returns {Object} User profile with statistics
 */
export const getUserProfile = async ({ userId }) => {
  if (!userId) {
    const error = new Error("User ID is required");
    error.status = 400;
    throw error;
  }

  const user = await User.findById(userId).select("-passwordHash -otp -__v");
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  // Get order statistics
  const orders = await Order.find({ user: userId });
  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => {
    // Only count paid orders
    if (order.payment?.status === "paid") {
      return sum + order.subTotal;
    }
    return sum;
  }, 0);

  return {
    user: {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.addresses?.[0]?.phone || null,
      address: user.addresses?.[0] || null,
      addresses: user.addresses,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    },
    statistics: {
      totalOrders,
      totalSpent: totalSpent.toFixed(2),
      memberSince: new Date(user.createdAt).getFullYear(),
    },
  };
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Object} Updated user
 */
export const updateUserProfile = async ({ userId, updates }) => {
  if (!userId) {
    const error = new Error("User ID is required");
    error.status = 400;
    throw error;
  }

  const allowedUpdates = ["firstName", "lastName"];
  const updateData = {};

  // Filter allowed updates
  for (const key of allowedUpdates) {
    if (updates[key] !== undefined) {
      updateData[key] = updates[key];
    }
  }

  // Update address if provided
  if (updates.address) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error("User not found");
      error.status = 404;
      throw error;
    }

    // Update first address or add new one
    if (user.addresses && user.addresses.length > 0) {
      user.addresses[0] = { ...user.addresses[0].toObject(), ...updates.address };
    } else {
      user.addresses = [updates.address];
    }

    await user.save();
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updateData },
    { new: true, runValidators: true }
  ).select("-passwordHash -otp -__v");

  if (!updatedUser) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  return updatedUser;
};

/**
 * Get user orders with optional status filter
 * @param {string} userId - User ID
 * @param {string} status - Order status filter (optional)
 * @returns {Array} User orders
 */
export const getUserOrders = async ({ userId, status }) => {
  if (!userId) {
    const error = new Error("User ID is required");
    error.status = 400;
    throw error;
  }

  const query = { user: userId };

  // Add status filter if provided
  if (status && status !== "all") {
    query.status = status;
  }

  const orders = await Order.find(query)
    .populate("items.product", "title images price")
    .sort({ createdAt: -1 });

  // Transform orders to match UI requirements
  const transformedOrders = orders.map((order) => ({
    id: order._id,
    orderId: order.orderId || `ORD-${order._id.toString().slice(-6).toUpperCase()}`,
    status: order.status,
    createdAt: order.createdAt,
    items: order.items.map((item) => ({
      product: item.product,
      quantity: item.quantity,
      price: item.price,
      title: item.title,
      selectedOptions: item.selectedOptions,
    })),
    subTotal: order.subTotal,
    payment: order.payment,
    metadata: order.metadata,
  }));

  return transformedOrders;
};

/**
 * Change user password
 * @param {string} userId - User ID
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Object} Success message
 */
export const changePassword = async ({ userId, currentPassword, newPassword }) => {
  if (!userId || !currentPassword || !newPassword) {
    const error = new Error("All fields are required");
    error.status = 400;
    throw error;
  }

  if (newPassword.length < 6) {
    const error = new Error("New password must be at least 6 characters");
    error.status = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  // Verify current password
  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Current password is incorrect");
    error.status = 401;
    throw error;
  }

  // Hash new password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  user.passwordHash = hashedPassword;
  await user.save();

  return { message: "Password changed successfully" };
};

/**
 * Delete user account
 * @param {string} userId - User ID
 * @param {string} password - User password for confirmation
 * @returns {Object} Success message
 */
export const deleteUserAccount = async ({ userId, password }) => {
  if (!userId || !password) {
    const error = new Error("User ID and password are required");
    error.status = 400;
    throw error;
  }

  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.status = 404;
    throw error;
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Password is incorrect");
    error.status = 401;
    throw error;
  }

  // Delete user's orders (or you might want to keep them for records)
  // await Order.deleteMany({ user: userId });

  // Delete user
  await User.findByIdAndDelete(userId);

  return { message: "Account deleted successfully" };
};
