import { Options } from '../types/Options';
/**
 * Gets the name of the package file based on --packageFile or --packageManager.
 */
declare function getPackageFileName(options: Options): string;
export default getPackageFileName;
