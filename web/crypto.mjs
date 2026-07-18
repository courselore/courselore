import util from "node:util";
import crypto from "node:crypto";
import * as node from "@radically-straightforward/node";
import selfsigned from "selfsigned";

// const keyPair = await node.AsymmetricEncryption.generateKeyPair();
// console.log(keyPair);
const result = await selfsigned.generate(null, {
  keySize: 3072,
  algorithm: "sha256",
  notAfterDate: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
  // keyPair,
});
console.log(result);

// SELF-SIGNED CERTIFICATE

// PASSWORD HASHING

// // Migrate
// const phcString =
//   "$argon2id$v=19$m=12288,t=3,p=1$t1p57l3dqqKIvNlxZLA4Tw$JY0kdHMHFWsREM6J5whSMjpArGSCCJXdbJHVSIJXuKI";
// const phcStringParts = phcString.split("$");
// const nonce = Buffer.from(phcStringParts.at(-2), "base64");
// const hash = Buffer.from(phcStringParts.at(-1), "base64");
// const hashedPassword = JSON.stringify({
//   nonce: nonce.toString("hex"),
//   hash: hash.toString("hex"),
// });
// console.log(hashedPassword);

// const hashVerification = crypto.timingSafeEqual(
//   hash,
//   await util.promisify(crypto.argon2)("argon2id", {
//     message: "courselore",
//     nonce,
//     tagLength: 32,
//     parallelism: 1,
//     memory: 12288,
//     passes: 3,
//   }),
// );
// console.log(hashVerification);
