import express from "express";
import { REPORT_PATH } from "../../Breads-Shared/APIConfig";
import {
  getReports,
  rejectReport,
  responseReport,
  sendReport,
} from "../controllers/report.controller";
import protectRoute from "../middlewares/protectRoute";

const router = express.Router();

router.get(REPORT_PATH.GET, getReports);
router.post(REPORT_PATH.CREATE, protectRoute, sendReport);
router.post(REPORT_PATH.RESPONSE, responseReport);
router.post(REPORT_PATH.REJECT, rejectReport);

export default router;
