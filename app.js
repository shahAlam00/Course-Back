import express from "express";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import authRoutes from "./modules/auth/auth.route.js";
import courseRoutes from "./modules/course/course.routes.js";
dotenv.config();
connectDB().catch((err) => console.error("DB connection failed:", err.message));

  

 
const app = express();

/* =======================
   CORS CONFIG
======================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  
];

const corsOptions = {
  origin: function (origin, callback) {
    // Agar development me ho ya localhost hai, toh bindass allow karo
    if (!origin || origin === "null" || allowedOrigins.includes(origin) || origin.includes("localhost")) {
      return callback(null, true);
    }
    return callback(new Error("CORS not allowed by Ashish's Server"));
  },
  credentials: true,
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS", // Simple string format lines ke lafde khatam karne ke liye
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
  optionsSuccessStatus: 200
};

/* =======================
   APPLY CORS
======================= */

app.use(cors(corsOptions));

// Handle preflight requests
// app.options("*", cors(corsOptions));

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
  res.send("Docker auto update ho raha hai Shah Alammmm saifiiiii samaj.");
});

/* =======================
   API ROUTES
======================= */
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
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