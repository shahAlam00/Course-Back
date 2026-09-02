import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./modules/auth/auth.route.js";
import courseRoutes from "./modules/course/course.routes.js";
import doubtRoutes from "./modules/doubt/doubt.routes.js";

dotenv.config();


   

 
const app = express();

/* =======================
   CORS CONFIG
======================= */

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || origin === "null") return callback(null, true);
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return callback(null, true);
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    const allowed = [
      "https://thedigicampus.com",
      "https://www.thedigicampus.com",
      "https://admin.thedigicampus.com",
    ];
    if (allowed.includes(origin)) return callback(null, true);
    return callback(new Error("CORS blocked: " + origin));
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "Cache-Control", "Pragma"],
  optionsSuccessStatus: 200,
};

/* =======================
   APPLY CORS
======================= */

app.use(cors(corsOptions));
 // handle preflight for all routes


/* =======================
   GLOBAL MIDDLEWARES
======================= */

// Stripe webhook ke liye raw body pehle handle karo
app.use("/api/courses/webhook", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(morgan("dev"));

/* =======================
   HEALTH CHECK
======================= */

app.get("/", (req, res) => {
  res.send("Api is working Shah Alammmm ");
});

/* =======================
   API ROUTES
======================= */
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/doubts", doubtRoutes);
/* =======================
   404 ROUTE HANDLER
======================= */

app.use((req, res) => { 
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});



/* =======================
   ERROR HANDLER
======================= */



export default app;