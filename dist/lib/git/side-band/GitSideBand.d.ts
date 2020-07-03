import { PassThrough } from 'readable-stream';
declare class GitSideBand {
    static demux(input: any): {
        packetlines: PassThrough;
        packfile: PassThrough;
        progress: PassThrough;
    };
    static mux(protocol: any, // 'side-band' or 'side-band-64k'
    packetlines: any, packfile: any, progress: any, error: any): PassThrough;
}
export default GitSideBand;
