import express from "express";
import core from "express-serve-static-core";

export function asyncHandler<
  P = core.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = core.Query,
  Locals extends Record<string, any> = Record<string, any>
>(
  handler: express.RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>
): express.RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return async (req, res, next) => {
    try {
      return await handler(req, res, next);
    } catch (x) {
      next(x);
    }
  };
}

export function asyncErrorHandler<
  P = core.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = core.Query,
  Locals extends Record<string, any> = Record<string, any>
>(
  handler: express.ErrorRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>
): express.ErrorRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return async (err, req, res, next) => {
    try {
      return await handler(err, req, res, next);
    } catch (x) {
      next(x);
    }
  };
}
