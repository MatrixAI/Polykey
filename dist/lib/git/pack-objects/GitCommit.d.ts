/// <reference types="node" />
declare class GitCommit {
    _commit: string;
    constructor(commit: any);
    static fromPayloadSignature({ payload, signature }: {
        payload: any;
        signature: any;
    }): GitCommit;
    static from(commit: any): GitCommit;
    toObject(): Buffer;
    headers(): any;
    message(): any;
    parse(): any;
    static justMessage(commit: any): any;
    static justHeaders(commit: any): any;
    parseHeaders(): any;
    static renderHeaders(obj: any): string;
    static render(obj: any): string;
    render(): string;
    withoutSignature(): any;
    isolateSignature(): any;
}
export default GitCommit;
