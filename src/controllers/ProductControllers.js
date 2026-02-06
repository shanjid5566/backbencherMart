import { fetchProducts, createProduct, updateProduct, updateProductStock, deleteProduct, getTopSellingProducts, getProductById } from "../services/productService.js";
import cloudinary from "../config/cloudinary.js";

const uploadToCloudinary = (buffer, filename) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder: process.env.CLOUDINARY_FOLDER || "ecommerce" }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    stream.end(buffer);
  });

export const getProducts = async (req, res) => {
  try {
    const { page, limit, sort, fields, category, dressStyle, q } = req.query;
    const filters = {};
    if (category) {
      filters.category = category;
    }
    if (dressStyle) {
      filters.dressStyle = dressStyle;
    }
    if (q) {
      filters.$or = [
        { name: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    const result = await fetchProducts({ page, limit, filters, sort, fields });

    if (result.paginated) {
      return res.status(200).json({ paginated: true, items: result.items, meta: result.meta });
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    const cursor = result.items;

    res.write('{"paginated":false,"items":[');
    let isFirst = true;
    for await (const doc of cursor) {
      if (!isFirst) {
        res.write(",");
      }
      res.write(JSON.stringify(doc));
      isFirst = false;
    }
    res.write("]}");
    res.end();
  } catch (error) {
    console.error("getProducts error:", error);
    res.status(500).json({ message: error.message });
  }
};

export const createProductHandler = async (req, res) => {
  try {
    // admin only
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }
    // Normalize form-data fields (form-data sends values as strings)
    const raw = req.body || {};
    const data = {
      name: raw.name,
      price: raw.price !== undefined ? Number(raw.price) : undefined,
      oldPrice: raw.oldPrice !== undefined ? Number(raw.oldPrice) : undefined,
      discountPercentage: raw.discountPercentage !== undefined ? Number(raw.discountPercentage) : undefined,
      category: raw.category,
      dressStyle: raw.dressStyle,
      // colors and sizes may be sent as repeated fields or comma-separated string
      colors: Array.isArray(raw.colors)
        ? raw.colors
        : raw.colors
        ? String(raw.colors).split(",").map((s) => s.trim())
        : [],
      sizes: Array.isArray(raw.sizes)
        ? raw.sizes
        : raw.sizes
        ? String(raw.sizes).split(",").map((s) => s.trim())
        : [],
      inStock: raw.inStock === undefined ? undefined : String(raw.inStock) === "true",
      description: raw.description,
      stock: raw.stock !== undefined ? Number(raw.stock) : undefined,
      image: undefined,
    };

    // if files uploaded, upload to Cloudinary and replace/augment `image` field
    // multer.fields() sets req.files to an object like { images: [...], image: [...] }
    const filesRaw = req.files || [];
    const files = Array.isArray(filesRaw) ? filesRaw : Object.values(filesRaw).flat();
    if (files && files.length) {
      const uploads = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer, f.originalname)));
      const urls = uploads.map((r) => r.secure_url || r.url).filter(Boolean);
      data.image = urls;
    }

    const created = await createProduct(data);
    return res.status(201).json({ message: "Product created", product: created });
  } catch (error) {
    const status = error.status || 500;
    console.error("createProduct error:", error.message);
    return res.status(status).json({ message: error.message });
  }
};

export const updateProductHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }
    const { productId } = req.params;
    const data = req.body;
    const updated = await updateProduct({ productId, data });
    return res.status(200).json({ message: "Product updated", product: updated });
  } catch (error) {
    const status = error.status || 500;
    console.error("updateProduct error:", error.message);
    return res.status(status).json({ message: error.message });
  }
};

export const updateProductStockHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }
    const { productId } = req.params;
    const { stock } = req.body;
    const updated = await updateProductStock({ productId, stock: Number(stock) });
    return res.status(200).json({ message: "Product stock updated", product: updated });
  } catch (error) {
    const status = error.status || 500;
    console.error("updateProductStock error:", error.message);
    return res.status(status).json({ message: error.message });
  }
};

export const deleteProductHandler = async (req, res) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden: admin only" });
    }
    const { productId } = req.params;
    const removed = await deleteProduct({ productId });
    return res.status(200).json({ message: "Product deleted", product: removed });
  } catch (error) {
    const status = error.status || 500;
    console.error("deleteProduct error:", error.message);
    return res.status(status).json({ message: error.message });
  }
};

export const getTopSelling = async (req, res) => {
  try {
    const limit = Number(req.query.limit ?? 10);
    const items = await getTopSellingProducts(limit);
    return res.status(200).json({ items });
  } catch (error) {
    console.error("getTopSelling error:", error);
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

export const getProductHandler = async (req, res) => {
  try {
    const { productId } = req.params;
    const { fields } = req.query;
    const prod = await getProductById({ productId, fields });
    return res.status(200).json({ product: prod });
  } catch (error) {
    const status = error.status || 500;
    console.error("getProduct error:", error.message || error);
    return res.status(status).json({ message: error.message });
  }
};