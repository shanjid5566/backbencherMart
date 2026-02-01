import jwt from "jsonwebtoken";

// Required auth middleware: verifies token and rejects if missing/invalid
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "almightyPush");
    req.user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Optional auth middleware: if token present, verify and attach `req.user`, otherwise continue
export const optional = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "almightyPush");
    req.user = payload;
  } catch (err) {
    // ignore invalid token for optional auth; do not block the request
  }
  return next();
};

// Default export for compatibility with imports that expect a default object
export default { verifyToken, optional };