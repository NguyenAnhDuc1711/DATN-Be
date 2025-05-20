import express from "express";
import {
  changePassword,
  checkValidUser,
  followUser,
  getAdminAccount,
  getUserIdFromEmail,
  getUserProfile,
  getUsersFollow,
  getUsersToTag,
  getUserToFollows,
  handleCrawlFakeUsers,
  loginUser,
  logoutUser,
  signupUser,
  updateUser,
  getUsersPendingPost,
  getUsersWithStatus,
  validateEmailByCode,
} from "../controllers/user.controller.js";
import { USER_PATH } from "../../Breads-Shared/APIConfig.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();
const {
  ADMIN,
  PROFILE,
  USERS_TO_FOLLOW,
  SIGN_UP,
  LOGIN,
  LOGOUT,
  FOLLOW,
  UPDATE,
  CHANGE_PW,
  CRAWL_USER,
  USERS_FOLLOW,
  USERS_TO_TAG,
  CHECK_VALID_USER,
  GET_USER_ID_FROM_EMAIL,
  GET_USERS_PENDING_POST,
  GET_USERS_WITH_STATUS,
  VALIDATE_USER_EMAIL,
} = USER_PATH;

router.get(USERS_FOLLOW, getUsersFollow);
router.get(ADMIN, getAdminAccount);
router.get(PROFILE + ":userId", getUserProfile);
router.get(USERS_TO_FOLLOW, getUserToFollows);
router.get(USERS_TO_TAG, protectRoute, getUsersToTag);
router.get(GET_USERS_WITH_STATUS, getUsersWithStatus);
router.post(GET_USERS_PENDING_POST, getUsersPendingPost);
router.post(SIGN_UP, signupUser);
router.post(LOGIN, loginUser);
router.post(LOGOUT, logoutUser);
router.put(FOLLOW, protectRoute, followUser);
router.put(UPDATE + ":id", protectRoute, updateUser);
router.put(CHANGE_PW + ":id", changePassword);
router.post(CRAWL_USER, handleCrawlFakeUsers);
router.post(CHECK_VALID_USER, checkValidUser);
router.post(GET_USER_ID_FROM_EMAIL, getUserIdFromEmail);
router.post(VALIDATE_USER_EMAIL, validateEmailByCode);

export default router;
