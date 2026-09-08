import Course from "./course.model.js";
import User from "../auth/auth.model.js";
import ImageKit from "@imagekit/nodejs";
import Razorpay from "razorpay";
import crypto from "crypto";

const getImageKit = () =>
  new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });

// ===================== RAZORPAY =====================

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ===================== CREATE RAZORPAY ORDER =====================

export const createRazorpayOrder = async (req, res) => {
  try {
    const { courseId } = req.body;

    if (!courseId) {
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find course
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Course should be published
    if (course.status !== "Published") {
      return res.status(400).json({
        success: false,
        message: "This course is not available for purchase",
      });
    }

    // Check already purchased
    const alreadyPurchased = user.purchasedCourses.some(
      (pc) => pc.course && pc.course.toString() === courseId
    );

    if (alreadyPurchased) {
      return res.status(400).json({
        success: false,
        message: "You have already purchased this course",
      });
    }

    // Price validation
    if (!course.price || course.price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid course price",
      });
    }

    // Razorpay amount is in paise
    const amount = Math.round(course.price * 100);

    const options = {
      amount,
      currency: process.env.CURRENCY || "INR",
      receipt: `course_${courseId}_${Date.now()}`,
      notes: {
        courseId: courseId.toString(),
        userId: userId.toString(),
        courseTitle: course.title,
      },
    };

    // Create Razorpay order
    const order = await razorpayInstance.orders.create(options);

    return res.status(200).json({
      success: true,
      message: "Razorpay order created successfully",
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        courseId: course._id,
        courseTitle: course.title,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("Create Razorpay Order Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create Razorpay order",
      error: error.message,
    });
  }
};

// ===================== VERIFY RAZORPAY PAYMENT =====================

