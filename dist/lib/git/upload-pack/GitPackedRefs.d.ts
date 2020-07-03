declare type Config = {
    line: string;
    ref?: string;
    peeled?: string;
    oid?: string;
    comment?: boolean;
};
declare class GitPackedRefs {
    refs: Map<string, string>;
    parsedConfig: Config[];
    constructor(text: string);
    static from(text: any): GitPackedRefs;
}
export default GitPackedRefs;
