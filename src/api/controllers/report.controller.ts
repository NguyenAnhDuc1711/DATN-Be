import { Constants } from "../../Breads-Shared/Constants";
import { ObjectId } from "../../util";
import HTTPStatus from "../../util/httpStatus";
import Report from "../models/report.model";
import User from "../models/user.model";
import { sendMailService } from "../services/util";
import { uploadFileFromBase64 } from "../utils";

export const sendReport = async (req, res) => {
  try {
    const { userId, content, media } = req.body;
    if (!userId) {
      return res.status(HTTPStatus.UNAUTHORIZED).json("Unauthorized");
    }
    const userInfo = await User.findOne(
      {
        _id: ObjectId(userId),
      },
      {
        _id: 0,
        email: 1,
      }
    );
    const userEmail = userInfo?.email;
    let newMedia = [];
    if (media?.length > 0) {
      for (let fileInfo of media) {
        const mediaUrl = await uploadFileFromBase64({
          base64: fileInfo.url,
        });
        fileInfo.url = mediaUrl;
        newMedia.push(fileInfo);
      }
    }
    const newReport = new Report({
      userId: ObjectId(userId),
      content: content,
      media: newMedia,
    });
    await newReport.save();
    res.status(HTTPStatus.OK).json("Success");
  } catch (err) {
    console.log("sendReport: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const getReports = async (req, res) => {
  try {
    const { userId, searchValue, page, limit } = req.query;
    if (!userId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty userId");
    }
    const userInfo = await User.findOne({
      _id: ObjectId(userId),
    });
    const isAdmin = userInfo?.role === Constants.USER_ROLE.ADMIN;
    if (!isAdmin) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Unauthorization");
    }
    const agg = [
      {
        $lookup: {
          from: "users",
          let: { searchId: { $toObjectId: "$userId" } },
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
                name: 1,
                email: 1,
              },
            },
          ],
          as: "userReport",
        },
      },
      {
        $unwind: "$userReport",
      },
      {
        $match: {
          $or: [
            {
              "userReport.username": {
                $regex: searchValue,
                $options: "i",
              },
            },
            {
              "userReport.name": {
                $regex: searchValue,
                $options: "i",
              },
            },
          ],
        },
      },
    ];
    const data = await Report.aggregate(agg);
    res.status(HTTPStatus.OK).json(data);
  } catch (err) {
    console.log("getReports: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const responseReport = async (req, res) => {
  try {
    const { from, to, subject, html, userId, reportId } = req.body;
    if (!userId || !from || !to || !subject) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Invalid input");
    }
    const userInfo = await User.findOne({
      _id: ObjectId(userId),
    });
    const isAdmin = userInfo?.role == Constants.USER_ROLE.ADMIN;
    if (!isAdmin) {
      return res
        .status(HTTPStatus.FORBIDDEN)
        .json("Only admin have this authoriaztion");
    }
    const result = await sendMailService({
      from,
      to,
      subject,
      html,
    });
    await Report.updateOne(
      {
        _id: ObjectId(reportId),
      },
      {
        status: Constants.REPORT_STATUS.RESPONSED,
      }
    );
    res.status(HTTPStatus.OK).json(result);
  } catch (err) {
    console.log("responseReport: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};

export const rejectReport = async (req, res) => {
  try {
    const { userId, reportId } = req.body;
    if (!userId || !reportId) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Invalid input");
    }
    const userInfo = await User.findOne({
      _id: ObjectId(userId),
    });
    const isAdmin = userInfo?.role == Constants.USER_ROLE.ADMIN;
    if (!isAdmin) {
      return res
        .status(HTTPStatus.FORBIDDEN)
        .json("Only admin have this authoriaztion");
    }
    await Report.updateOne(
      {
        _id: ObjectId(reportId),
      },
      {
        status: Constants.REPORT_STATUS.REJECT,
      }
    );
    res.status(HTTPStatus.OK).json("OK");
  } catch (err) {
    console.log("rejectReport: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};