export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = req.body;

    // Validate required fields
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !courseId
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment verification data is incomplete",
      });
    }

    const userId = req.user._id;

    // Find user
    const user = await User.findById(userId);

    if (!user) { 
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Find course
    const course = await Course.findById(courseId);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // ============================
    // VERIFY RAZORPAY SIGNATURE
    // ============================

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    const isSignatureValid = crypto.timingSafeEqual(
      Buffer.from(generatedSignature),
      Buffer.from(razorpay_signature)
    );

    if (!isSignatureValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    // ============================
    // DUPLICATE PURCHASE CHECK
    // ============================

    const alreadyPurchased = user.purchasedCourses.some(
      (pc) => pc.course && pc.course.toString() === courseId
    );

    if (alreadyPurchased) {
      return res.status(200).json({
        success: true,
        message: "Course already purchased",
      });
    }

    // ============================
    // VERIFY ORDER FROM RAZORPAY
    // ============================

    const orderInfo = await razorpayInstance.orders.fetch(
      razorpay_order_id
    );

    if (!orderInfo) {
      return res.status(400).json({
        success: false,
        message: "Razorpay order not found",
      });
    }

    // Make sure order belongs to this course/user
    if (
      orderInfo.notes?.courseId &&
      orderInfo.notes.courseId !== courseId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Course does not match the payment order",
      });
    }

    if (
      orderInfo.notes?.userId &&
      orderInfo.notes.userId !== userId.toString()
    ) {
      return res.status(400).json({
        success: false,
        message: "Payment user does not match",
      });
    }

    // Verify amount
    const expectedAmount = Math.round(course.price * 100);

    if (Number(orderInfo.amount) !== expectedAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment amount does not match course price",
      });
    }

    // ============================
    // FETCH PAYMENT
    // ============================

    const paymentInfo = await razorpayInstance.payments.fetch(
      razorpay_payment_id
    );

    if (!paymentInfo) {
      return res.status(400).json({
        success: false,
        message: "Payment not found",
      });
    }

    // Payment should be captured
    if (
      paymentInfo.status !== "captured" &&
      paymentInfo.status !== "authorized"
    ) {
      return res.status(400).json({
        success: false,
        message: `Payment is not successful. Current status: ${paymentInfo.status}`,
      });
    }

    // ============================
    // ENROLL USER
    // ============================

    user.purchasedCourses.push({
      course: courseId,
      purchasedAt: new Date(),
      progress: 0,
      completedLessons: [],
      stripeSessionId: "",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    await user.save();

    // ============================
    // INCREASE ENROLLMENT COUNT
    // ============================

    await Course.findByIdAndUpdate(courseId, {
      $inc: { enrolledCount: 1 },
    });

    return res.status(200).json({
      success: true,
      message: "Payment successful and course enrolled",
      data: {
        courseId,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      },
    });
  } catch (error) {
    console.error("Verify Razorpay Payment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

// ===================== GET MY PURCHASED COURSES =====================

export const getMyPurchasedCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
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

    const courses = user.purchasedCourses
      .filter((pc) => pc.course)
      .map((pc) => ({
        _id: pc.course._id,
        title: pc.course.title,
        shortDescription: pc.course.shortDescription,
        thumbnail: pc.course.thumbnail,
        category: pc.course.category,
        instructor: pc.course.instructor,
        duration: pc.course.duration,

        totalLessons:
          pc.course.modules?.reduce(
            (s, m) => s + m.lessons.length,
            0
          ) || 0,

        completedLessons: pc.completedLessons?.length || 0,

        progress: pc.progress || 0,

        purchasedAt: pc.purchasedAt,

        razorpayOrderId: pc.razorpayOrderId || "",
        razorpayPaymentId: pc.razorpayPaymentId || "",
      }));

    return res.status(200).json({
      success: true,
      data: courses,
    });
  } catch (error) {
    console.error("Get Purchased Courses Error:", error);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ===================== COURSE CRUD =====================

export const createCourse = async (req, res) => {
  try {
    const courseData = req.body;

    if (typeof courseData.outcomes === "string") {
      courseData.outcomes = JSON.parse(courseData.outcomes);
    }

    if (typeof courseData.requirements === "string") {
      courseData.requirements = JSON.parse(courseData.requirements);
    }

    if (typeof courseData.features === "string") {
      courseData.features = JSON.parse(courseData.features);
    }

    if (typeof courseData.modules === "string") {
      courseData.modules = JSON.parse(courseData.modules);
    }

    // Auto calculate total lessons
    if (Array.isArray(courseData.modules)) {
      courseData.totalLessons = courseData.modules.reduce(
        (s, m) => s + (m.lessons?.length || 0),
        0
      );
    }

    // Handle array fields from FormData
    if (req.body["outcomes[]"]) {
      courseData.outcomes = Array.isArray(req.body["outcomes[]"])
        ? req.body["outcomes[]"]
        : [req.body["outcomes[]"]];
    }

    if (req.body["requirements[]"]) {
      courseData.requirements = Array.isArray(
        req.body["requirements[]"]
      )
        ? req.body["requirements[]"]
        : [req.body["requirements[]"]];
    }

    if (req.body["features[]"]) {
      courseData.features = Array.isArray(req.body["features[]"])
        ? req.body["features[]"]
        : [req.body["features[]"]];
    }

    // Upload thumbnail
    if (req.file) {
      const base64 = req.file.buffer.toString("base64");

      const uploaded = await getImageKit().files.upload({
        file: base64,
        fileName: `thumbnail_${Date.now()}_${req.file.originalname}`,
        folder: "/course-thumbnails",
      });

      courseData.thumbnail = uploaded.url;
    }

    const newCourse = await Course.create(courseData);

    return res.status(201).json({
      success: true,
      message: "Course created successfully!",
      data: newCourse,
    });
  } catch (error) {
    console.error("Create Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create course",
      error: error.message,
    });
  }
};

// ===================== GET ALL COURSES =====================

export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: courses.length,
      data: courses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch courses",
      error: error.message,
    });
  }
};

// ===================== GET COURSE BY ID =====================

export const getCourseById = async (req, res) => {
  try {
    const mongoose = await import("mongoose");

    if (!mongoose.default.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: course,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch course details",
      error: error.message,
    });
  }
};

// ===================== UPDATE COURSE =====================

