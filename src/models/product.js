import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  oldPrice: {
    type: Number,
  },
  discountPercentage: {
    type: Number,
  },
  category: {
    type: String,
    required: true,
  },
  dressStyle: {
    type: String,
    enum: ["Casual", "Formal", "Party", "Gym"],
    required: true,
  },
  image: {
    type: [String],
    required: true,
  },
  colors: {
    type: [String],
    required: true,
  },
  sizes: {
    type: [String],
    enum: ["XS", "S", "M", "L", "XL", "XXL"],
    required: true,
  },
  inStock: {
    type: Boolean,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  stock: {
    type: Number,
    required: true,
  },
  averageRatings: {
    type: Number,
    default: 0,
  },
  totalReviews: {
    type: Number,
    default: 0,
  },
});

const product = mongoose.model("Product", productSchema);

export default product;