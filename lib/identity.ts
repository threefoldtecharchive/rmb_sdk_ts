import Keyring from '@polkadot/keyring';
export enum KeypairType {
    sr25519 = "sr25519",
    ed25519 = "ed25519"
}
export function createIdentity(mnemonics: string, accountType: string) {

    const keyring = new Keyring({ type: accountType === KeypairType.sr25519 ? 'sr25519' : 'ed25519' });
    const keypair = keyring.addFromMnemonic(mnemonics);

    return keypair;

}