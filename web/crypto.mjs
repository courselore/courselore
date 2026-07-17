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
// const plaintext = "hello world";
// const initializationVector = crypto.randomBytes(12);
// const cipher = crypto.createCipheriv("aes-256-gcm", key, initializationVector);
// const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
// const authenticationTag = cipher.getAuthTag();
// const encryptedData = JSON.stringify({
//   initializationVector: initializationVector.toString("hex"),
//   ciphertext: ciphertext.toString("base64"),
//   authenticationTag: authenticationTag.toString("hex"),
// });
// console.log(encryptedData);

// // Decrypt
// const decipher = crypto.createDecipheriv(
//   "aes-256-gcm",
//   key,
//   initializationVector,
// );
// decipher.setAuthTag(authenticationTag);
// const decryptedPlaintext = Buffer.concat([
//   decipher.update(ciphertext),
//   decipher.final(),
// ]);
// console.log(decryptedPlaintext.toString("utf-8"));

// ASYMMETRIC ENCRYPTION/DECRYPTION

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
