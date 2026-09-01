import express from "express";
import {
  createDoubt,
  getMyDoubts,
  getMyDoubtById,
  addStudentMessage,
  adminGetAllDoubts,
  adminGetDoubtById,
  adminReply,
  adminUpdateStatus,
} from "./doubt.controller.js";
import { protect, adminOnly } from "../../middleware/auth.middleware.js";

const router = express.Router();

// ─── STUDENT ROUTES (authenticated) ─────────────────────────
router.post("/", protect, createDoubt);
router.get("/", protect, getMyDoubts);
router.get("/:id", protect, getMyDoubtById);
router.post("/:id/messages", protect, addStudentMessage);

// ─── ADMIN ROUTES (admin only) ───────────────────────────────
router.get("/admin/all", protect, adminOnly, adminGetAllDoubts);
router.get("/admin/:id", protect, adminOnly, adminGetDoubtById);
router.post("/admin/:id/reply", protect, adminOnly, adminReply);
router.patch("/admin/:id/status", protect, adminOnly, adminUpdateStatus);

export default router;
