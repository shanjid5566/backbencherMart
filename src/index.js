// load env variables before anything else
import "dotenv/config"; // dotenv automatically reads .env
import app from "./app.js"; // express app (ESM import)
import { connectDB } from "./config/db.js"; // named export for DB connect
import { productRouter } from "./routes/v1/productRoute.js";
import { authRouter } from "./routes/v1/authRoute.js";
import { faqRouter } from "./routes/v1/faqRoute.js";
import cartRoute from './routes/v1/cartRoute.js';
import { paymentRouter } from './routes/v1/paymentRoute.js';
import { userRouter } from './routes/v1/userRoute.js';

const PORT = process.env.PORT ?? 4000; // port config with fallback

try {
  await connectDB()
    .then((result) => {
      console.log(result);
    })
    .catch((err) => {
      console.log(err);
    }); // use top-level await (Node 14+ with ESM)
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`); // start server after DB connected
  });
} catch (err) {
  console.error("Failed to start", err); // fail-fast on db connect error
  process.exit(1);
}
app.get('/api/health', (req, res) => {
  res.status(200).send('OK');
});

app.use("/", authRouter);
app.use("/", productRouter); // use product routes
app.use("/", faqRouter); // use FAQ routes
app.use('/', cartRoute); // use cart routes
app.use('/', paymentRouter); // use payment routes
app.use('/', userRouter); // use user routes

// Global error handler - must be after all routes
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});