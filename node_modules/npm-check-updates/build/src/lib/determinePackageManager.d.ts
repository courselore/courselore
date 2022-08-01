import { Options } from '../types/Options';
/**
 * If the packageManager option was not provided, look at the lockfiles to
 * determine which package manager is being used.
 *
 * @param readdirSync This is only a parameter so that it can be used in tests.
 */
export default function determinePackageManager(options: Options, readdir?: (_path: string) => Promise<string[]>): Promise<string>;
