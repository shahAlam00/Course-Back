import express from "express";
import { registerUser, loginUser, getProfile, updateProfile, markLessonComplete, getAllStudents, getStudentById, makeAdmin } from "./auth.controller.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);
router.post("/lesson-complete", protect, markLessonComplete);
router.get("/students", getAllStudents);
router.get("/students/:id", getStudentById);

router.put("/make-admin", makeAdmin);
export default router;
