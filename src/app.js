import express   from "express";
import helmet from "helmet";
import cors      from "cors";
import rateLimit from "express-rate-limit";

const app = express();

// middlewares
app.use(helmet());
app.use(cors(
    {
        origin: process.env.CORS_ORIGIN ?? '*',
    }
));
app.use(express.json()); // parse json request body 

// rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
});


// apply to all requests
// app.use(errorhandler);

// handle invalid JSON body errors from body-parser
app.use((err, req, res, next) => {
    if (err && err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'Invalid JSON in request body' });
    }
    next(err);
});


// export app
export default app;