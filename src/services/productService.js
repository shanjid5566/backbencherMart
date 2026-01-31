import product from "../models/product.js";

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