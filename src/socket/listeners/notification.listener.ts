import { Server, Socket } from "socket.io";
import { NOTIFICATION_PATH, Route } from "../../Breads-Shared/APIConfig.js";
import NotificationController from "../controllers/notification.controller.js";

const NotificationListener = (socket: Socket, io: Server) => {
  socket.on(Route.NOTIFICATION + NOTIFICATION_PATH.CREATE, (payload: any) => {
    NotificationController.create(payload, socket, io);
  });
};

export default NotificationListener;
