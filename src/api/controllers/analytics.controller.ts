import { ObjectId } from "../../util/index.js";
import AnalyticsModel from "../models/analytics.model.js";
import { Request, Response } from "express";

interface CreateEventRequest extends Request {
  body: {
    userId: string;
    event: string;
    payload?: any;
    deviceInfo?: Record<string, any>;
    browserInfo?: Record<string, any>;
    localeInfo?: Record<string, any>;
    webInfo?: Record<string, any>;
  };
}

export const createEvent = async (req: CreateEventRequest, res: Response) => {
  try {
    const {
      userId,
      event,
      payload,
      deviceInfo,
      browserInfo,
      localeInfo,
      webInfo,
    } = req.body;
    const newEvent = new AnalyticsModel({
      event: event,
      userId: ObjectId(userId),
      payload: payload,
      deviceInfo: deviceInfo,
      browserInfo: browserInfo,
      localeInfo: localeInfo,
      webInfo: webInfo,
    });
    await newEvent.save();
    res.status(200).json("OK");
  } catch (err) {
    console.log("createEvent: ", err);
  }
};

export const getEvents = async (req: any, res: any) => {
  try {
    // const { userId, agg } = req.body;
  } catch (err) {
    console.log("getEvents: ", err);
  }
};
