import Keyring from '@polkadot/keyring';
import { KeypairType } from '@polkadot/util-crypto/types';

export function createIdentity(mnemonics: string, accountType: KeypairType) {

    const keyring = new Keyring({ type: accountType });
    const keypair = keyring.addFromMnemonic(mnemonics);

    return keypair;

}