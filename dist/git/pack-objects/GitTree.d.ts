/// <reference types="node" />
declare class GitTree {
    _entries: any[];
    constructor(entries: any);
    static from(tree: any): GitTree;
    render(): string;
    toObject(): Buffer;
    entries(): any[];
    [Symbol.iterator](): Generator<any, void, unknown>;
}
export default GitTree;
