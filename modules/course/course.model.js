import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  videoUrl: { type: String, default: "" },
  videoType: { type: String, enum: ["youtube", "file"], default: "youtube" },
  duration: { type: String, default: "" },
  isFree: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
});

const moduleSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true }, 
  order: { type: Number, default: 0 },
  lessons: [lessonSchema],
});

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    shortDescription: {
      type: String,
      required: [true, "Short description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
    },
    instructor: {
      type: String,
      required: [true, "Instructor name is required"],
      trim: true,
    },
    level: {
      type: String,
      enum: ["Beginner", "Intermediate", "Advanced", "All Levels"],
      default: "Beginner",
    },
    language: { type: String, default: "Hindi + English" },
    description: {
      type: String,
      required: [true, "Full course description is required"],
    },
    videoType: { type: String, enum: ["youtube", "file"], default: "youtube" },
    youtubeUrl: { type: String, default: "" },
    videoFile: { type: String, default: "" },
    originalPrice: { type: Number, default: 0 },
    price: { type: Number, required: [true, "Selling price is required"] },
    duration: { type: String, default: "0 Hours" },
    accessDuration: { type: String, default: "Lifetime" },
    status: { type: String, enum: ["Draft", "Published"], default: "Draft" },
    outcomes: { type: [String], default: [] },
    requirements: { type: [String], default: [] },
    thumbnail: { type: String, default: "" },
    features: {
      type: [String],
      default: [
        "Full Lifetime Access",
        "Access on Mobile and TV",
        "Certificate of Completion",
      ],
    },
    modules: [moduleSchema],
    totalLessons: { type: Number, default: 0 },
    enrolledCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Course = mongoose.model("Course", courseSchema);
export default Course;
