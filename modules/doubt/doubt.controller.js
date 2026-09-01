import mongoose from "mongoose";
import Doubt from "./doubt.model.js";
import User from "../auth/auth.model.js";

// ─── HELPERS ────────────────────────────────────────────────

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// Check karo ki student ne course purchase kiya hai
const hasEnrolled = (user, courseId) =>
  user.purchasedCourses?.some(
    (pc) => pc.course?.toString() === courseId.toString()
  );

// ─── STUDENT: Create Doubt ───────────────────────────────────

export const createDoubt = async (req, res) => {
  try {
    const { courseId, lesson, title, description, priority } = req.body;

    if (!courseId || !title?.trim() || !description?.trim()) {
      return res.status(400).json({
        success: false,
        message: "courseId, title and description are required.",
      });
    }

    if (!isValidId(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course ID." });
    }

    // Student ne course purchase kiya hai ya nahi - verify karo
    const student = await User.findById(req.user._id);
    if (!hasEnrolled(student, courseId)) {
      return res.status(403).json({
        success: false,
        message: "You can only raise doubts for courses you have purchased.",
      });
    }

    const doubt = await Doubt.create({
      student: req.user._id,
      course: courseId,
      lesson: lesson?.trim() || "",
      title: title.trim(),
      description: description.trim(),
      priority: priority === "Important" ? "Important" : "Normal",
      status: "Pending",
      messages: [
        {
          sender: req.user._id,
          senderRole: "student",
          message: description.trim(),
        },
      ],
    });

    await doubt.populate("course", "title thumbnail category");

    res.status(201).json({ success: true, data: doubt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── STUDENT: Get My Doubts ──────────────────────────────────

export const getMyDoubts = async (req, res) => {
  try {
    const doubts = await Doubt.find({ student: req.user._id })
      .populate("course", "title thumbnail category")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: doubts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── STUDENT: Get Single Doubt ───────────────────────────────

export const getMyDoubtById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid doubt ID." });
    }

    const doubt = await Doubt.findOne({
      _id: req.params.id,
      student: req.user._id, // IDOR prevention - sirf apna doubt dekh sakta hai
    })
      .populate("course", "title thumbnail category")
      .populate("messages.sender", "name avatar");

    if (!doubt) {
      return res.status(404).json({ success: false, message: "Doubt not found." });
    }

    res.status(200).json({ success: true, data: doubt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── STUDENT: Send Follow-up Message ────────────────────────

export const addStudentMessage = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Message cannot be empty." });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid doubt ID." });
    }

    const doubt = await Doubt.findOne({
      _id: req.params.id,
      student: req.user._id,
    });

    if (!doubt) {
      return res.status(404).json({ success: false, message: "Doubt not found." });
    }

    if (doubt.status === "Closed") {
      return res.status(400).json({ success: false, message: "Cannot reply to a closed doubt." });
    }

    doubt.messages.push({
      sender: req.user._id,
      senderRole: "student",
      message: message.trim(),
    });

    // Agar answered tha toh wapas In Review karo
    if (doubt.status === "Answered") {
      doubt.status = "In Review";
    }

    await doubt.save();
    await doubt.populate("course", "title thumbnail category");
    await doubt.populate("messages.sender", "name avatar");

    res.status(200).json({ success: true, data: doubt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Get All Doubts ───────────────────────────────────

export const adminGetAllDoubts = async (req, res) => {
  try {
    const { status, priority, search } = req.query;

    const filter = {};
    if (status && ["Pending", "In Review", "Answered", "Closed"].includes(status)) {
      filter.status = status;
    }
    if (priority && ["Normal", "Important"].includes(priority)) {
      filter.priority = priority;
    }

    let doubts = await Doubt.find(filter)
      .populate("student", "name email avatar")
      .populate("course", "title thumbnail category")
      .sort({ createdAt: -1 });

    // Search filter
    if (search?.trim()) {
      const s = search.toLowerCase();
      doubts = doubts.filter(
        (d) =>
          d.title.toLowerCase().includes(s) ||
          d.student?.name?.toLowerCase().includes(s) ||
          d.course?.title?.toLowerCase().includes(s)
      );
    }

    res.status(200).json({ success: true, count: doubts.length, data: doubts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Get Single Doubt ─────────────────────────────────

export const adminGetDoubtById = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid doubt ID." });
    }

    const doubt = await Doubt.findById(req.params.id)
      .populate("student", "name email avatar phone location")
      .populate("course", "title thumbnail category instructor")
      .populate("messages.sender", "name avatar role");

    if (!doubt) {
      return res.status(404).json({ success: false, message: "Doubt not found." });
    }

    res.status(200).json({ success: true, data: doubt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Reply to Doubt ───────────────────────────────────

export const adminReply = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: "Reply message cannot be empty." });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid doubt ID." });
    }

    const doubt = await Doubt.findById(req.params.id);
    if (!doubt) {
      return res.status(404).json({ success: false, message: "Doubt not found." });
    }

    doubt.messages.push({
      sender: req.user._id,
      senderRole: "admin",
      message: message.trim(),
    });

    doubt.status = "Answered";
    await doubt.save();

    await doubt.populate("student", "name email avatar phone location");
    await doubt.populate("course", "title thumbnail category instructor");
    await doubt.populate("messages.sender", "name avatar role");

    res.status(200).json({ success: true, data: doubt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── ADMIN: Update Status ────────────────────────────────────

export const adminUpdateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["Pending", "In Review", "Answered", "Closed"];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid doubt ID." });
    }

    const doubt = await Doubt.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("student", "name email avatar")
      .populate("course", "title thumbnail category");

    if (!doubt) {
      return res.status(404).json({ success: false, message: "Doubt not found." });
    }

    res.status(200).json({ success: true, data: doubt });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
