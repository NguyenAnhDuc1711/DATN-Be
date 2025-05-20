import express from "express";
import { MESSAGE_PATH } from "../../Breads-Shared/APIConfig.js";
import {
  getConversationById,
  getConversationByUsersId,
  getConversationFiles,
  getConversationLinks,
  getConversationMedia,
  searchMsg,
  handleFakeConversations,
  handleFakeConversationsMsgs,
} from "../controllers/message.controller.js";
import protectRoute from "../middlewares/protectRoute.js";

const router = express.Router();
const {
  GET_CONVERSATION_BY_USERS_ID,
  GET_CONVERSATION_BY_ID,
  GET_CONVERSATION_MEDIA,
  GET_CONVERSATION_FILES,
  GET_CONVERSATION_LINKS,
  SEARCH,
  FAKE_CONVERSATIONS,
  FAKE_CONVERSATIONS_MSGS,
} = MESSAGE_PATH;

router.post(
  GET_CONVERSATION_BY_USERS_ID,
  protectRoute,
  getConversationByUsersId
);
router.get(GET_CONVERSATION_BY_ID, protectRoute, getConversationById);
router.post(GET_CONVERSATION_MEDIA, protectRoute, getConversationMedia);
router.post(GET_CONVERSATION_FILES, protectRoute, getConversationFiles);
router.post(GET_CONVERSATION_LINKS, protectRoute, getConversationLinks);
router.post(SEARCH, protectRoute, searchMsg);
router.post(FAKE_CONVERSATIONS, protectRoute, handleFakeConversations);
router.post(FAKE_CONVERSATIONS_MSGS, protectRoute, handleFakeConversationsMsgs);

export default router;
