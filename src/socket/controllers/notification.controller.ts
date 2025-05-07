import Notification from "../../api/models/notification.model.js";
import User from "../../api/models/user.model.js";
import { NOTIFICATION_PATH, Route } from "../../Breads-Shared/APIConfig.js";
import { Constants } from "../../Breads-Shared/Constants/index.js";
import { ObjectId } from "../../util/index.js";
import { getUserSocketByUserId } from "../services/user.js";

const { FOLLOW } = Constants.NOTIFICATION_ACTION;
const handleFollow = async (fromUser, toUsers) => {
  try {
    const userToFollow = await User.findOne({ _id: ObjectId(fromUser) });
    if (!userToFollow) {
      console.log("User not found");
      return false;
    }

    const existingNotifications = await Notification.find({
      fromUser: ObjectId(fromUser),
      toUsers: { $in: [ObjectId(toUsers[0])] },
      action: FOLLOW,
    });

    if (existingNotifications.length > 0) {
      await Notification.deleteMany({
        fromUser: ObjectId(fromUser),
        toUsers: { $in: [ObjectId(toUsers[0])] },
        action: FOLLOW,
      });
      return true;
    } else return false;
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return false;
  }
};

export default class NotificationController {
  static create = async (payload, socket, io) => {
    const { fromUser, toUsers, action, target } = payload;
    const sendTo = toUsers?.filter((userId) => userId !== fromUser);
    if (!sendTo?.length) {
      return;
    }
    switch (action) {
      case FOLLOW:
        const shouldCreateNotification = await handleFollow(fromUser, toUsers);
        if (shouldCreateNotification) {
          return;
        }
        break;
      default:
        break;
    }
    let notificationInfo: any = {
      fromUser: fromUser,
      toUsers: sendTo,
      action,
    };
    if (target) {
      notificationInfo.target = target;
    }
    notificationInfo = new Notification(notificationInfo);
    const newNotification = await notificationInfo.save();
    const targetUserSocketId = await getUserSocketByUserId(toUsers, io);
    if (targetUserSocketId) {
      io.to(targetUserSocketId).emit(
        Route.NOTIFICATION + NOTIFICATION_PATH.GET_NEW,
        newNotification
      );
    }

    await User.updateOne({ _id: ObjectId(toUsers) }, { hasNewNotify: true });
  };
}
