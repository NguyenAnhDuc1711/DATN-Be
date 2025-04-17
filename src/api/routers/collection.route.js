import express from "express";
import {
  addPostToCollection,
  getUserCollection,
  removePostFromCollection,
} from "../controllers/collection.controller.js";
// import protectRoute from "../middlewares/protectRoute.js";
import { COLLECTION_PATH } from "../../Breads-Shared/APIConfig.js";

const router = express.Router();
const { ADD, REMOVE } = COLLECTION_PATH;

router.get("/:userId", getUserCollection);
router.patch(ADD, addPostToCollection);
router.patch(REMOVE, removePostFromCollection);

export default router;
