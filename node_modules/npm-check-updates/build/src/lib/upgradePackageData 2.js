"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @returns String safe for use in `new RegExp()`
 */
function escapeRegexp(s) {
    return s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'); // Thanks Stack Overflow!
}
/**
 * Upgrade the dependency declarations in the package data.
 *
 * @param pkgData The package.json data, as utf8 text
 * @param oldDependencies Old dependencies {package: range}
 * @param newDependencies New dependencies {package: range}
 * @returns The updated package data, as utf8 text
 * @description Side Effect: prompts
 */
async function upgradePackageData(pkgData, current, upgraded) {
    let newPkgData = pkgData;
    // eslint-disable-next-line fp/no-loops
    for (const dep in upgraded) {
        const expression = `"${dep}"\\s*:\\s*"${escapeRegexp(`${current[dep]}"`)}`;
        const regExp = new RegExp(expression, 'g');
        newPkgData = newPkgData.replace(regExp, `"${dep}": "${upgraded[dep]}"`);
    }
    return newPkgData;
}
exports.default = upgradePackageData;
//# sourceMappingURL=upgradePackageData.js.map