# Installation
> `npm install --save @types/csurf`

# Summary
This package contains type definitions for csurf (https://www.npmjs.org/package/csurf).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/csurf.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/csurf/index.d.ts)
````ts
// Type definitions for csurf 1.11
// Project: https://www.npmjs.org/package/csurf
// Definitions by: Hiroki Horiuchi <https://github.com/horiuchi>
//                 Piotr Błażejewicz <https://github.com/peterblazejewicz>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped
import express = require('express-serve-static-core');

declare global {
    namespace Express {
        interface Request {
            csrfToken(): string;
        }
    }
}

declare function csurf(options?: {
    value?: ((req: express.Request) => string) | undefined;
    /**
     * @default false
     */
    cookie?: csurf.CookieOptions | boolean | undefined;
    ignoreMethods?: string[] | undefined;
    sessionKey?: string | undefined;
}): express.RequestHandler;

declare namespace csurf {
    interface CookieOptions extends express.CookieOptions {
        /**
         * @default '_csrf'
         */
        key?: string | undefined;
    }
}

export = csurf;

````

### Additional Details
 * Last updated: Tue, 06 Jul 2021 20:32:35 GMT
 * Dependencies: [@types/express-serve-static-core](https://npmjs.com/package/@types/express-serve-static-core)
 * Global values: none

# Credits
These definitions were written by [Hiroki Horiuchi](https://github.com/horiuchi), and [Piotr Błażejewicz](https://github.com/peterblazejewicz).