export const updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const updateData = req.body;

    if (typeof updateData.outcomes === "string") {
      updateData.outcomes = JSON.parse(updateData.outcomes);
    }

    if (typeof updateData.requirements === "string") {
      updateData.requirements = JSON.parse(updateData.requirements);
    }

    if (typeof updateData.features === "string") {
      updateData.features = JSON.parse(updateData.features);
    }

    if (typeof updateData.modules === "string") {
      updateData.modules = JSON.parse(updateData.modules);
    }

    // Auto calculate total lessons
    if (Array.isArray(updateData.modules)) {
      updateData.totalLessons = updateData.modules.reduce(
        (s, m) => s + (m.lessons?.length || 0),
        0
      );
    }

    if (req.body["outcomes[]"]) {
      updateData.outcomes = Array.isArray(req.body["outcomes[]"])
        ? req.body["outcomes[]"]
        : [req.body["outcomes[]"]];
    }

    if (req.body["requirements[]"]) {
      updateData.requirements = Array.isArray(
        req.body["requirements[]"]
      )
        ? req.body["requirements[]"]
        : [req.body["requirements[]"]];
    }

    if (req.body["features[]"]) {
      updateData.features = Array.isArray(req.body["features[]"])
        ? req.body["features[]"]
        : [req.body["features[]"]];
    }

    // Upload new thumbnail
    if (req.file) {
      const base64 = req.file.buffer.toString("base64");

      const uploaded = await getImageKit().files.upload({
        file: base64,
        fileName: `thumbnail_${Date.now()}_${req.file.originalname}`,
        folder: "/course-thumbnails",
      });

      updateData.thumbnail = uploaded.url;
    }

    const updatedCourse = await Course.findByIdAndUpdate(
      courseId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found to update",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course updated successfully!",
      data: updatedCourse,
    });
  } catch (error) {
    console.error("Update Course Error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update course",
      error: error.message,
    });
  }
};

// ===================== DELETE COURSE =====================

export const deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);

    if (!deletedCourse) {
      return res.status(404).json({
        success: false,
        message: "Course not found to delete",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Course deleted successfully!",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to delete course",
      error: error.message,
    });
  }
};

// ===================== MODULES =====================

export const addModule = async (req, res) => {
  try {
    const { title, order } = req.body;

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    course.modules.push({
      title,
      order: order || course.modules.length,
    });

    await course.save();

    return res.status(201).json({
      success: true,
      data: course.modules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const mod = course.modules.id(req.params.moduleId);

    if (!mod) {
      return res.status(404).json({
        message: "Module not found",
      });
    }

    mod.title = req.body.title || mod.title;
    mod.order = req.body.order ?? mod.order;

    await course.save();

    return res.json({
      success: true,
      data: course.modules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    course.modules = course.modules.filter(
      (m) => m._id.toString() !== req.params.moduleId
    );

    course.totalLessons = course.modules.reduce(
      (s, m) => s + m.lessons.length,
      0
    );

    await course.save();

    return res.json({
      success: true,
      data: course.modules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===================== LESSONS =====================

export const addLesson = async (req, res) => {
  try {
    const {
      title,
      videoUrl,
      videoType,
      duration,
      isFree,
    } = req.body;

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const mod = course.modules.id(req.params.moduleId);

    if (!mod) {
      return res.status(404).json({
        message: "Module not found",
      });
    }

    mod.lessons.push({
      title,
      videoUrl,
      videoType: videoType || "youtube",
      duration,
      isFree: isFree || false,
      order: mod.lessons.length,
    });

    course.totalLessons = course.modules.reduce(
      (s, m) => s + m.lessons.length,
      0
    );

    await course.save();

    return res.status(201).json({
      success: true,
      data: course.modules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const mod = course.modules.id(req.params.moduleId);
    const lesson = mod?.lessons.id(req.params.lessonId);

    if (!lesson) {
      return res.status(404).json({
        message: "Lesson not found",
      });
    }

    Object.assign(lesson, req.body);

    await course.save();

    return res.json({
      success: true,
      data: course.modules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        message: "Course not found",
      });
    }

    const mod = course.modules.id(req.params.moduleId);

    if (!mod) {
      return res.status(404).json({
        message: "Module not found",
      });
    }

    mod.lessons = mod.lessons.filter(
      (l) => l._id.toString() !== req.params.lessonId
    );

    course.totalLessons = course.modules.reduce(
      (s, m) => s + m.lessons.length,
      0
    );

    await course.save();

    return res.json({
      success: true,
      data: course.modules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ===================== ADMIN STATS =====================

export const getAdminStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();

    const publishedCourses = await Course.countDocuments({
      status: "Published",
    });

    const totalStudents = await User.countDocuments();

    const totalEnrollments = await User.aggregate([
      {
        $project: {
          count: {
            $size: {
              $ifNull: ["$purchasedCourses", []],
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$count",
          },
        },
      },
    ]);

    return res.json({
      success: true,
      data: {
        totalCourses,
        publishedCourses,
        totalStudents,
        totalEnrollments: totalEnrollments[0]?.total || 0,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};