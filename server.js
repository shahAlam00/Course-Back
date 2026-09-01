import mongoose from "mongoose";
import app from "./app.js";
// import {createAdmin} from "./utils/createAdmin.js";
const PORT = process.env.PORT || 5000;

// createAdmin();
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected Successfully");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    process.exit(1);
  }
};

startServer();