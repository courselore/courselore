import { Version } from '../types/Version';
import { VersionSpec } from '../types/VersionSpec';
/**
 * Check if a version satisfies the latest, and is not beyond the latest). Ignores `v` prefix.
 *
 * @param current
 * @param latest
 * @returns
 */
declare function isUpgradeable(current: VersionSpec, latest: Version): boolean;
export default isUpgradeable;
