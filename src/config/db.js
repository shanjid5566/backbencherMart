import mongoose from "mongoose";

export const connectDB = async () => {
  const MONGO_URI = process.env.MONGO_URI;
  if (!MONGO_URI) {
    throw new Error("MONGO_URI is not defined in environment variables");
  }
  await mongoose.connect(MONGO_URI);
  return "MongoDB connected";
};

if (process.env.NODE_ENV === "development") {
  mongoose.set("debug", true); // enable mongoose debug mode in development
}
