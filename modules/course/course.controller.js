import Course from "./course.model.js";
import User from "../auth/auth.model.js";
import ImageKit from "@imagekit/nodejs";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const getImageKit = () =>
  new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });

// ===================== STRIPE =====================

export const createCheckoutSession = async (req, res) => {
  try {
    const { courseId, courseName, price } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: { name: courseName },
            unit_amount: price * 100,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5173"}/courses`,
      metadata: {
        courseId: courseId || "",
        userId: req.user._id.toString(),
      },
    });

    res.json({ id: session.id, url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Stripe Webhook - Payment verify karke course enroll karo
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { courseId, userId } = session.metadata;

    if (courseId && userId) {
      await enrollUserInCourse(userId, courseId, session.id);
    }
  }

  res.json({ received: true });
};

// Verify session aur enroll karo (success page ke liye)
export const verifyAndEnroll = async (req, res) => {
  try {
    const { sessionId } = req.body;

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ message: "Payment not completed" });
    }

    const { courseId, userId } = session.metadata;

    if (!courseId || !userId) {
      return res.status(400).json({ message: "Invalid session metadata" });
    }

    // Verify karo ki logged in user hi hai
    if (userId !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    await enrollUserInCourse(userId, courseId, sessionId);

    res.json({ success: true, message: "Enrolled successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

async function enrollUserInCourse(userId, courseId, sessionId) {
  const user = await User.findById(userId);
  if (!user) return;

  const alreadyEnrolled = user.purchasedCourses.some(
    (pc) => pc.course.toString() === courseId
  );

  if (!alreadyEnrolled) {
    user.purchasedCourses.push({
      course: courseId,
      stripeSessionId: sessionId,
      progress: 0,
      completedLessons: [],
    });
    await user.save();

    // Enrolled count badhao
    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
  }
}

// Get My Purchased Courses
export const getMyPurchasedCourses = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: "purchasedCourses.course",
      select: "title shortDescription thumbnail category instructor duration totalLessons modules",
    });

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
        totalLessons: pc.course.modules?.reduce((s, m) => s + m.lessons.length, 0) || 0,
        completedLessons: pc.completedLessons?.length || 0,
        progress: pc.progress || 0,
        purchasedAt: pc.purchasedAt,
      }));

    res.status(200).json({ success: true, data: courses });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// ===================== COURSE CRUD =====================

export const createCourse = async (req, res) => {
  try {
    const courseData = req.body;

    if (typeof courseData.outcomes === "string") courseData.outcomes = JSON.parse(courseData.outcomes);
    if (typeof courseData.requirements === "string") courseData.requirements = JSON.parse(courseData.requirements);
    if (typeof courseData.features === "string") courseData.features = JSON.parse(courseData.features);
    if (typeof courseData.modules === "string") courseData.modules = JSON.parse(courseData.modules);

    // Auto-calculate totalLessons from modules
    if (Array.isArray(courseData.modules)) {
      courseData.totalLessons = courseData.modules.reduce((s, m) => s + (m.lessons?.length || 0), 0);
    }

    // outcomes[] array format handle karo
    if (req.body["outcomes[]"]) {
      courseData.outcomes = Array.isArray(req.body["outcomes[]"]) ? req.body["outcomes[]"] : [req.body["outcomes[]"]];
    }
    if (req.body["requirements[]"]) {
      courseData.requirements = Array.isArray(req.body["requirements[]"]) ? req.body["requirements[]"] : [req.body["requirements[]"]];
    }
    if (req.body["features[]"]) {
      courseData.features = Array.isArray(req.body["features[]"]) ? req.body["features[]"] : [req.body["features[]"]];
    }

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

    res.status(201).json({
      success: true,
      message: "Course created successfully!",
      data: newCourse,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to create course", error: error.message });
  }
};

export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: courses.length, data: courses });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch courses", error: error.message });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const mongoose = await import("mongoose");
    if (!mongoose.default.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: "Course not found" });
    res.status(200).json({ success: true, data: course });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch course details", error: error.message });
  }
};

