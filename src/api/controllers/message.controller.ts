import { ObjectId, destructObjectId } from "../../util/index.js";
import HTTPStatus from "../../util/httpStatus.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import Link from "../models/link.model.js";
import { genConversations, genMsgsInConversations } from "../crawl.js";
import { getConversationInfo } from "../services/message.js";

export const getConversationByUsersId = async (req, res) => {
  try {
    const { userId, anotherId } = req.body;
    const data = await Conversation.findOne({
      participants: { $all: [userId, anotherId] },
    })
      .populate({
        path: "participants",
        select: "_id username avatar",
      })
      .populate({
        path: "lastMsgId",
        select: "_id content media files sender createdAt",
      })
      .lean();
    if (!!data) {
      const result = JSON.parse(JSON.stringify(data));
      const participant = result.participants.filter(
        ({ _id }) => destructObjectId(_id) !== userId
      );
      result.participant = participant[0];
      result.lastMsg = result.lastMsgId;
      delete result.participants;
      delete result.lastMsgId;
      return res.status(HTTPStatus.OK).json(result);
    } else {
      const newConversation = new Conversation({
        participants: [ObjectId(userId), ObjectId(anotherId)],
      });
      const result = await newConversation.save();
      return res.status(HTTPStatus.CREATED).json(result);
    }
  } catch (err) {
    console.log("getConversationByUsersId: ", err.message);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const getConversationById = async (req, res) => {
  try {
    const { conversationId, userId } = req.query;
    if (!conversationId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty conversationId");
    }
    const data = await getConversationInfo({ conversationId, userId });
    if (!!data) {
      return res.status(HTTPStatus.OK).json(data);
    } else {
      return res.status(HTTPStatus.NOT_FOUND).json("Invalid conversation");
    }
  } catch (err) {
    console.log("getConversationById: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const getConversationMedia = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty conversationId");
    }
    const msgs = await Message.find({
      conversationId: ObjectId(conversationId),
      media: {
        $gt: {
          $size: 0,
        },
      },
    });
    const media = [];
    msgs?.forEach((msg) => {
      media.push(...msg?.media);
    });
    res.status(HTTPStatus.OK).json(media);
  } catch (err) {
    console.log("getConversationMedia: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const getConversationFiles = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty conversationId");
    }
    const msgs = await Message.aggregate([
      {
        $match: {
          conversationId: ObjectId(conversationId),
          file: {
            $exists: true,
          },
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "file",
          foreignField: "_id",
          as: "fileInfo",
        },
      },
      {
        $unwind: "$fileInfo",
      },
      {
        $project: {
          fileInfo: 1,
        },
      },
    ]);
    const files = msgs?.map((msg) => msg?.fileInfo);
    res.status(HTTPStatus.OK).json(files);
  } catch (err) {
    console.log("getConversationFiles: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const getConversationLinks = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty conversationId");
    }
    const msgWithLinks = await Message.aggregate([
      {
        $match: {
          conversationId: ObjectId(conversationId),
          "links.0": { $exists: true },
        },
      },
    ]);
    const linksId = [];
    msgWithLinks?.forEach((msg) => {
      linksId.push(...msg?.links);
    });
    const linksInfo = await Link.find({
      _id: {
        $in: linksId,
      },
    });
    res.status(HTTPStatus.OK).json(linksInfo);
  } catch (err) {
    console.log("getConversationLinks: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const searchMsg = async (req, res) => {
  try {
    const { value, conversationId, page, limit } = req.body;
    if (!value || !conversationId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty payload");
    }
    const skip = (page - 1) * limit;
    const msgsFind = await Message.find({
      conversationId: ObjectId(conversationId),
      content: { $regex: value, $options: "i" },
      isRetrieve: false,
    })
      .sort({
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);
    res.status(HTTPStatus.OK).json(msgsFind);
  } catch (err) {
    console.log("getConversationLinks: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const handleFakeConversations = async (req, res) => {
  try {
    const { userId, numberConversations } = req.body;
    await genConversations(userId, numberConversations);
    res.status(HTTPStatus.OK).json("OK");
  } catch (err) {
    console.log(err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const handleFakeConversationsMsgs = async (req, res) => {
  try {
    await genMsgsInConversations();
    res.status(HTTPStatus.OK).json("OK");
  } catch (err) {
    console.log(err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};
