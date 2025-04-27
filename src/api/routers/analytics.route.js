import express from "express";
import { ANALYTICS_PATH } from "../../Breads-Shared/APIConfig.js";
import { createEvent, getEvents } from "../controllers/analytics.controller.js";

const router = express.Router();

const { CREATE, GET } = ANALYTICS_PATH;

router.post(CREATE, createEvent);
router.post(GET, getEvents);

export default router;
