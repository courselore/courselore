import url from "node:url";
import fs from "fs-extra";
import express from "express";
import database from "./database.js";
import logging from "./logging.js";
import globalMiddlewares from "./global-middlewares.js";
import liveUpdates from "./live-updates.js";
import layouts from "./layouts.js";
import authentication from "./authentication.js";
import administrator from "./administration.js";
export { userSystemRolesWhoMayCreateCourseses, systemRoles, } from "./administration.js";
import about from "./about.js";
import user from "./user.js";
export { userAvatarlessBackgroundColors, userEmailNotificationsDigestsFrequencies, } from "./user.js";
import course from "./course.js";
export { courseRoles, enrollmentAccentColors, } from "./course.js";
import conversation from "./conversation.js";
export { conversationTypes, } from "./conversation.js";
import message from "./message.js";
import content from "./content.js";
import email from "./email.js";
import demonstration from "./demonstration.js";
import error from "./error.js";
import helpers from "./helpers.js";
export default async (options) => {
    const app = express();
    app.locals.options = {
        ...options,
        version: JSON.parse(await fs.readFile(url.fileURLToPath(new URL("../package.json", import.meta.url)), "utf8")).version,
        canonicalHost: "courselore.org",
        metaCourseloreInvitation: "https://courselore.org/courses/8537410611/invitations/3667859788",
        tryHost: "try.courselore.org",
    };
    app.locals.handlers = {};
    app.locals.middlewares = {};
    app.locals.layouts = {};
    app.locals.partials = {};
    app.locals.helpers = {};
    app.locals.mailers = {};
    app.locals.workers = {};
    await database(app);
    logging(app);
    globalMiddlewares(app);
    liveUpdates(app);
    await layouts(app);
    authentication(app);
    administrator(app);
    about(app);
    user(app);
    course(app);
    conversation(app);
    message(app);
    await content(app);
    email(app);
    demonstration(app);
    error(app);
    helpers(app);
    return app;
};
//# sourceMappingURL=index.js.map