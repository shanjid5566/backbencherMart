import mongoose from "mongoose";
import FAQ from "../models/faq.js";
import product from "../models/product.js";

// Helper to extract a 24-character hex ObjectId from noisy inputs like
// "ObjectId('69750435b8547033cdc2762f')" or values with trailing braces.
const extractObjectId = (val) => {
  if (val === undefined || val === null) return val;
  const s = String(val);
  const m = s.match(/([a-fA-F0-9]{24})/);
  return m ? m[1] : s.trim();
};


// get all FAQs for a product

export const getFAQsByProductId = async ({ productId, page, limit, sort = "-createdAt", fields } = {}) => {
  if (!productId) {
    const error = new Error("Product ID is required to fetch FAQs");
    error.statusCode = 400;
    throw error;
  }
  // sanitize and validate productId (accept pasted values like ObjectId('...') or with trailing braces)
  const normalizedProductId = extractObjectId(productId);
  if (!mongoose.Types.ObjectId.isValid(normalizedProductId)) {
    const error = new Error("Invalid productId");
    error.statusCode = 400;
    throw error;
  }
  const productExists = await product.findById(normalizedProductId).exec();
  if (!productExists) {
    const error = new Error("Product not found for the given productId");
    error.statusCode = 404;
    throw error;
  }

  const filters = { productId: normalizedProductId };
  const wantsPagination = page !== undefined || limit !== undefined;

  const selectFields =
    fields && typeof fields === "string"
      ? fields.split(",").map((f) => f.trim()).join(" ")
      : fields;

  if (wantsPagination) {
    const p = Math.max(1, Number(page ?? 1));
    const l = Math.max(1, Math.min(1000, Number(limit ?? 10)));
    const skip = (p - 1) * l;

    const query = FAQ.find(filters);
    if (selectFields) query.select(selectFields);

    const [items, totalItems] = await Promise.all([
      query.sort(sort).skip(skip).limit(l).lean().exec(),
      FAQ.countDocuments(filters).exec(),
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

  const cursorQuery = FAQ.find(filters);
  if (selectFields) cursorQuery.select(selectFields);
  const cursor = cursorQuery.sort(sort).lean().cursor();
  return {
    paginated: false,
    items: cursor,
  };
};

// create a new FAQ entry

export const createFAQ = async (question, answer, productId) => {
  if (!productId || !question || !answer) {
    const error = new Error(
      "Product ID, question and answer are required to create FAQ",
    );
    error.statusCode = 400;
    throw error;
  }
  // sanitize and validate productId
  const normalizedProductId = extractObjectId(productId);
  if (!mongoose.Types.ObjectId.isValid(normalizedProductId)) {
    const error = new Error("Invalid productId");
    error.statusCode = 400;
    throw error;
  }
  const productExists = await product.findById(normalizedProductId);
  if (!productExists) {
    const error = new Error("Product not found for the given productId");
    error.statusCode = 404;
    throw error;
  }
  const createdFAQ = await FAQ.create({ question, answer, productId: normalizedProductId });
  return createdFAQ;
};


// update FAQ by ID
export const updateFAQ = async ({ faqId, data } = {}) => {
  if (!faqId) {
    const err = new Error("faqId required");
    err.statusCode = 400;
    throw err;
  }
  const normalizedFaqId = extractObjectId(faqId);
  if (!mongoose.Types.ObjectId.isValid(normalizedFaqId)) {
    const err = new Error("Invalid faqId");
    err.statusCode = 400;
    throw err;
  }
  const updated = await FAQ.findByIdAndUpdate(normalizedFaqId, data, { new: true }).exec();
  if (!updated) {
    const err = new Error("FAQ not found");
    err.statusCode = 404;
    throw err;
  }
  return updated;
};

// delete FAQ by ID
export const deleteFAQ = async ({ faqId } = {}) => {
  if (!faqId) {
    const err = new Error("faqId required");
    err.statusCode = 400;
    throw err;
  }
  const normalizedFaqId = extractObjectId(faqId);
  if (!mongoose.Types.ObjectId.isValid(normalizedFaqId)) {
    const err = new Error("Invalid faqId");
    err.statusCode = 400;
    throw err;
  }
  const removed = await FAQ.findByIdAndDelete(normalizedFaqId).exec();
  if (!removed) {
    const err = new Error("FAQ not found");
    err.statusCode = 404;
    throw err;
  }
  return removed;
};