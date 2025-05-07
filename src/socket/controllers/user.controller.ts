import { Server, Socket } from "socket.io";
import { getFriendsSocketInfo } from "../services/user.js";

export default class UserController {
  static connect = async (payload: any, socket: Socket, io: Server) => {
    const { userId, userFollowed, userFollowing } = payload;
    socket.data = {
      id: socket.id,
      userId: userId,
      userFollowed: userFollowed,
      userFollowing: userFollowing,
      friendsInfo: [],
    };
    const friendsSocketInfo = await getFriendsSocketInfo(io, socket);
    socket.data.friendsInfo = friendsSocketInfo;
  };
}
