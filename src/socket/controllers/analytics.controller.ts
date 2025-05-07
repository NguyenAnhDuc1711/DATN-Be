import { Server } from "socket.io";
import {
  destructObjectId,
  formatDate,
  getAnalyticsDateCollection,
  getCountKeyAnalyticValue,
  getDatesInRange,
  getOSFromUserAgent,
} from "../../util/index.js";

const getUserActiveData = (datesData, dateRange) => {
  const result = dateRange.map((date) => {
    return {
      date: date,
      data: [
        ...new Set(
          datesData
            .filter((event) => formatDate(event.createdAt) == date)
            .map((event) => destructObjectId(event.userId))
        ),
      ].length,
    };
  });
  return result;
};

const getUserDeviceData = (datesData) => {
  const result = getCountKeyAnalyticValue({
    data: datesData,
    keyLayer1: "deviceInfo",
    keyLayer2: "category",
  });
  return result;
};

const getUserLocaleData = (datesData) => {
  const result = getCountKeyAnalyticValue({
    data: datesData,
    keyLayer1: "localeInfo",
    keyLayer2: "locale",
  });
  return result;
};

const getUserOS = (datesData) => {
  const result = getCountKeyAnalyticValue({
    data: datesData,
    keyLayer1: "browserInfo",
    keyLayer2: "userAgent",
  });
  const userAgentKeys: string[] = [];
  Object.keys(result).forEach((key) => {
    const OSName = getOSFromUserAgent(key);
    result[OSName] = result[key];
    userAgentKeys.push(key);
  });
  userAgentKeys.forEach((key) => {
    delete result[key];
  });

  return result;
};

const getEventsData = (datesData) => {
  const result = getCountKeyAnalyticValue({
    data: datesData,
    keyLayer1: "event",
  });
  return result;
};

export default class AnalyticsController {
  static async getSnapshotReport(payload: any, cb: Function, io: Server) {
    const { dateRange } = payload;
    const fromDate = dateRange[0];
    const toDate = dateRange[1];
    const dateRangeArr = getDatesInRange(fromDate, toDate);
    const totalData: any = [];
    for (const date of dateRangeArr) {
      const table = await getAnalyticsDateCollection(date);
      if (table) {
        const cursor = await table.find({});
        const data = await cursor.toArray();
        totalData.push(...data);
      }
    }
    const userActiveData = getUserActiveData(totalData, dateRangeArr);
    const userDeviceData = getUserDeviceData(totalData);
    const userLocaleData = getUserLocaleData(totalData);
    const eventsData = getEventsData(totalData);
    const userOSData = getUserOS(totalData);

    cb({
      active: userActiveData,
      device: userDeviceData,
      locale: userLocaleData,
      event: eventsData,
      os: userOSData,
    });
  }
}
