import { Options } from '../types/Options';
/** Print an error. Exit the process if in CLI mode. */
declare function programError(options: Options, message: string): void;
export default programError;
