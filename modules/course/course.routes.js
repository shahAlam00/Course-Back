import express from "express";
import multer from "multer";

import {
  createCourse,
  getAllCourses,
  getCourseById,
  updateCourse,
  deleteCourse,

  getMyPurchasedCourses,

  createRazorpayOrder,
  verifyRazorpayPayment,

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

// ===================== ADMIN STATS =====================

router.get("/admin/stats", protect, getAdminStats);

// ===================== COURSE CRUD =====================

router.post(
  "/create",
  upload.single("thumbnail"),
  createCourse
);

router.get("/all", getAllCourses);

router.get(
  "/my-courses",
  protect,
  getMyPurchasedCourses
);

router.put(
  "/update/:id",
  upload.single("thumbnail"),
  updateCourse
);

// PATCH support
router.patch(
  "/update/:id",
  upload.single("thumbnail"),
  updateCourse
);

router.delete(
  "/delete/:id",
  deleteCourse
);

// ===================== RAZORPAY PAYMENT =====================

// Create Razorpay Order
router.post(
  "/payment/create-order",
  protect,
  createRazorpayOrder
);

// Verify Razorpay Payment
router.post(
  "/payment/verify",
  protect,
  verifyRazorpayPayment
);

// ===================== COURSE DETAILS =====================

router.get("/:id", getCourseById);

// ===================== MODULES =====================

router.post(
  "/:id/modules",
  addModule
);

router.put(
  "/:id/modules/:moduleId",
  updateModule
);

router.delete(
  "/:id/modules/:moduleId",
  deleteModule
);

// ===================== LESSONS =====================

router.post(
  "/:id/modules/:moduleId/lessons",
  addLesson
);

router.put(
  "/:id/modules/:moduleId/lessons/:lessonId",
  updateLesson
);

router.delete(
  "/:id/modules/:moduleId/lessons/:lessonId",
  deleteLesson
);

export default router;