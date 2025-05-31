import Notification from "../../api/models/notification.model.js";
import User from "../../api/models/user.model.js";
import { NOTIFICATION_PATH, Route } from "../../Breads-Shared/APIConfig.js";
import { ObjectId } from "../../util/index.js";
import { getUserSocketByUserId } from "../services/user.js";
export default class NotificationController {
  static create = async (payload, socket, io) => {
    const { fromUser, toUsers, action, target } = payload;
    const sendTo = toUsers?.filter((userId) => userId !== fromUser);
    if (!sendTo?.length || fromUser === toUsers[0]) {
      return;
    }
    const existingNotifications = await Notification.find({
      fromUser: ObjectId(fromUser),
      toUsers: { $in: toUsers?.map((userId) => ObjectId(userId)) },
      action: action,
    });
    if (existingNotifications.length > 0) {
      const notificationIds = existingNotifications.map((notification) =>
        ObjectId(notification._id)
      );
      await Notification.deleteMany({
        _id: { $in: notificationIds },
      });
      return;
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
