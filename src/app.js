import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import env from "./config/env.js";
import ErrorHandler from "./middlewares/ErrorHandler.middleware.js";
import notFound from "./middlewares/notFound.middleware.js";
import projectRoutes from "./routes/project.route.js";


const app = express();
const router = express.Router();

app.use(helmet()); // Set security-related HTTP headers
app.use(           // Enable CORS for requests from the client URL
  cors({
    origin: env.clientUrl,
    credentials: true,
  }),
);
app.use(cookieParser()); // Parse cookies from incoming requests
app.use(morgan("dev"));  // Log HTTP requests in development mode

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//healthcheck routes
import healthcheck from "./routes/healthcheck.route.js";
app.use(env.basicRoute, healthcheck);

//auth routes
import authRoutes from "./routes/auth.route.js";
app.use(env.basicRoute + "/auth", authRoutes);

//project routes
app.use(env.basicRoute + "/projects", projectRoutes);

app.use(notFound); // Handle requests to routes that are not found
app.use(ErrorHandler); // Handle errors globally
export default app;
