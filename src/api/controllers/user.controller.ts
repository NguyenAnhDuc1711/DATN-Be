import { Constants } from "../../Breads-Shared/Constants/index.js";
import { genRandomCode } from "../../Breads-Shared/util/index.js";
import { deleteCache, getCache, setCache } from "../../redis/index.ts";
import HTTPStatus from "../../util/httpStatus.js";
import { ObjectId } from "../../util/index.js";
import { crawlUser } from "../crawl.js";
import Collection from "../models/collection.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { getUserInfo, getUsersByPage, updateFollow } from "../services/user.js";
import { sendMailService } from "../services/util.js";
import { uploadFileFromBase64, validateEmailForm } from "../utils/index.js";

export const getAdminAccount = async (req, res) => {
  try {
    let adminAccount = await User.findOne({
      role: Constants.USER_ROLE.ADMIN,
    });
    if (!adminAccount) {
      const newAdmin = new User({
        email: "admin@gmail.com",
        name: "Admin",
        username: "Admin",
        password: "123456",
        role: Constants.USER_ROLE.ADMIN,
      });
      const result = await newAdmin.save();
      return res.status(HTTPStatus.CREATED).json(result);
    }
    const adminCollection = await Collection.findOne(
      { userId: adminAccount._id },
      { postsId: 1 }
    );
    adminAccount.collection = adminCollection;
    res.status(HTTPStatus.OK).json(adminAccount);
  } catch (err) {
    console.log(err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};
//sign up
export const signupUser = async (req, res) => {
  try {
    const { name, email, username, password } = req.body;
    const userEmail = await User.findOne({ email });
    const userUsername = await User.findOne({ username });
    if (userUsername?._id) {
      return res.status(HTTPStatus.BAD_REQUEST).json({
        errorType: "USERNAME_EXISTS",
        error: "Tên người dùng đã tồn tại",
      });
    }
    if (userEmail?._id) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ errorType: "EMAIL_EXISTS", error: "Email đã tồn tại" });
    }

    // const salt = await bcrypt.genSalt(10);
    // const hashPassword = await bcrypt.hash(password, salt);

    // const newUser = new User({
    //   name,
    //   email,
    //   username,
    //   password: password,
    // });
    // await newUser.save();

    // if (newUser) {
    //   // generateTokenAndSetCookie(newUser._id, res);
    //   res.status(HTTPStatus.CREATED).json({ message: "Tạo mới thành công" });
    // } else {
    //   res
    //     .status(HTTPStatus.BAD_REQUEST)
    //     .json({ error: "Tạo mới không thành công" });
    // }
    const expireTime = 10; // Minutes
    const code = genRandomCode();
    const result = await sendMailService({
      from: "mraducky@gmail.com",
      to: email,
      subject: "Validation for creating Breads account",
      html: validateEmailForm(code, expireTime),
    });

    if (result) {
      const keyCache = `mail_validation_${email}`;
      await setCache(
        keyCache,
        JSON.stringify({ name, email, username, password, code }),
        expireTime * 60
      );
      res.status(200).json("Mail was sent");
    }
  } catch (err) {
    res.status(HTTPStatus.SERVER_ERR).json({ error: "Server lỗi" });
    console.log("Error in Signup User", err.message);
  }
};

export const validateEmailByCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    const keyCache = `mail_validation_${email}`;
    const validationMailInfo = JSON.parse(await getCache(keyCache));
    if (validationMailInfo) {
      if (code === validationMailInfo?.code) {
        const { name, username, password } = validationMailInfo;
        const newUser = new User({
          name,
          email,
          username,
          password: password,
        });
        await newUser.save();

        if (newUser) {
          // generateTokenAndSetCookie(newUser._id, res);
          await deleteCache(keyCache);
          return res
            .status(HTTPStatus.CREATED)
            .json({ message: "Tạo mới thành công" });
        } else {
          return res
            .status(HTTPStatus.BAD_REQUEST)
            .json({ error: "Tạo mới không thành công" });
        }
      } else {
        return res.status(HTTPStatus.BAD_REQUEST).json({
          errorType: "INCORRECT_CODE",
          error: "Incorrect code",
        });
      }
    } else {
      return res.status(HTTPStatus.BAD_REQUEST).json({
        errorType: "EXPIRED_CODE",
        error: "Validation code has been expired",
      });
    }
  } catch (err) {
    console.log("validateEmailByCode err: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

//login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
    const isPasswordCorrect = password == user?.password;
    // await bcrypt.compare(
    //   password,
    //   user?.password || ""
    // );

    if (!user) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "Tài khoản không tồn tại" });
    }
    if (!isPasswordCorrect) {
      return res
        .status(HTTPStatus.UNAUTHORIZED)
        .json({ error: "Mật khẩu sai" });
    }

    // generateTokenAndSetCookie(user._id, res);
    const result = await getUserInfo(user._id);

    res.status(HTTPStatus.OK).json(result);
  } catch (err) {
    res.status(HTTPStatus.SERVER_ERR).json({ error: "Server lỗi" });
    console.log("Error in loginUser", err.message);
  }
};

