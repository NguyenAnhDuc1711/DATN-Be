// import SocketListener from "../SocketRouters/index.js";
import { Server as HttpServer } from "http";
import { Application } from "express";
import { Server, Socket } from "socket.io";
import MessageListener from "./listeners/message.listener.js";
import NotificationListener from "./listeners/notification.listener.js";
import PostListener from "./listeners/post.listener.js";
import UserListener from "./listeners/user.listener.js";
import AnalyticsListener from "./listeners/admin.listener.js";

export const initSocket = (server: HttpServer, app: Application): void => {
  try {
    const io = new Server(server, {
      cors: {
        origin: "*",
      },
      path: "/socket",
    });
    app.set("socket_io", io);
    io.on("connection", async (socket: Socket) => {
      console.log("Server is connected with socket ", socket.id);
      UserListener(socket, io);
      NotificationListener(socket, io);
      PostListener(socket, io);
      MessageListener(socket, io);
      AnalyticsListener(socket, io);
      socket.on("disconnect", async (message) => {
        console.log("Socket disconnected");
        // await disconnect(socket, io);
      });
    });
  } catch (err) {
    console.log(err);
  }
};
