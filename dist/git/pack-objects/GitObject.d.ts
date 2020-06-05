/// <reference types="node" />
declare class GitObject {
    static hash({ type, object }: {
        type: any;
        object: any;
    }): any;
    static wrap({ type, object }: {
        type: any;
        object: any;
    }): {
        oid: any;
        buffer: Buffer;
    };
    static unwrap({ oid, buffer }: {
        oid: any;
        buffer: any;
    }): {
        type: any;
        object: Buffer;
    };
}
export default GitObject;
