import util from "node:util";
import crypto from "node:crypto";

// Node.js generate key
// const key = await util.promisify(crypto.generateKey)("aes", { length: 256 });
// const keyString = key.export().toString("base64url");
// console.log(keyString);
// const loadedKey = crypto.createSecretKey(keyString, "base64url");
// console.log(loadedKey.export().toString("base64url"));

// Web Crypto generate key
// console.log(
//   await crypto.subtle.importKey(
//     "jwk",
//     await crypto.subtle.exportKey(
//       "jwk",
//       await crypto.subtle.generateKey(
//         {
//           name: "AES-GCM",
//           length: 256,
//         },
//         true,
//         ["encrypt", "decrypt"],
//       ),
//     ),
//     "AES-GCM",
//     false,
//     ["encrypt", "decrypt"],
//   ),
// );

// Node.js argon2
// console.log(
//   (
//     await util.promisify(crypto.argon2)("argon2id", {
//       message: "courselore",
//       nonce: Buffer.from("t1p57l3dqqKIvNlxZLA4Tw", "base64url"),
//       parallelism: 1,
//       tagLength: 32,
//       memory: 12288,
//       passes: 3,
//     })
//   ).toString("base64url"),
// );
// $argon2id$v=19$m=12288,t=3,p=1$t1p57l3dqqKIvNlxZLA4Tw$JY0kdHMHFWsREM6J5whSMjpArGSCCJXdbJHVSIJXuKI
