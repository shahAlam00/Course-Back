import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    role: {
  type: String,
  enum: ["student", "admin"],
  default: "student",
},
    phone: { type: String, default: "" },
    location: { type: String, default: "" },
    avatar: { type: String, default: "" },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    purchasedCourses: [
      {
        course: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
        purchasedAt: { type: Date, default: Date.now },
        progress: { type: Number, default: 0 },
        completedLessons: [{ type: String }],
        stripeSessionId: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
