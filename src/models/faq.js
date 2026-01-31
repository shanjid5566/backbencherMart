import mongoose from "mongoose";

const faqSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    question: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { timestamps: true }
);

const faq = mongoose.model("FAQ", faqSchema);

export default faq; 