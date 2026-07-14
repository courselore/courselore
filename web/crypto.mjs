import util from "node:util";
import crypto from "node:crypto";



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
