import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../config/db.js";
import User from "../models/user.js";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "shanjidahmed66@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "shanjid@5566";

async function createAdmin() {
  try {
    await connectDB();
    const existing = await User.findOne({ email: ADMIN_EMAIL }).exec();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, salt);

    if (existing) {
      existing.passwordHash = passwordHash;
      existing.role = "admin";
      existing.isVerified = true;
      await existing.save();
      console.log(`Updated admin user: ${ADMIN_EMAIL}`);
    } else {
      const user = await User.create({
        firstName: "Admin",
        lastName: "",
        email: ADMIN_EMAIL,
        passwordHash,
        isVerified: true,
        role: "admin",
      });
      console.log(`Created admin user: ${user.email}`);
    }

    process.exit(0);
  } catch (err) {
    console.error("Failed to create/update admin:", err);
    process.exit(1);
  }
}

createAdmin();


// node src/scripts/createAdmin.js