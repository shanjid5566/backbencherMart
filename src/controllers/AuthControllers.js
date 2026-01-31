import {
  registerUser,
  verifyOtpForEmail,
  loginUser,
  addAddress,
  listAddresses,
} from "../services/authService.js";

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    const out = await registerUser({ firstName, lastName, email, password });
    return res.status(201).json({ message: "Registered, OTP sent", ...out });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, code } = req.body;
    const out = await verifyOtpForEmail({ email, code });
    return res.status(200).json({ message: "Email verified", ...out });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const out = await loginUser({ email, password });
    return res.status(200).json(out);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

export const addUserAddress = async (req, res) => {
  try {
    const userId = req.user?.id;
    const address = req.body;
    const addresses = await addAddress({ userId, address });
    return res.status(201).json({ message: "Address added", addresses });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const userId = req.user?.id;
    const addresses = await listAddresses({ userId });
    return res.status(200).json({ addresses });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ message: error.message });
  }
};