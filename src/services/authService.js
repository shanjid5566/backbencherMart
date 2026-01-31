import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import nodemailer from "nodemailer";
import validator from "validator";
import User from "../models/user.js";

const generateOtp = () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return { code, expiresAt };
};

const sendOtpEmail = async (toEmail, otpCode) => {
  const host = process.env.SMTP_HOST;
  if (!host) {
    console.log(`OTP for ${toEmail}: ${otpCode} (SMTP not configured)`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // false for Gmail 587
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: "Your verification code",
    text: `Your OTP is ${otpCode}. It expires in 10 minutes.`,
    html: `<p>Your OTP is <b>${otpCode}</b>. It expires in 10 minutes.</p>`,
  });
};


export const registerUser = async ({ firstName, lastName, email, password }) => {
  if (!firstName || !email || !password) {
    const err = new Error("firstName, email and password are required");
    err.status = 400;
    throw err;
  }
  if (!validator.isEmail(email)) {
    const err = new Error("Invalid email");
    err.status = 400;
    throw err;
  }
  const existing = await User.findOne({ email }).exec();
  if (existing) {
    const err = new Error("Email already in use");
    err.status = 409;
    throw err;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);
  const otp = generateOtp();

  const user = await User.create({
    firstName,
    lastName,
    email,
    passwordHash,
    isVerified: false,
    otp,
  });

  try {
    await sendOtpEmail(email, otp.code);
  } catch (e) {
    console.warn("Failed to send OTP email:", e.message);
  }

  return { id: user._id, email: user.email };
};



export const verifyOtpForEmail = async ({ email, code }) => {
  if (!email || !code) {
    const err = new Error("email and code required");
    err.status = 400;
    throw err;
  }
  const user = await User.findOne({ email }).exec();
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  if (!user.otp || user.otp.code !== code || user.otp.expiresAt < new Date()) {
    const err = new Error("Invalid or expired OTP");
    err.status = 400;
    throw err;
  }
  user.isVerified = true;
  user.otp = undefined;
  await user.save();
  return { id: user._id, email: user.email };
};


export const loginUser = async ({ email, password }) => {
  if (!email || !password) {
    const err = new Error("email and password required");
    err.status = 400;
    throw err;
  }
  const user = await User.findOne({ email }).exec();
  if (!user) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.status = 401;
    throw err;
  }
  if (!user.isVerified) {
    const err = new Error("Email not verified");
    err.status = 403;
    throw err;
  }
  const payload = {
    id: user._id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET || "changeme", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
  return { token, user: payload };
};

export const addAddress = async ({ userId, address }) => {
  const user = await User.findById(userId).exec();
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  user.addresses.push(address);
  await user.save();
  return user.addresses;
};

export const listAddresses = async ({ userId }) => {
  const user = await User.findById(userId).lean().exec();
  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    throw err;
  }
  return user.addresses || [];
};