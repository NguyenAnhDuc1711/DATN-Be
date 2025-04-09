import mongoose from "mongoose";
import { Constants } from "../../Breads-Shared/Constants/index.js";

const ObjectId = mongoose.Schema.Types.ObjectId;

const postStatus = Object.values(Constants.POST_STATUS);

const postSchema = mongoose.Schema(
  {
    authorId: {
      type: ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      maxLength: 500,
    },
    media: {
      type: Array,
      required: false,
    },
    usersLike: [
      {
        type: ObjectId,
        ref: "User",
        default: [],
      },
    ],
    replies: [
      {
        type: ObjectId,
        ref: "Post",
        default: [],
      },
    ],
    parentPost: {
      type: ObjectId,
      ref: "Post",
      required: false,
      default: null,
    },
    survey: [
      {
        type: ObjectId,
        ref: "SurveyOption",
        required: false,
      },
    ],
    type: {
      type: String,
      default: "create",
      required: true,
    },
    quote: {
      type: Object,
      required: false,
    },
    usersTag: [
      {
        type: ObjectId,
        ref: "User",
        required: false,
      },
    ],
    links: [
      {
        type: ObjectId,
        ref: "Link",
        required: false,
      },
    ],
    files: [
      {
        type: ObjectId,
        ref: "File",
        required: false,
      },
    ],
    status: {
      type: Number,
      enum: postStatus,
      default: Constants.POST_STATUS.PENDING,
    },
    categories: [
      {
        type: ObjectId,
        ref: "Categories",
        required: false,
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Post = mongoose.model("Post", postSchema);

export default Post;
