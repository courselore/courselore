interface Options {
    color?: boolean;
    configFileName?: string;
    configFilePath?: string;
    packageFile?: string;
}
/**
 * Loads the .ncurc config file.
 *
 * @param [cfg]
 * @param [cfg.configFileName=.ncurc]
 * @param [cfg.configFilePath]
 * @param [cfg.packageFile]
 * @returns
 */
declare function getNcuRc({ color, configFileName, configFilePath, packageFile }?: Options): Promise<{
    args: string[];
    config: {};
    filePath: string;
} | null>;
export default getNcuRc;
