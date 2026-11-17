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

export default async (application: Application): Promise<void> => {
  application.webServer?.push({
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/ai(?:$|/)"),
    handler: (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (
        request.state.course === undefined ||
        request.state.courseParticipation === undefined
      )
        return;
      application.database.run(
        sql`
          update "courseParticipations"
          set "mostRecentlyVisitedMode" = ${"courseAI"}
          where "id" = ${request.state.courseParticipation.id};
        `,
      );
    },
  });

  application.webServer?.push({
    method: "GET",
    pathname: new RegExp("^/courses/(?<coursePublicId>[0-9]+)/ai$"),
    handler: async (
      request: serverTypes.Request<
        {},
        {},
        {},
        {},
        Application["types"]["states"]["Course"]
      >,
      response,
    ) => {
      if (request.state.course === undefined || request.liveConnection) return;
      response.redirect!(`/courses/${request.state.course.publicId}/ai/new`);
    },
  });
};
