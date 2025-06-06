import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // tls: true,
      tlsAllowInvalidCertificates: true,
      tlsAllowInvalidHostnames: true,
    });
    console.log("Connect success");
  } catch (error) {
    console.log("Connect failed");
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