// logout
export const logoutUser = async (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 1 });
    res.status(HTTPStatus.OK).json({ message: "User log out successfully!" });
  } catch (err) {
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
    console.log("Error in logoutUser", err.message);
  }
};

//follow and unfollow
export const followUser = async (req, res) => {
  try {
    const { userFlId, userId } = req.body;
    if (!userFlId || !userId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty payload");
    }
    const userInfo = await User.findOne({ _id: ObjectId(userId) });
    if (!userInfo) {
      return res.status(HTTPStatus.NOT_FOUND).json("Invalid user");
    }
    const userFollowing = JSON.parse(JSON.stringify(userInfo))?.following;
    const isFollowing = userFollowing?.includes(userFlId);
    if (isFollowing) {
      await updateFollow(userId, userFlId, false, true);
      await updateFollow(userFlId, userId, false, false);
    } else {
      await updateFollow(userId, userFlId, true, true);
      await updateFollow(userFlId, userId, true, false);
    }
    res.status(HTTPStatus.OK).json("ok");
  } catch (err) {
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
    console.log("Error in followUnFollowUser", err.message);
  }
};

// update
export const updateUser = async (req, res) => {
  const payload = req.body;
  const userId = req.params.id;

  try {
    let user = await User.findById(userId);
    if (!user)
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "User not found" });
    if (req.params.id !== userId.toString())
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "You can't update other user's profile!" });

    // if (password) {
    //   const salt = await bcrypt.genSalt(10);
    //   const hashedPassword = await bcrypt.hash(password, salt);
    //   user.password = hashedPassword;
    // }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    for (const [key, value] of Object.entries(payload)) {
      let valueUpdate = null;
      switch (key) {
        case "avatar":
          if (value !== user.avatar) {
            valueUpdate = await uploadFileFromBase64({
              base64: value,
            });
          }
          break;
        case "links":
          const checkLinks = (value as string[]).every(
            (link) => link.match(urlRegex)?.length > 0
          );
          if (checkLinks) {
            valueUpdate = value;
          }
          break;
        default:
          valueUpdate = value;
      }
      if (valueUpdate) {
        user[key] = valueUpdate;
      }
    }

    user = await user.save();
    const result = await getUserInfo(userId);
    delete result.password;

    res.status(HTTPStatus.OK).json(result);
  } catch (err) {
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
    console.log("Can't updateUser", err.message);
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPW, newPW } = req.body;
    const forgotPW = req.body?.forgotPW;
    const userId = req.params.id;
    if (!userId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty userId");
    }
    if ((!currentPW || !newPW) && !forgotPW) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty payload");
    }
    const user = await User.findOne({ _id: ObjectId(userId) });
    if (!user) {
      return res.status(HTTPStatus.BAD_REQUEST).json("User not found");
    }
    if (user.password !== currentPW && !forgotPW) {
      return res.status(HTTPStatus.UNAUTHORIZED).json("Wrong password");
    } else if (newPW.length < 6) {
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json("Password must be at least 6 characters");
    } else if (currentPW === newPW && !forgotPW) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Nothing change");
    }
    await User.updateOne(
      { _id: ObjectId(userId) },
      {
        password: newPW,
      }
    );
    return res.status(HTTPStatus.OK).json("Success");
  } catch (err) {
    console.log(err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

//get user profile

export const getUserProfile = async (req, res) => {
  const { userId } = req.params;
  try {
    let user = null;
    if (!userId) {
      return res.status(HTTPStatus.NO_CONTENT).json("Empty payload");
    }
    user = await getUserInfo(userId);
    if (!user)
      return res
        .status(HTTPStatus.BAD_REQUEST)
        .json({ error: "User not found!" });
    res.status(HTTPStatus.OK).json(user);
  } catch (err) {
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
    console.log("Can't be get your userProfile!!");
  }
};

export const getUserToFollows = async (req, res) => {
  try {
    const { userId, page, limit, searchValue } = req.query;
    const isTest = req.query?.isTest ?? false;
    if (isTest) {
      const users = await User.find(
        {},
        {
          _id: 1,
          username: 1,
          avatar: 1,
        }
      );
      return res.status(HTTPStatus.OK).json(users);
    }
    if (!userId) {
      return res.status(HTTPStatus.UNAUTHORIZED).json("Unauthorize");
    }
    if (!page || !limit) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Need page and limit");
    }
    const userInfo = await User.findOne({ _id: ObjectId(userId) });
    const userCatesCare = userInfo?.catesCare;
    let userFollowed = userInfo?.following ?? [];
    userFollowed = userFollowed.map((id) => ObjectId(id));
    const invalidToFollow = [...userFollowed, ObjectId(userId)];

    const agg = [
      {
        $match: {
          _id: { $nin: invalidToFollow },
          username: { $regex: searchValue, $options: "i" },
        },
      },
      {
        $addFields: {
          matchedCategories: {
            $filter: {
              input: "$catesCare",
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
                  5,
                ],
              },
              { $multiply: [{ $size: { $ifNull: ["$followed", []] } }, 2] },
            ],
          },
        },
      },
      {
        $sort: { score: -1 },
      },
    ];
    const data = await getUsersByPage({
      page,
      limit,
      agg,
    });
    res.status(HTTPStatus.OK).json(data);
  } catch (err) {
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const handleCrawlFakeUsers = async (req, res) => {
  try {
    await crawlUser();
    res.status(HTTPStatus.OK).json("Crawl success");
  } catch (err) {
    console.log("handleCrawlFakeUsers: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const getUsersFollow = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty userId");
    }
    const userInfo = await User.findOne({ _id: ObjectId(userId) });
    if (!userInfo) {
      return res.status(HTTPStatus.NOT_FOUND).json("Invalid user");
    }
    const followedUsers = await User.find(
      {
        _id: { $in: userInfo.followed },
      },
      {
        _id: 1,
        avatar: 1,
        username: 1,
        name: 1,
        bio: 1,
      }
    );
    const followingUsers = await User.find(
      {
        _id: { $in: userInfo.following },
      },
      {
        _id: 1,
        avatar: 1,
        username: 1,
        name: 1,
        bio: 1,
      }
    );
    res.status(HTTPStatus.OK).json({
      followed: followedUsers,
      following: followingUsers,
    });
  } catch (err) {
    console.log("getUsersFollow: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const getUsersToTag = async (req, res) => {
  try {
    let { userId, page, limit, searchValue } = req.query;
    if (!userId) {
      return res.status(HTTPStatus.UNAUTHORIZED).json("Unauthorize");
    }
    if (!page) {
      page = 1;
    }
    if (!limit) {
      limit = 20;
    }
    const agg = [
      {
        $match: {
          $and: [
            {
              $or: [
                { username: { $regex: searchValue, $options: "i" } },
                { name: { $regex: searchValue, $options: "i" } },
              ],
            },
            { _id: { $ne: ObjectId(userId) } },
          ],
        },
      },
    ];
    const data = await getUsersByPage({ page, limit, agg });
    res.status(HTTPStatus.OK).json(data);
    return data;
  } catch (err) {
    console.log("getUsersToTag: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const checkValidUser = async (req, res) => {
  try {
    const payload = req.body;
    const userId = payload?.userId;
    const userEmail = payload?.userEmail;
    if (!userId && !userEmail) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty payload");
    }
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(userEmail)) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Invalid email type");
    }
    const userInfo = await User.findOne({
      $or: [{ _id: ObjectId(userId) }, { email: userEmail }],
    });
    if (userInfo) {
      return res.status(HTTPStatus.OK).json(true);
    } else {
      return res.status(HTTPStatus.OK).json(false);
    }
  } catch (err) {
    console.log("checkValidUser :", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const getUserIdFromEmail = async (req, res) => {
  try {
    const { userEmail } = req.body;
    if (!userEmail) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty email");
    }
    const userInfo = await User.findOne({
      email: userEmail,
    });
    res.status(HTTPStatus.OK).json(userInfo._id);
  } catch (err) {
    console.log("getUserIdFromEmail: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const getUsersPendingPost = async (req, res) => {
  try {
    const { userId, page, limit, searchValue } = req.body;
    const skip = (page - 1) * limit;
    if (!userId) {
      return res.status(HTTPStatus.UNAUTHORIZED).json("Unauthorize");
    }
    if (!page || !limit) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Need page and limit");
    }
    const userInfo = await User.findOne({ _id: ObjectId(userId) });
    const isAdmin = userInfo?.role === Constants.USER_ROLE.ADMIN;
    if (!isAdmin) {
      return res.status(HTTPStatus.UNAUTHORIZED).json("Only for admin");
    }
    const authorIds = (
      await Post.find(
        { status: Constants.POST_STATUS.PENDING },
        { _id: 0, authorId: 1 }
      ).lean()
    )?.map(({ authorId }) => authorId);
    const users = await User.find(
      {
        _id: { $in: authorIds },
        username: { $regex: searchValue, $options: "i" },
      },
      {
        _id: 1,
        username: 1,
        avatar: 1,
      }
    )
      .skip(skip)
      .limit(limit);
    return res.status(HTTPStatus.OK).json(users);
  } catch (err) {
    console.log("getPostPendingUsers: ", err);
    res.status(HTTPStatus.SERVER_ERR).json({ error: err.message });
  }
};

export const getUsersWithStatus = async (req, res) => {
  try {
    const { userId, page, limit, searchValue } = req.query;
    if (!userId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty userId");
    }
    const userInfo = await User.findOne({
      _id: ObjectId(userId),
    });
    const isAdmin = userInfo.role === Constants.USER_ROLE.ADMIN;
    if (!isAdmin) {
      return res
        .status(HTTPStatus.UNAUTHORIZED)
        .json("You don't have access to this");
    }
    let agg = searchValue
      ? [
          {
            $match: {
              username: { $regex: searchValue, $options: "i" },
            },
          },
        ]
      : [];
    const data = await getUsersByPage({
      page,
      limit,
      agg,
    });
    const count = await User.countDocuments(agg);
    res.status(HTTPStatus.OK).json({
      count,
      users: data,
    });
  } catch (err) {
    console.log("getUsersWithStatus: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};
