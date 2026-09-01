import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import connectDB from "../config/db.js";

import User from "../modules/auth/auth.model.js";

dotenv.config();

export const createAdmin = async () => {
  try {
    await connectDB();

    const adminData = {
     

      name: "Shah Alam",
      email: "rahuldigicampus@12.com",
      password: "rahul123",
      role: "admin",
    };

    const existingAdmin = await User.findOne({
      email: adminData.email,
    });

    if (existingAdmin) {
      console.log("⚠️ Admin already exists:", existingAdmin.email);
      process.exit(0);
    }

    // 🔥 HASH PASSWORD
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    const admin = await User.create({
      ...adminData,
      password: hashedPassword,
    });

    console.log("✅ Admin created successfully!");
    console.log("📧 Email:", admin.email);
    console.log("🔐 Password:", adminData.password);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

createAdmin();