import { fetchReviews, createReview, updateReview, deleteReview as deleteReviewService } from "../services/reviewService.js";

// Get reviews for a product
export const getReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page, limit } = req.query;
    const result = await fetchReviews({ productId, page, limit });
    return res.status(200).json(result);
  } catch (error) {
    const status = error.status || 500;
    console.error("getReviews error:", error.message);
    return res.status(status).json({ message: error.message });
  }
};

// Create a new review for a product (only authenticated users)

export const postReview = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { rating, comment } = req.body;
    if (rating === undefined || comment === undefined) {
      return res.status(400).json({ message: "rating and comment are required" });
    }

    // derive a display name for the review from the JWT payload
    const userName =
      (req.user.firstName || req.user.lastName)
        ? `${req.user.firstName ?? ""}${req.user.lastName ? " " + req.user.lastName : ""}`.trim()
        : req.user.userName || req.user.email;

    const userEmail = req.user.email;

    const created = await createReview({
      productId,
      userEmail,
      userName,
      rating: Number(rating),
      comment,
    });
    return res.status(201).json({ message: "Review created", review: created });
  } catch (error) {
    const status = error.status || 500;
    console.error("postReview error:", error.message);
    return res.status(status).json({ message: error.message });
  }
};

export const patchReview = async (req, res) => {
  try {
    // support reviewId from params or body
    const reviewId = req.params.reviewId ?? req.body.reviewId;
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!reviewId) {
      return res.status(400).json({ message: "reviewId is required (param or body)" });
    }

    const { rating, comment } = req.body;
    if (rating === undefined && comment === undefined) {
      return res.status(400).json({ message: "rating or comment required to update" });
    }

    const userEmail = req.user.email;
    const updated = await updateReview({ reviewId, userEmail, rating: rating !== undefined ? Number(rating) : undefined, comment });
    return res.status(200).json({ message: "Review updated", review: updated });
  } catch (error) {
    const status = error.status || 500;
    console.error("patchReview error:", error.message);
    return res.status(status).json({ message: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
    // support reviewId from params or body
    const reviewId = req.params.reviewId ?? req.body.reviewId;
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!reviewId) {
      return res.status(400).json({ message: "reviewId is required (param or body)" });
    }

    const userEmail = req.user.email;
    const result = await deleteReviewService({ reviewId, userEmail });
    return res.status(200).json({ message: "Review deleted", ...result });
  } catch (error) {
    const status = error.status || 500;
    console.error("deleteReview error:", error.message);
    return res.status(status).json({ message: error.message });
  }
};
