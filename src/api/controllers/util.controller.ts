import { decodeString } from "../../Breads-Shared/util/index.js";
import HTTPStatus from "../../util/httpStatus.js";
import User from "../models/user.model.js";
import { sendMailService } from "../services/util.js";
import { forgotPWMailForm } from "../utils/index.js";

export const sendForgotPWMail = async (req, res) => {
  try {
    const { from, to, subject, code, url } = req.body;
    if (!from || !to) {
      return res.status(HTTPStatus.BAD_REQUEST).json("Empty user's mail");
    }
    let decodedCode = decodeString(code);
    const userInfo = await User.findOne({ email: to });
    let userId = "";
    let newUrl = "";
    if (userInfo) {
      userId = JSON.parse(
        JSON.stringify(userInfo?._id).replace("new ObjectId", "")
      );
    }
    if (userId) {
      newUrl = url.replace("userId", `${userId}`);
      newUrl = newUrl.replace(code, decodedCode);
    }
    const result = await sendMailService({
      from,
      to,
      subject,
      html: forgotPWMailForm(to, decodedCode, newUrl),
    });
    res.status(HTTPStatus.OK).send(result);
  } catch (err) {
    console.log("sendForgotPWMail: ", err);
    res.status(HTTPStatus.SERVER_ERR).json(err);
  }
};
