import express from "express";
import { POST_PATH } from "../../Breads-Shared/APIConfig.js";
import {
  createPost,
  deletePost,
  getPost,
  getPosts,
  likeUnlikePost,
  tickPostSurvey,
  updatePost,
  updatePostStatus,
} from "../controllers/post.controller.js";
import { crawlPosts } from "../crawl.js";
import protectRoute from "../middlewares/protectRoute.js";
import Post from "../models/post.model.js";

const router = express.Router();
const {
  GET_ALL,
  CREATE,
  UPDATE,
  LIKE,
  TICK_SURVEY,
  CRAWL_POST,
  UPDATE_POST_STATUS,
} = POST_PATH;

router.get(GET_ALL, getPosts);
router.get("/:id", getPost);
router.post(CREATE, createPost);
router.delete("/:id", deletePost);
router.put(UPDATE, updatePost);
router.post(LIKE + ":id", protectRoute, likeUnlikePost);
router.put(TICK_SURVEY, tickPostSurvey);
router.post(CRAWL_POST, crawlPosts);
router.post(UPDATE_POST_STATUS, updatePostStatus);
router.post("/update-post-status", async (req, res) => {
  try {
    await Post.updateMany(
      {},
      {
        status: 1,
      }
    );
    res.status(200).json("OK");
  } catch (err) {
    console.log(err);
    res.status(500).json(err);
  }
});

export default router;
