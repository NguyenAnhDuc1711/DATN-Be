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

router.get(REPORT_PATH.GET, protectRoute, getReports);
router.post(REPORT_PATH.CREATE, protectRoute, sendReport);
router.post(REPORT_PATH.RESPONSE, protectRoute, responseReport);
router.post(REPORT_PATH.REJECT, protectRoute, rejectReport);

export default router;
