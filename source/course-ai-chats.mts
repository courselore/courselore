import * as serverTypes from "@radically-straightforward/server";
import * as utilities from "@radically-straightforward/utilities";
import cryptoRandomString from "crypto-random-string";
import natural from "natural";
import sql from "@radically-straightforward/sqlite";
import html, { HTML } from "@radically-straightforward/html";
import css from "@radically-straightforward/css";
import javascript from "@radically-straightforward/javascript";
import { Application } from "./application.mjs";

export type ApplicationCourseAIChats = {
  types: {
    states: {
      CourseAIChat: Application["types"]["states"]["Course"] & {
        courseAIChat: {};
      };
    };
  };
};

export default async (application: Application): Promise<void> => {};
