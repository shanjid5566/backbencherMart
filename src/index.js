// load env variables before anything else
import "dotenv/config"; // dotenv automatically reads .env
import app from "./app.js"; // express app (ESM import)
import { connectDB } from "./config/db.js"; // named export for DB connect
import { productRouter } from "./routes/v1/productRoute.js";
import { authRouter } from "./routes/v1/authRoute.js";

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