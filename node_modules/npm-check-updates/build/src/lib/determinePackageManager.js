"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const promises_1 = __importDefault(require("fs/promises"));
const findLockfile_1 = __importDefault(require("./findLockfile"));
const defaultPackageManager = 'npm';
/**
 * If the packageManager option was not provided, look at the lockfiles to
 * determine which package manager is being used.
 *
 * @param readdirSync This is only a parameter so that it can be used in tests.
 */
async function determinePackageManager(options, readdir = promises_1.default.readdir) {
    var _a;
    if (options.packageManager)
        return options.packageManager;
    if (options.global)
        return defaultPackageManager;
    const lockfileName = (_a = (await (0, findLockfile_1.default)(options, readdir))) === null || _a === void 0 ? void 0 : _a.filename;
    if (lockfileName === 'package-lock.json')
        return 'npm';
    if (lockfileName === 'yarn.lock')
        return 'yarn';
    return defaultPackageManager;
}
exports.default = determinePackageManager;
//# sourceMappingURL=determinePackageManager.js.map