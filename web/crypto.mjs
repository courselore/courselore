import util from "node:util";
import crypto from "node:crypto";

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
