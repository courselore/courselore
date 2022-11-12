import { Application } from "./index.mjs";

export type ApplicationLiveConnection = {
  server: {
    locals: {
      ResponseLocals: {
        LiveConnection: Application["server"]["locals"]["ResponseLocals"]["Base"] & {
          liveConnectionNonce: string;
        };
      };
    };
  };
};

export default async (application: Application): Promise<void> => {};
