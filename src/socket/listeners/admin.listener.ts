import { ANALYTICS_PATH, Route } from "../../Breads-Shared/APIConfig.js";
import AnalyticsController from "../controllers/analytics.controller.js";
import { Server, Socket } from "socket.io";

const AnalyticsListener = (socket: Socket, io: Server) => {
  socket.on(
    Route.ANALYTICS + ANALYTICS_PATH.GET_SNAPSHOT_REPORT,
    (payload: any, cb: Function) => {
      AnalyticsController.getSnapshotReport(payload, cb, io);
    }
  );
};

export default AnalyticsListener;
