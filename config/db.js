import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(process.env.MONGO_URI);
    console.log("✅ Database connected");
  } catch (error) {
    console.log("❌ DB ERROR:", error.message);
    throw error;
  }
};

export default connectDB;