export const updateCourse = async (req, res) => {
  try {
    const courseId = req.params.id;
    const updateData = req.body;

    if (typeof updateData.outcomes === "string") updateData.outcomes = JSON.parse(updateData.outcomes);
    if (typeof updateData.requirements === "string") updateData.requirements = JSON.parse(updateData.requirements);
    if (typeof updateData.modules === "string") updateData.modules = JSON.parse(updateData.modules);

    // Auto-calculate totalLessons from modules
    if (Array.isArray(updateData.modules)) {
      updateData.totalLessons = updateData.modules.reduce((s, m) => s + (m.lessons?.length || 0), 0);
    }

    if (req.body["outcomes[]"]) {
      updateData.outcomes = Array.isArray(req.body["outcomes[]"]) ? req.body["outcomes[]"] : [req.body["outcomes[]"]];
    }
    if (req.body["requirements[]"]) {
      updateData.requirements = Array.isArray(req.body["requirements[]"]) ? req.body["requirements[]"] : [req.body["requirements[]"]];
    }

    if (req.file) {
      const base64 = req.file.buffer.toString("base64");
      const uploaded = await getImageKit().files.upload({
        file: base64,
        fileName: `thumbnail_${Date.now()}_${req.file.originalname}`,
        folder: "/course-thumbnails",
      });
      updateData.thumbnail = uploaded.url;
    }

    const updatedCourse = await Course.findByIdAndUpdate(courseId, { $set: updateData }, { new: true, runValidators: true });

    if (!updatedCourse) return res.status(404).json({ success: false, message: "Course not found to update" });

    res.status(200).json({ success: true, message: "Course updated successfully!", data: updatedCourse });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update course", error: error.message });
  }
};

export const deleteCourse = async (req, res) => {
  try {
    const deletedCourse = await Course.findByIdAndDelete(req.params.id);
    if (!deletedCourse) return res.status(404).json({ success: false, message: "Course not found to delete" });
    res.status(200).json({ success: true, message: "Course deleted successfully!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to delete course", error: error.message });
  }
};

// ===================== MODULES & LESSONS =====================

export const addModule = async (req, res) => {
  try {
    const { title, order } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    course.modules.push({ title, order: order || course.modules.length });
    await course.save();

    res.status(201).json({ success: true, data: course.modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    const mod = course.modules.id(req.params.moduleId);
    if (!mod) return res.status(404).json({ message: "Module not found" });

    mod.title = req.body.title || mod.title;
    mod.order = req.body.order ?? mod.order;
    await course.save();

    res.json({ success: true, data: course.modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteModule = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    course.modules = course.modules.filter((m) => m._id.toString() !== req.params.moduleId);
    await course.save();
    res.json({ success: true, data: course.modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addLesson = async (req, res) => {
  try {
    const { title, videoUrl, videoType, duration, isFree } = req.body;
    const course = await Course.findById(req.params.id);
    const mod = course.modules.id(req.params.moduleId);
    if (!mod) return res.status(404).json({ message: "Module not found" });

    mod.lessons.push({ title, videoUrl, videoType: videoType || "youtube", duration, isFree: isFree || false, order: mod.lessons.length });

    // Total lessons update karo
    course.totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);
    await course.save();

    res.status(201).json({ success: true, data: course.modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    const mod = course.modules.id(req.params.moduleId);
    const lesson = mod?.lessons.id(req.params.lessonId);
    if (!lesson) return res.status(404).json({ message: "Lesson not found" });

    Object.assign(lesson, req.body);
    await course.save();

    res.json({ success: true, data: course.modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    const mod = course.modules.id(req.params.moduleId);
    if (!mod) return res.status(404).json({ message: "Module not found" });

    mod.lessons = mod.lessons.filter((l) => l._id.toString() !== req.params.lessonId);
    course.totalLessons = course.modules.reduce((s, m) => s + m.lessons.length, 0);
    await course.save();

    res.json({ success: true, data: course.modules });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Admin Stats
export const getAdminStats = async (req, res) => {
  try {
    const totalCourses = await Course.countDocuments();
    const publishedCourses = await Course.countDocuments({ status: "Published" });
    const totalStudents = await User.countDocuments();
    const totalEnrollments = await User.aggregate([
      { $project: { count: { $size: "$purchasedCourses" } } },
      { $group: { _id: null, total: { $sum: "$count" } } },
    ]);

    res.json({
      success: true,
      data: {
        totalCourses,
        publishedCourses,
        totalStudents,
        totalEnrollments: totalEnrollments[0]?.total || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};