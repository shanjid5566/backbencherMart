import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userEmail: { type: String, required: true, lowercase: true, trim: true },
    userName: { type: String },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: { type: String, required: true },
  },
  { timestamps: true },
);

const review = mongoose.model("Review", reviewSchema);

export default review;
