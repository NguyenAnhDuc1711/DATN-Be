import { Server } from "socket.io";
import { getUserSocketByUserId } from "./user.js";

export const sendToSpecificUser = async ({
  recipientId,
  io,
  path,
  payload,
}: {
  recipientId: string;
  io: Server;
  path: string;
  payload: any;
}) => {
  try {
    if (!recipientId) {
      return;
    }
    const recipientSocketId = await getUserSocketByUserId(recipientId, io);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(path, payload);
    }
  } catch (err) {
    console.log("sendToSpecificUser: ", err);
  }
};
