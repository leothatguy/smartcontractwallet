export type WalletDatum = null | number;

export type WalletRedeemer = null;

export type OwnerCredential = { type: 'VerificationKey'; hash: string } | { type: 'Script'; hash: string };
