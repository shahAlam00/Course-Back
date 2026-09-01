import User from "./auth.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Register Controller
export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email is already registered." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({
      success: true,
      message: "Registration successful!",
      user: { id: newUser._id, name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Login Controller
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || "your_jwt_secret_key",
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful!",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET Profile
export const getProfile = async (req, res) => {
  try {
    // Auth middleware se user check
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
      });
    }

    const user = await User.findById(req.user._id)
      .select("-password")
      .populate({
        path: "purchasedCourses.course",
        select:
          "title shortDescription thumbnail category instructor duration totalLessons modules",
      });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const purchasedCourses = (user.purchasedCourses || [])
      .filter((pc) => pc && pc.course)
      .map((pc) => {
        const course = pc.course;

        const totalLessons =
          course.totalLessons ||
          course.modules?.reduce(
            (total, module) => total + (module.lessons?.length || 0),
            0
          ) ||
          0;

        return {
          _id: course._id,
          title: course.title,
          shortDescription: course.shortDescription,
          thumbnail: course.thumbnail,
          category: course.category,
          instructor: course.instructor,
          duration: course.duration,
          totalLessons,
          completedLessons: pc.completedLessons?.length || 0,
          progress: pc.progress || 0,
          purchasedAt: pc.purchasedAt,
        };
      });

    return res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        location: user.location || "",
        avatar:
          user.avatar ||
          user.name?.charAt(0)?.toUpperCase() ||
          "U",
        joinedDate: user.createdAt
          ? new Date(user.createdAt).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })
          : "",
        purchasedCourses,
      },
    });
  } catch (error) {
    console.error("GET PROFILE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// UPDATE Profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, location, avatar } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, location, avatar },
      { new: true, runValidators: true }
    ).select("-password");

    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// GET All Students (Admin)
export const getAllStudents = async (req, res) => {
  try {
    const students = await User.find()
      .select("-password")
      .populate({
        path: "purchasedCourses.course",
        select: "title thumbnail category",
      })
      .sort({ createdAt: -1 });

    const data = students.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || "",
      location: u.location || "",
      avatar: u.avatar || u.name?.charAt(0).toUpperCase(),
      joinedDate: new Date(u.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      enrolledCourses: u.purchasedCourses.filter((pc) => pc.course).length,
      courses: u.purchasedCourses.filter((pc) => pc.course).map((pc) => ({
        _id: pc.course._id,
        title: pc.course.title,
        thumbnail: pc.course.thumbnail,
        category: pc.course.category,
        progress: pc.progress || 0,
        purchasedAt: pc.purchasedAt,
      })),
    }));

    res.status(200).json({ success: true, count: data.length, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET Single Student (Admin)
export const getStudentById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate({
        path: "purchasedCourses.course",
        select: "title thumbnail category instructor duration totalLessons",
      });

    if (!user) return res.status(404).json({ message: "Student not found" });

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        location: user.location || "",
        avatar: user.avatar || user.name?.charAt(0).toUpperCase(),
        joinedDate: new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
        courses: user.purchasedCourses.filter((pc) => pc.course).map((pc) => ({
          _id: pc.course._id,
          title: pc.course.title,
          thumbnail: pc.course.thumbnail,
          category: pc.course.category,
          instructor: pc.course.instructor,
          duration: pc.course.duration,
          totalLessons: pc.course.totalLessons || 0,
          completedLessons: pc.completedLessons?.length || 0,
          progress: pc.progress || 0,
          purchasedAt: pc.purchasedAt,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Mark Lesson Complete
export const markLessonComplete = async (req, res) => {
  try {
    const { courseId, lessonId } = req.body;

    const user = await User.findById(req.user._id);
    const enrollment = user.purchasedCourses.find(
      (pc) => pc.course.toString() === courseId
    );

    if (!enrollment) {
      return res.status(404).json({ message: "Course not purchased" });
    }

    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
    }

    // Progress calculate karo
    const course = await (await import("../course/course.model.js")).default.findById(courseId);
    const totalLessons = course?.modules?.reduce((s, m) => s + m.lessons.length, 0) || 1;
    enrollment.progress = Math.round((enrollment.completedLessons.length / totalLessons) * 100);

    await user.save();

    res.status(200).json({
      success: true,
      progress: enrollment.progress,
      completedLessons: enrollment.completedLessons,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const makeAdmin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = "admin";

    await user.save();

    return res.status(200).json({
      success: true,
      message: "User role changed to admin successfully",
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Make admin error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};