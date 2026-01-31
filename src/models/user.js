import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      enum: ["Home", "Office", "Other"],
      default: "Home",
    },

    line1: {
      type: String,
      required: true, // House, Road, Area
      trim: true,
    },

    line2: {
      type: String, // Optional landmark
      trim: true,
    },

    city: {
      type: String, // City / District
      required: true,
      trim: true,
    },

    state: {
      type: String, // Division (kept as "state" to avoid breaking)
      enum: [
        "Dhaka",
        "Chattogram",
        "Rajshahi",
        "Khulna",
        "Barishal",
        "Sylhet",
        "Rangpur",
        "Mymensingh",
      ],
      required: true,
    },

    postalCode: {
      type: String,
      match: [/^\d{4}$/, "Invalid Bangladesh postal code"],
    },

    country: {
      type: String,
      default: "Bangladesh",
      immutable: true,
    },

    phone: {
      type: String,
      match: [/^(\+8801|01)[3-9]\d{8}$/, "Invalid Bangladeshi phone number"],
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true },
);



const otpSchema = new mongoose.Schema(
  {
    code: String,
    expiresAt: Date,
  },
  { _id: true },
);
const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    isVerified: { type: Boolean, default: false }, // email verified
    otp: otpSchema,
    addresses: [addressSchema],
    role: { type: String, default: "user" },
  },
  { timestamps: true },
);

const User = mongoose.model("User", userSchema);
export default User;
