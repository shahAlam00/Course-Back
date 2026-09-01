import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["student", "admin"], required: true },
    message: { type: String, required: true, trim: true },
  },
  { timestamps: true }
);

const doubtSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    lesson: { type: String, default: "", trim: true },
    title: { type: String, required: [true, "Title is required"], trim: true },
    description: { type: String, required: [true, "Description is required"], trim: true },
    priority: { type: String, enum: ["Normal", "Important"], default: "Normal" },
    status: {
      type: String,
      enum: ["Pending", "In Review", "Answered", "Closed"],
      default: "Pending",
      index: true,
    },
    messages: [messageSchema],
  },
  { timestamps: true }
);

const Doubt = mongoose.model("Doubt", doubtSchema);
export default Doubt;
