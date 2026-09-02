import express from "express";
import multer from "multer";
import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,
  createCheckoutSession,
  getMyPurchasedCourses,
  stripeWebhook,
  verifyAndEnroll,
  addModule,
  updateModule,
  deleteModule,
  addLesson,
  updateLesson,
  deleteLesson,
  getAdminStats,
} from "./course.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();
const upload = multer();

// Stripe webhook - raw body chahiye
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Admin Stats
router.get("/admin/stats", protect, getAdminStats);

// Course CRUD
router.post("/create", upload.single("thumbnail"), createCourse);
router.get("/all", getAllCourses);
router.get("/my-courses", protect, getMyPurchasedCourses);
router.put("/update/:id", upload.single("thumbnail"), updateCourse);
router.patch("/update/:id", updateCourse);
router.delete("/delete/:id", deleteCourse);
router.get("/:id", getCourseById);

// Stripe
router.post("/create-checkout-session", protect, createCheckoutSession);
router.post("/verify-enroll", protect, verifyAndEnroll);

// Modules
router.post("/:id/modules", addModule);
router.put("/:id/modules/:moduleId", updateModule);
router.delete("/:id/modules/:moduleId", deleteModule);

// Lessons
router.post("/:id/modules/:moduleId/lessons", addLesson);
router.put("/:id/modules/:moduleId/lessons/:lessonId", updateLesson);
router.delete("/:id/modules/:moduleId/lessons/:lessonId", deleteLesson);

export default router;
