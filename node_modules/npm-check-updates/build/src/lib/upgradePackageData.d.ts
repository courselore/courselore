import { Index } from '../types/IndexType';
import { VersionSpec } from '../types/VersionSpec';
/**
 * Upgrade the dependency declarations in the package data.
 *
 * @param pkgData The package.json data, as utf8 text
 * @param oldDependencies Old dependencies {package: range}
 * @param newDependencies New dependencies {package: range}
 * @returns The updated package data, as utf8 text
 * @description Side Effect: prompts
 */
declare function upgradePackageData(pkgData: string, current: Index<VersionSpec>, upgraded: Index<VersionSpec>): Promise<string>;
export default upgradePackageData;
