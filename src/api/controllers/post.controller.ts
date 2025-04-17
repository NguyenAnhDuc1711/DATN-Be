import { Constants } from "../../Breads-Shared/Constants/index.js";
import PostConstants from "../../Breads-Shared/Constants/PostConstants.js";
import HTTPStatus from "../../util/httpStatus.js";
import { ObjectId } from "../../util/index.js";
import Category from "../models/category.model.js";
import Link from "../models/link.model.js";
import Post from "../models/post.model.js";
import SurveyOption from "../models/surveyOption.model.js";
import User from "../models/user.model.js";
import {
  getPostDetail,
  getPostsIdByFilter,
  handleReplyForParentPost,
} from "../services/post.js";
import { uploadFileFromBase64 } from "../utils/index.js";
import axios from "axios";

//create post
export const createPost = async (req, res) => {
  try {
    const payload = req.body;
    const action = req.query.action;
    const {
      _id,
      authorId,
      content,
      media,
      parentPost,
      survey,
      quote,
      type,
      usersTag,
      links,
      files,
    } = payload;
    const user = await User.findById(authorId);
    if (!user) {
      return res.status(HTTPStatus.NOT_FOUND).json({ error: "User not found" });
    }
    if (
      !content.trim() &&
      !media?.[0]?.url &&
      !survey.length &&
      !parentPost &&
      !quote?._id &&
      !files?.length
    ) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "Cannot create post without payload" });
    }
    const maxLength = 500;
    if (content.length > maxLength) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: `Text must be less than ${maxLength} characters` });
    }
    let newMedia = [];
    if (media.length) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      for (let fileInfo of media) {
        const isUrl = fileInfo.url.match(urlRegex)
          ? fileInfo.url.match(urlRegex)?.length > 0
          : false;
        if (!isUrl) {
          const mediaUrl = await uploadFileFromBase64({
            base64: fileInfo.url,
          });
          fileInfo.url = mediaUrl;
        }
        newMedia.push(fileInfo);
      }
    }
    let newSurvey = [];
    if (survey.length) {
      newSurvey = survey.map((option) => {
        const newOption = new SurveyOption({
          ...option,
          _id: ObjectId(),
          usersId: [],
        });
        return newOption;
      });
      for (let option of newSurvey) {
        await option.save();
      }
    }
    const linksId = [];
    if (links.length) {
      for (let i = 0; i < links.length; i++) {
        const newId = ObjectId();
        const linkInfo = links[i];
        const newLink = new Link({
          _id: newId,
          ...linkInfo,
        });
        await newLink.save();
        linksId[i] = newId;
      }
    }
    const optionsId = newSurvey.map((option) => option?._id);
    const newUsersTag = usersTag.map((userId) => ObjectId(userId));
    let categories = [];
    try {
      if (!!content.trim()) {
        const { data: relatedCategories } = await axios.post(
          process.env.PYTHON_SERVER + "/search",
          {
            query: content,
          }
        );
        if (relatedCategories?.length) {
          const catesQuery = await Category.find(
            {
              name: {
                $in: relatedCategories,
              },
            },
            { _id: 1 }
          );
          categories = catesQuery?.map(({ _id }) => _id);
        }
      }
    } catch (err) {
      console.log("err");
    }
    const newPostPayload: any = {
      _id: ObjectId(_id),
      authorId,
      content,
      media: newMedia,
      survey: optionsId,
      quote,
      type: type,
      usersTag: newUsersTag,
      links: linksId,
      files,
      categories,
    };
    if (action === PostConstants.ACTIONS.REPOST) {
      newPostPayload.parentPost = parentPost;
    }
    const newPost = new Post(newPostPayload);
    const postSaved = await newPost.save();
    if (parentPost && action === PostConstants.ACTIONS.REPLY) {
      await handleReplyForParentPost({
        parentId: parentPost,
        replyId: newPost._id,
        addNew: true,
      });
    }
    const result = await getPostDetail({ postId: postSaved._id });
    res.status(HTTPStatus.CREATED).json(result);
  } catch (err) {
    console.log("createPost: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

//get post
export const getPost = async (req, res) => {
  try {
    const postId = ObjectId(req.params.id);
    const post = await getPostDetail({ postId, getFullInfo: true });
    if (!post) {
      return res
        .status(HTTPStatus.NOT_FOUND)
        .json({ error: "Post not found!" });
    }
    res.status(HTTPStatus.OK).json(post);
  } catch (err) {
    console.log("getPost: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};
//delete Post
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const userId = req.query.userId;
    if (!postId || !userId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty payload");
    }
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(HTTPStatus.NOT_FOUND).json({ error: "Post not found" });
    }
    if (post.authorId.toString() !== userId.toString()) {
      return res
        .status(HTTPStatus.UNAUTHORIZED)
        .json({ error: "Unauthorized to delete post" });
    }
    const repliesId = post.replies;
    if (repliesId?.length) {
      await Post.updateMany(
        { _id: { $in: repliesId } },
        {
          status: Constants.POST_STATUS.DELETED,
        }
      );
    }
    await Post.updateMany(
      {
        replies: postId,
      },
      {
        $pull: {
          replies: postId,
        },
      }
    );
    await Post.updateMany(
      { "quote._id": postId },
      {
        quote: {},
      }
    );
    await Post.updateOne(
      {
        _id: ObjectId(postId),
      },
      {
        status: Constants.POST_STATUS.DELETED,
      }
    );

    res.status(HTTPStatus.OK).json({ message: "Post deleted successfully!" });
  } catch (err) {
    console.log("deletePost: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};
//updatePost
export const updatePost = async (req, res) => {
  const payload = req.body;
  const postId = payload._id;
  const { media, content, survey } = payload;
  // if(!req.user){
  //   return res.status(HTTPStatus.UNAUTHORIZED).json({error: "Unauthorized"})
  // }
  try {
    let post = await Post.findById(postId);
    if (!post) {
      return res.status(HTTPStatus.NOT_FOUND).json("Post not found");
    }

    if (post.authorId.toString() !== payload.userId.toString()) {
      return res
        .status(HTTPStatus.UNAUTHORIZED)
        .json({ error: "Unauthorized to update this post" });
    }

    post.content = content;
    post.media = media;
    post.survey = survey;
    post = await post.save();
    res.status(HTTPStatus.OK).json(post);
  } catch (error) {
    console.log("updatePost: ", error);

    res.status(HTTPStatus.SERVER_ERR).json({ error: error.message });
  }
};

//like and unlike post
export const likeUnlikePost = async (req, res) => {
  try {
    const { id: postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(HTTPStatus.NOT_FOUND).json({ error: "Post not found" });
    }
    const userLikedPost = post.likes.includes(userId);
    if (userLikedPost) {
      //unlike post
      await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
      res.status(HTTPStatus.OK).json({ message: "Post unliked successfully" });
    } else {
      //like post
      post.likes.push(userId);
      await post.save();
      res.status(HTTPStatus.OK).json({ message: "Post liked successfully!" });
    }
  } catch (err) {
    console.log("likeUnlikePost: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const getPosts = async (req, res) => {
  try {
    const payload = req.query;
    const data = await getPostsIdByFilter(payload);
    let result = [];
    if (data?.length) {
      result = await Promise.all(
        data.map((id) => getPostDetail({ postId: id }))
      );
    }
    res.status(HTTPStatus.OK).json(result);
  } catch (err) {
    console.log("getPosts: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const tickPostSurvey = async (req, res) => {
  try {
    const { optionId, userId, isAdd } = req.body;
    if (!optionId || !userId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty payload");
    }
    if (isAdd) {
      await SurveyOption.updateOne(
        { _id: ObjectId(optionId) },
        {
          $push: { usersId: userId },
        }
      );
    } else {
      await SurveyOption.updateOne(
        { _id: ObjectId(optionId) },
        {
          $pull: { usersId: userId },
        }
      );
    }
    res.status(HTTPStatus.OK).json("OK");
  } catch (err) {
    console.log("tickPostSurvey: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const updatePostStatus = async (req, res) => {
  try {
    const { userId, postId, status } = req.body;
    if (!userId || !postId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty payload");
    }
    const userInfo = await User.findOne({
      _id: ObjectId(userId),
    });
    const isAdmin = userInfo?.role === Constants.USER_ROLE.ADMIN;
    if (!isAdmin) {
      return res.status(HTTPStatus.UNAUTHORIZED).json("Only for admin");
    }
    await Post.updateOne(
      {
        _id: ObjectId(postId),
      },
      {
        status: status,
      }
    );
    res.status(HTTPStatus.OK).json("OK");
  } catch (err) {
    console.log("updatePostStatus: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};
