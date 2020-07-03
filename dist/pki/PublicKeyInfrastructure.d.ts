declare class PublicKeyInfrastructure {
    static N_BITS: number;
    static COMMON_NAME: string;
    static ORGANIZATION_NAME: string;
    /**
     * Creates an X.509 certificate for transport layer security
     * @param nbits The number of bits for keypair generation
     * @param organizationName The name of the organization
     */
    static createX509Certificate(nbits?: number, commonName?: string, organizationName?: string): {
        keyPem: string;
        certPem: string;
    };
}
export default PublicKeyInfrastructure;
