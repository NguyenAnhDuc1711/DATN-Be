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

router.post(GET_CONVERSATION_BY_USERS_ID, getConversationByUsersId);
router.get(GET_CONVERSATION_BY_ID, getConversationById);
router.post(GET_CONVERSATION_MEDIA, getConversationMedia);
router.post(GET_CONVERSATION_FILES, getConversationFiles);
router.post(GET_CONVERSATION_LINKS, getConversationLinks);
router.post(SEARCH, searchMsg);
router.post(FAKE_CONVERSATIONS, handleFakeConversations);
router.post(FAKE_CONVERSATIONS_MSGS, handleFakeConversationsMsgs);

export default router;
