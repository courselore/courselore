import util from "node:util";
import crypto from "node:crypto";

// ASYMMETRIC ENCRYPTION/DECRYPTION

// // Generate key
// const keyPair = await util.promisify(crypto.generateKeyPair)("rsa", {
//   modulusLength: 3072,
//   publicKeyEncoding: { format: "pem", type: "spki" },
//   privateKeyEncoding: { format: "pem", type: "pkcs8" },
// });
// console.log(keyPair);

// SELF-SIGNED CERTIFICATE

// HASHING

// // Hash
// const message = "hello world";
// const hash = crypto.hash("sha256", message);
// console.log(hash);

// // Verify
// const hashVerification = crypto.timingSafeEqual(
//   Buffer.from(hash, "hex"),
//   crypto.hash("sha256", message, "buffer"),
// );
// console.log(hashVerification);

// PASSWORD HASHING

// // Hash
// const password = "hello world";
// const nonce = crypto.randomBytes(16);
// const hash = await util.promisify(crypto.argon2)("argon2id", {
//   message: password,
//   nonce,
//   parallelism: 1,
//   tagLength: 32,
//   memory: 12288,
//   passes: 3,
// });
// const hashedPassword = JSON.stringify({
//   nonce: nonce.toString("hex"),
//   hash: hash.toString("hex"),
// });
// console.log(hashedPassword);

// // Verify
// const hashVerification = crypto.timingSafeEqual(
//   hash,
//   await util.promisify(crypto.argon2)("argon2id", {
//     message: password,
//     nonce,
//     tagLength: 32,
//     parallelism: 1,
//     memory: 12288,
//     passes: 3,
//   }),
// );
// console.log(hashVerification);

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
