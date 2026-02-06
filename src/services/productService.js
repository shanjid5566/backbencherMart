import product from "../models/product.js";
import Order from "../models/order.js";

export const fetchProducts = async ({
  page,
  limit,
  filters = {},
  sort = "-_id",
  fields = null,
} = {}) => {
  try {
    const wantsPagination = page !== undefined || limit !== undefined;
    if (wantsPagination) {
      const p = Math.max(1, Number(page ?? 1));
      const l = Math.max(1, Math.min(1000, Number(limit ?? 10))); // limit max 1000
      const skip = (p - 1) * l;

      const query = product.find(filters);

      // Normalize fields: "name,price,image" -> "name price image"
      const selectFields =
        fields && typeof fields === "string"
          ? fields.split(",").map((f) => f.trim()).join(" ")
          : fields;

      if (selectFields) {
        query.select(selectFields);
      }

      const [items, totalPages] = await Promise.all([
        query.sort(sort).skip(skip).limit(l).lean().exec(),
        product.countDocuments(filters).exec(),
      ]);

      return {
        paginated: true,
        items,
        meta: {
          page: p,
          limit: l,
          totalPages: Math.ceil(totalPages / l),
          totalItems: totalPages,
        },
      };
    }
    const cursorQuery = product.find(filters);

    const selectFields =
      fields && typeof fields === "string"
        ? fields.split(",").map((f) => f.trim()).join(" ")
        : fields;

    if (selectFields) {
      cursorQuery.select(selectFields);
    }
    const cursor = cursorQuery.sort(sort).lean().cursor();
    return {
      paginated: false,
      items: cursor,
    };
  } catch (error) {
    throw new Error("Error fetching products: " + error.message);
  }
};

export const createProduct = async (productData = {}) => {
  // basic validation
  if (!productData.name || typeof productData.price !== "number") {
    const err = new Error("name and numeric price are required");
    err.status = 400;
    throw err;
  }
  const created = await product.create(productData);
  return created;
};

export const updateProduct = async ({ productId, data } = {}) => {
  if (!productId) {
    const err = new Error("productId required");
    err.status = 400;
    throw err;
  }
  const updated = await product.findByIdAndUpdate(productId, data, { new: true }).exec();
  if (!updated) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  return updated;
};

export const updateProductStock = async ({ productId, stock } = {}) => {
  if (!productId) {
    const err = new Error("productId required");
    err.status = 400;
    throw err;
  }
  if (typeof stock !== "number") {
    const err = new Error("stock must be a number");
    err.status = 400;
    throw err;
  }
  const updated = await product.findByIdAndUpdate(
    productId,
    { stock, inStock: stock > 0 },
    { new: true },
  ).exec();
  if (!updated) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  return updated;
};

export const deleteProduct = async ({ productId } = {}) => {
  if (!productId) {
    const err = new Error("productId required");
    err.status = 400;
    throw err;
  }
  const removed = await product.findByIdAndDelete(productId).exec();
  if (!removed) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  return removed;
};

export const getTopSellingProducts = async (limit = 10) => {
  try {
    const n = Math.max(1, Math.min(100, Number(limit || 10)));
    const pipeline = [
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: n },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $project: { product: 1, totalQuantity: 1, totalRevenue: 1 } },
    ];

    const rows = await Order.aggregate(pipeline).exec();
    return rows.map((r) => ({
      product: r.product,
      totalQuantity: r.totalQuantity,
      totalRevenue: r.totalRevenue,
    }));
  } catch (err) {
    throw new Error("Error fetching top selling products: " + err.message);
  }
};

export const getProductById = async ({ productId, fields = null } = {}) => {
  if (!productId) {
    const err = new Error("productId required");
    err.status = 400;
    throw err;
  }

  const selectFields =
    fields && typeof fields === "string"
      ? fields.split(",").map((f) => f.trim()).join(" ")
      : fields;

  const query = product.findById(productId);
  if (selectFields) query.select(selectFields);

  const found = await query.lean().exec();
  if (!found) {
    const err = new Error("Product not found");
    err.status = 404;
    throw err;
  }
  return found;
};