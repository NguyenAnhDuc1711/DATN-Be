// import SocketListener from "../SocketRouters/index.js";
import { Server as HttpServer } from "http";
import { Application } from "express";
import { Server, Socket } from "socket.io";

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
      socket.on("disconnect", async (message) => {
        console.log("Socket disconnected");
        // await disconnect(socket, io);
      });
    });
  } catch (err) {
    console.log(err);
  }
};
