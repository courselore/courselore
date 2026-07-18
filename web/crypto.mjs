import util from "node:util";
import crypto from "node:crypto";

// SYMMETRIC ENCRYPTION/DECRYPTION

// // Generate key
// const key = await util.promisify(crypto.generateKey)("aes", { length: 256 });

// // Export key
// const exportedKey = key.export().toString("hex");
// console.log(exportedKey);

// // Import key
// const importedKey = crypto.createSecretKey(exportedKey, "hex");
// console.log(importedKey.export().toString("hex"));

// // Encrypt
// const plainText = "hello world";
// const initializationVector = crypto.randomBytes(12);
// const cipher = crypto.createCipheriv("aes-256-gcm", key, initializationVector);
// const cipherText = Buffer.concat([cipher.update(plainText), cipher.final()]);
// const authenticationTag = cipher.getAuthTag();
// const encryptedText = JSON.stringify({
//   initializationVector: initializationVector.toString("hex"),
//   cipherText: cipherText.toString("base64"),
//   authenticationTag: authenticationTag.toString("hex"),
// });
// console.log(encryptedText);

// // Decrypt
// const decipher = crypto.createDecipheriv(
//   "aes-256-gcm",
//   key,
//   initializationVector,
// );
// decipher.setAuthTag(authenticationTag);
// const decryptedPlaintext = Buffer.concat([
//   decipher.update(cipherText),
//   decipher.final(),
// ]).toString("utf-8");
// console.log(decryptedPlaintext);

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
