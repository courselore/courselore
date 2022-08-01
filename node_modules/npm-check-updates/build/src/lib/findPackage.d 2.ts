import { Options } from '../types/Options';
/**
 * Finds the package file and data.
 *
 * Searches as follows:
 * --packageData flag
 * --packageFile flag
 * --stdin
 * --findUp
 *
 * @returns Promise<PkgInfo>
 */
declare function findPackage(options: Options): Promise<[string, string | null | undefined]>;
export default findPackage;
