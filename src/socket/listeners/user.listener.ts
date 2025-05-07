import { Server, Socket } from "socket.io";
import { Route, USER_PATH } from "../../Breads-Shared/APIConfig.js";
import UserController from "../controllers/user.controller.js";

const UserListener = (socket: Socket, io: Server) => {
  socket.on(Route.USER + USER_PATH.CONNECT, (payload) => {
    UserController.connect(payload, socket, io);
  });
};

export default UserListener;
