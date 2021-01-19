declare module 'greenlock';
declare module "greenlock-express";

/*
// FIXME: https://git.rootprojects.org/root/greenlock-express.js/issues/50

declare module "greenlock-express" {
  import * as Http from "http";
  import * as Https from "https";
  import * as Http2 from "http2";
  import * as Express from "express";

  function init(
    options: initOptions
  ): initReturnFunction & initReturnFunctionCluster;

  interface initOptions {
    packageRoot: string;
    configDir: string;
    maintainerEmail: string;
    cluster?: boolean;
    workers?: number;
  }

  interface initReturnFunction {
    serve(
      func: (
        req: Http.IncomingMessage | Http2.Http2ServerRequest,
        res: Http.ServerResponse | Http2.Http2ServerResponse
      ) => void
    ): void;

    serve(express: Express.Application): void;
  }

  interface initReturnFunctionCluster {
    ready(func: (glx: glx) => void): initReturnFunctionCluster;

    master(func: () => void): initReturnFunctionCluster;
  }

  class glx {
    httpServer(): Http.Server;

    httpsServer(
      func?: (req: Http.IncomingMessage, res: Http.ServerResponse) => void
    ): Https.Server;
    httpsServer(
      serverOptions: null | Https.ServerOptions,
      func: (req: Http.IncomingMessage, res: Http.ServerResponse) => void
    ): Https.Server;

    http2Server(
      func?: (
        req: Http.IncomingMessage | Http2.Http2ServerRequest,
        res: Http.ServerResponse | Http2.Http2ServerResponse
      ) => void
    ): Http2.Http2Server;
    http2Server(
      serverOptions: null | Http2.ServerOptions,
      func: (
        req: Http.IncomingMessage | Http2.Http2ServerRequest,
        res: Http.ServerResponse | Http2.Http2ServerResponse
      ) => void
    ): Http2.Http2Server;

    serveApp(
      func: (
        req: Http.IncomingMessage | Http2.Http2ServerRequest,
        res: Http.ServerResponse | Http2.Http2ServerResponse
      ) => void
    ): void;
  }
}
*/
