import HTTPStatus from "../../util/httpStatus.js";
import { ObjectId, destructObjectId } from "../../util/index.js";
import { genConversations, genMsgsInConversations } from "../crawl.js";
import Conversation from "../models/conversation.model.js";
import Link from "../models/link.model.js";
import Message from "../models/message.model.js";
import { getConversationInfo } from "../services/message.js";
import { Document } from "mongoose";

export const getConversationByUsersId = async (req, res) => {
  try {
    const { userId, anotherId } = req.body;
    if (!userId || !anotherId) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "Empty payload" });
    }
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
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const { conversationId, userId } = req.query;
    if (!conversationId) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "Empty conversationId" });
    }
    const data = await getConversationInfo({ conversationId, userId });
    if (!!data) {
      return res.status(HTTPStatus.OK).json(data);
    } else {
      return res
        .status(HTTPStatus.NOT_FOUND)
        .json({ error: "Invalid conversation" });
    }
  } catch (err) {
    console.log("getConversationById: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const getConversationMedia = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "Empty conversationId" });
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
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const getConversationFiles = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "Empty conversationId" });
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
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const getConversationLinks = async (req, res) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "Empty conversationId" });
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
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

// Add this interface before the searchMsg function
interface MessageWithScore {
  content: string;
  conversationId: any;
  createdAt: Date;
  relevanceScore: number;
  [key: string]: any;
}

export const searchMsg = async (req, res) => {
  try {
    const { value, conversationId, page, limit } = req.body;
    if (!value || !conversationId) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "Empty payload" });
    }

    console.log("search value: ", value);
    const skip = (page - 1) * limit;

    // Create search terms
    const searchTerms = value.trim().toLowerCase().split(/\s+/);
    const searchTermRegexes = searchTerms.map((term) => new RegExp(term, "i"));

    // Create an array of search criteria to improve matching
    const searchQuery = {
      conversationId: ObjectId(conversationId),
      isRetrieve: false,
      $or: [
        { content: { $regex: value, $options: "i" } }, // Exact phrase match
        { content: { $regex: searchTerms.join("|"), $options: "i" } }, // Any word match
        // Add substring matching patterns for each search term
        ...searchTerms
          .filter((term) => term.length > 2)
          .map((term) => ({
            content: { $regex: term.split("").join("\\s*"), $options: "i" }, // Flexible spacing match
          })),
      ],
    };

    // Using text score for relevance sorting when available
    const msgsFind = await Message.find(searchQuery)
      .sort({
        // Sort by creation date as a secondary sort criteria
        createdAt: -1,
      })
      .skip(skip)
      .limit(limit);

    // Add a relevance score to each result
    const results: MessageWithScore[] = msgsFind.map((msg) => {
      // Calculate a simple relevance score
      let relevanceScore = 0;
      const content = (msg.content || "").toLowerCase();

      // 1. Exact full match gets highest score
      if (content.includes(value.toLowerCase())) {
        relevanceScore += 15;
      }

      // 2. Calculate score based on number of matching terms
      searchTerms.forEach((term) => {
        if (term.length <= 2) return; // Skip very short terms

        // Full word match
        if (content.includes(term)) {
          relevanceScore += 5;

          // Additional points if it's at the beginning of a word
          const wordBoundaryRegex = new RegExp(`\\b${term}`, "i");
          if (wordBoundaryRegex.test(content)) {
            relevanceScore += 3;
          }
        }

        // Partial word match (for longer terms)
        if (term.length > 3) {
          // Check if the content contains at least 70% of the search term characters in sequence
          const partialMatch = term.length * 0.7;
          for (let i = 0; i <= term.length - partialMatch; i++) {
            const subTerm = term.substring(i, i + Math.ceil(partialMatch));
            if (content.includes(subTerm)) {
              relevanceScore += 2;
              break;
            }
          }
        }
      });

      // 3. Bonus points for shorter messages that match (higher density)
      if (relevanceScore > 0 && content.length < 200) {
        relevanceScore += 2;
      }

      // Convert to plain object and add score
      const msgObj = msg.toObject
        ? msg.toObject()
        : JSON.parse(JSON.stringify(msg));
      return {
        ...msgObj,
        relevanceScore,
      };
    });

    // Sort by relevance score then by date
    results.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    res.status(HTTPStatus.OK).json(results);
  } catch (err) {
    console.log("searchMsg error: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const handleFakeConversations = async (req, res) => {
  try {
    const { userId, numberConversations } = req.body;
    await genConversations(userId, numberConversations);
    res.status(HTTPStatus.OK).json("OK");
  } catch (err) {
    console.log(err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const handleFakeConversationsMsgs = async (req, res) => {
  try {
    await genMsgsInConversations();
    res.status(HTTPStatus.OK).json("OK");
  } catch (err) {
    console.log(err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};
