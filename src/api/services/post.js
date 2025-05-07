import { Constants } from "../../Breads-Shared/Constants/index.js";
import PageConstant from "../../Breads-Shared/Constants/PageConstants.js";
import PostConstants from "../../Breads-Shared/Constants/PostConstants.js";
import { destructObjectId, ObjectId } from "../../util/index.js";
import Category from "../models/category.model.js";
import Collection from "../models/collection.model.js";
import Post from "../models/post.model.js";
import SurveyOption from "../models/surveyOption.model.js";
import User from "../models/user.model.js";

export const getPostDetail = async ({ postId, getFullInfo = false }) => {
  try {
    const getRelativeProp = [
      {
        $lookup: {
          from: "users",
          let: { searchId: { $toObjectId: "$authorId" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$searchId", "$_id"],
                },
              },
            },
            {
              $project: {
                _id: 1,
                username: 1,
                avatar: 1,
                bio: 1,
                name: 1,
                followed: 1,
              },
            },
          ],
          as: "authorInfo",
        },
      },
      { $unwind: "$authorInfo" },
      {
        $lookup: {
          from: "surveyoptions",
          localField: "survey",
          foreignField: "_id",
          as: "survey",
        },
      },
      {
        $lookup: {
          from: "links",
          localField: "links",
          foreignField: "_id",
          as: "linksInfo",
        },
      },
      {
        $lookup: {
          from: "files",
          localField: "files",
          foreignField: "_id",
          as: "files",
        },
      },
    ];

    const agg = [
      {
        $match: { _id: ObjectId(postId) },
      },
      {
        $lookup: {
          from: "posts",
          let: { searchId: { $toObjectId: "$parentPost" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$$searchId", "$_id"],
                },
              },
            },
          ],
          as: "parentPostInfo",
        },
      },
      ...getRelativeProp,
    ];
    if (getFullInfo) {
      agg.push({
        $lookup: {
          from: "posts",
          localField: "replies",
          foreignField: "_id",
          pipeline: [...getRelativeProp],
          as: "replies",
        },
      });
    }
    let result = (await Post.aggregate(agg))?.[0];
    if (result?.usersTag?.length > 0) {
      const usersTagInfo = await getUsersTagInfo({
        usersTagId: result?.usersTag,
      });
      result.usersTagInfo = usersTagInfo;
    }
    if (result?.parentPostInfo?.length > 0) {
      result.parentPostInfo = result.parentPostInfo[0];
      const parentPostInfo = result.parentPostInfo;
      const userInfo = await User.findOne(
        { _id: parentPostInfo.authorId },
        {
          _id: 1,
          avatar: 1,
          name: 1,
          username: 1,
          bio: 1,
          followed: 1,
        }
      );
      if (parentPostInfo?.survey.length) {
        const surveyOptions = await SurveyOption.find({
          _id: { $in: parentPostInfo.survey },
        });
        parentPostInfo.survey = surveyOptions;
      }
      if (parentPostInfo?.usersTag?.length > 0) {
        const usersTagInfo = await getUsersTagInfo({
          usersTagId: parentPostInfo?.usersTag,
        });
        parentPostInfo.usersTagInfo = usersTagInfo;
      }
      parentPostInfo.authorInfo = userInfo;
    } else {
      if (result?.parentPostInfo) {
        delete result.parentPostInfo;
      }
    }
    const childrenPost = await Post.find({ parentPost: result?._id });
    if (result) {
      result.repostNum = childrenPost?.length ?? 0;
    }
    return result;
  } catch (err) {
    console.log("getPostDetail: ", err);
    return null;
  }
};

const getQueryPostValidation = (filter) => {
  const user = filter.user;
  const postContent = filter?.postContent;
  const postType = filter?.postType;
  if (!user && !postContent && !postType) {
    return { status: Constants.POST_STATUS.PENDING };
  }
  let userQuery = null;
  let postContentQuery = null;
  let postTypeQuery = null;
  if (!!user) {
    userQuery = {
      authorId: ObjectId(user),
    };
  }
  if (!!postContent && postContent?.length > 0) {
    const contentConditions = [];
    const { GIF, IMAGE, VIDEO } = Constants.MEDIA_TYPE;
    postContent.forEach((contentType) => {
      if (contentType === "text") {
        contentConditions.push({
          $and: [{ media: { $size: 0 } }, { survey: { $size: 0 } }],
        });
      } else if (contentType === GIF) {
        contentConditions.push({ "media.type": GIF });
      } else if (contentType === IMAGE) {
        contentConditions.push({ "media.type": IMAGE });
      } else if (contentType === VIDEO) {
        contentConditions.push({ "media.type": VIDEO });
      } else if (contentType === "survey") {
        contentConditions.push({
          $expr: {
            $gt: [{ $size: "$survey" }, 0],
          },
        });
      }
    });
    postContentQuery = {
      $or: contentConditions,
    };
  }
  if (!!postType && postType?.length > 0) {
    const postTypeConditions = postType.map((type) => {
      return {
        type: type,
      };
    });
    postTypeQuery = {
      $or: postTypeConditions,
    };
  }
  const subQueries = [{ status: Constants.POST_STATUS.PENDING }];
  [userQuery, postContentQuery, postTypeQuery].forEach((subQuery) => {
    if (subQuery) {
      subQueries.push(subQuery);
    }
  });
  const query = {
    $and: subQueries,
  };
  return query;
};

