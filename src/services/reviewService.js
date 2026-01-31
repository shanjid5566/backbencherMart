import mongoose from "mongoose";
import Review from "../models/review.js";
import Product from "../models/product.js";

export const fetchReviews = async ({ productId, page, limit } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid productId");
  }

  const wantsPagination = page !== undefined || limit !== undefined;
  if (wantsPagination) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.max(1, Math.min(1000, Number(limit ?? 10)));
    const skip = (p - 1) * l;

    const [items, totalItems] = await Promise.all([
      Review.find({ productId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean()
        .exec(),
      Review.countDocuments({ productId }).exec(),
    ]);

    return {
      paginated: true,
      items,
      meta: {
        page: p,
        limit: l,
        totalPages: Math.ceil(totalItems / l),
        totalItems,
      },
    };
  }

  const items = await Review.find({ productId }).sort({ createdAt: -1 }).lean().exec();
  return { paginated: false, items };
};

export const createReview = async ({ productId, userEmail, userName, rating, comment } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid productId");
  }
  if (!userEmail || !comment || typeof rating !== "number") {
    throw new Error("userEmail, rating (number) and comment are required");
  }
  if (rating < 1 || rating > 5) {
    throw new Error("rating must be between 1 and 5");
  }

  const product = await Product.findById(productId).exec();
  if (!product) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }

  const created = await Review.create({ productId, userEmail, userName, rating, comment });

  // Recompute aggregates
  const agg = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        total: { $sum: 1 },
      },
    },
  ]);

  const avgRating = agg[0]?.avgRating ?? 0;
  const total = agg[0]?.total ?? 0;

  await Product.findByIdAndUpdate(productId, {
    averageRatings: Number(avgRating.toFixed(2)),
    totalReviews: total,
  }).exec();

  return created;
};

export const updateReview = async ({ reviewId, userEmail, rating, comment } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    const err = new Error("Invalid reviewId");
    err.status = 400;
    throw err;
  }

  if (rating !== undefined && typeof rating !== "number") {
    const err = new Error("rating must be a number");
    err.status = 400;
    throw err;
  }

  const review = await Review.findOne({ _id: reviewId, userEmail }).exec();
  if (!review) {
    const err = new Error("Review not found or not owned by user");
    err.status = 404;
    throw err;
  }

  let changed = false;
  if (rating !== undefined) {
    review.rating = rating;
    changed = true;
  }
  if (comment !== undefined) {
    review.comment = comment;
    changed = true;
  }

  if (changed) {
    await review.save();

    // Recompute aggregates for the product
    const productId = review.productId;
    const agg = await Review.aggregate([
      { $match: { productId: new mongoose.Types.ObjectId(productId) } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          total: { $sum: 1 },
        },
      },
    ]);

    const avgRating = agg[0]?.avgRating ?? 0;
    const total = agg[0]?.total ?? 0;

    await Product.findByIdAndUpdate(productId, {
      averageRatings: Number(avgRating.toFixed(2)),
      totalReviews: total,
    }).exec();
  }

  return review;
};

export const deleteReview = async ({ reviewId, userEmail } = {}) => {
  if (!mongoose.Types.ObjectId.isValid(reviewId)) {
    const err = new Error("Invalid reviewId");
    err.status = 400;
    throw err;
  }

  const review = await Review.findOne({ _id: reviewId, userEmail }).exec();
  if (!review) {
    const err = new Error("Review not found or not owned by user");
    err.status = 404;
    throw err;
  }

  const productId = review.productId;
  await review.deleteOne();

  // Recompute aggregates for the product after deletion
  const agg = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: "$rating" },
        total: { $sum: 1 },
      },
    },
  ]);

  const avgRating = agg[0]?.avgRating ?? 0;
  const total = agg[0]?.total ?? 0;

  await Product.findByIdAndUpdate(productId, {
    averageRatings: Number(avgRating.toFixed(2)),
    totalReviews: total,
  }).exec();

  return { deleted: true, reviewId };
};