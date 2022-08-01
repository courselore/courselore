import { Index } from './types/IndexType';
export interface CLIOption<T = any> {
    arg?: string;
    choices?: T[];
    default?: T;
    deprecated?: boolean;
    description: string;
    help?: string | (() => string);
    parse?: (s: string, p?: T) => T;
    long: string;
    short?: string;
    type: string;
}
export declare const cliOptionsMap: Index<CLIOption<any>>;
declare const cliOptionsSorted: CLIOption<any>[];
export default cliOptionsSorted;
