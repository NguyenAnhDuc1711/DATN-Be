import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import connectDB from "./api/db/connectDB.js";
import {
  createDailyCollectionCron,
  updateUsersCatesCron,
} from "./cronjob/index.js";
import router from "./api/routers/index.js";

// Connect to MongoDB
connectDB();

const app = express();

app.use(express.json({ limit: "50mb" })); // to prase  Json data in the req.body
app.use(express.urlencoded({ extended: false })); // to prase from data in the req.body
app.use(cookieParser());
app.use(helmet());
const corOption = {
  origin: "http://localhost:3000",
  methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  preflightContinue: false,
  optionsSuccessStatus: 204,
  credentials: true,
};
app.use(cors(corOption));

app.use("/api", router);

// createDailyCollectionCron();
// updateUsersCatesCron();

export default app;