export const getForYouPostsId = async ({ userId, skip, limit }) => {
  const userInfo = await User.findOne({
    _id: ObjectId(userId),
  });
  const userCatesCare = userInfo?.catesCare ?? [];
  const data = await Post.aggregate([
    {
      $match: {
        type: { $ne: "reply" },
        authorId: { $ne: ObjectId(userId) },
      },
    },
    {
      $addFields: {
        matchedCategories: {
          $filter: {
            input: "$categories",
            as: "category",
            cond: { $in: ["$$category", userCatesCare] },
          },
        },
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            {
              $multiply: [
                { $size: { $ifNull: ["$matchedCategories", []] } },
                15,
              ],
            },
            { $multiply: [{ $size: { $ifNull: ["$usersLike", []] } }, 5] },
            { $multiply: [{ $size: { $ifNull: ["$replies", []] } }, 3] },
            { $multiply: [{ $size: { $ifNull: ["$media", []] } }, 2] },
            { $size: { $ifNull: ["$survey", []] } },
          ],
        },
      },
    },
    {
      $sort: { score: -1 },
    },
    {
      $skip: skip,
    },
    {
      $limit: parseInt(limit),
    },
    {
      $project: {
        _id: 1,
      },
    },
  ]);
  return data?.map(({ _id }) => _id) ?? [];
};

export const getPostsIdByFilter = async (payload) => {
  try {
    let data = null;
    let { filter, userId, page, limit } = payload;
    if (!page) {
      page = 1;
    }
    if (!limit) {
      limit = 20;
    }
    const { PENDING, PUBLIC, ONLY_ME, ONLY_FOLLOWERS, DELETED } =
      Constants.POST_STATUS;
    const skip = (page - 1) * limit;
    let query = {};
    let project = { _id: 1 };
    let sort = { createdAt: -1 };
    switch (filter?.page) {
      case PageConstant.SAVED:
        data = (
          await Collection.findOne({ userId: ObjectId(userId) })
            .skip(skip)
            .limit(limit)
        )?.postsId;
        break;
      case PageConstant.USER || PageConstant.FRIEND:
        const value = filter.value;
        let type = value;
        const status = {
          $nin: [PENDING, DELETED],
        };
        if (!value) {
          type = {
            $nin: [PostConstants.ACTIONS.REPLY, PostConstants.ACTIONS.REPOST],
          };
        }
        query = {
          authorId: ObjectId(userId),
          type,
          status,
        };
        break;
      case PageConstant.FOLLOWING:
        const userInfo = await User.findOne({ _id: userId });
        const userFollowing = JSON.parse(JSON.stringify(userInfo)).following;
        query = {
          type: { $ne: PostConstants.ACTIONS.REPLY },
          authorId: { $in: userFollowing },
        };
        break;
      case PageConstant.LIKED:
        query = { usersLike: userId };
        break;
      case PageConstant.ADMIN.POSTS_VALIDATION:
        query = getQueryPostValidation(filter);
        break;
      case PageConstant.ADMIN.POSTS:
        sort = { createdAt: 1 };
        break;
      default:
        data = await getForYouPostsId({ userId, skip, limit });
        break;
    }
    if (
      Object.keys(query).length > 0 ||
      filter?.page === PageConstant.ADMIN.POSTS
    ) {
      data = await Post.find(query, project).skip(skip).limit(limit).sort(sort);
    }
    return data;
  } catch (err) {
    console.log("getPostsIdByFilter: ", err);
  }
};

export const handleReplyForParentPost = async ({
  parentId,
  replyId,
  addNew,
}) => {
  try {
    const action = addNew
      ? {
          $push: { replies: replyId },
        }
      : {
          $pull: { replies: replyId },
        };
    await Post.updateOne(
      {
        _id: parentId,
      },
      action
    );
  } catch (err) {
    console.log("handleReplyForParentPost: ", err);
  }
};

export const getUsersTagInfo = async ({ usersTagId }) => {
  try {
    const usersTagInfo = await User.find(
      {
        _id: { $in: usersTagId },
      },
      {
        _id: 1,
        avatar: 1,
        name: 1,
        username: 1,
        bio: 1,
        followed: 1,
      }
    );
    return usersTagInfo;
  } catch (err) {
    console.log("getUsersTagInfo: ", err);
  }
};

export const getPostsCatesByIds = async ({ postIds }) => {
  try {
    const postsCates = (
      await Post.find(
        {
          _id: {
            $in: postIds,
          },
        },
        {
          _id: 0,
          categories: 1,
        }
      )
    )?.map(({ categories }) =>
      categories.map((cateId) => destructObjectId(cateId))
    );
    const cateIds = [...new Set(postsCates.flat())];
    return cateIds;
  } catch (err) {
    console.log("getPostsCatesByIds: ", err);
    return [];
  }
};
