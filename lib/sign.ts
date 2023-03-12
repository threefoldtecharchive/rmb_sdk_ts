import { KeyringPair } from "@polkadot/keyring/types";
import * as secp from '@noble/secp256k1';
import * as cryptoJs from 'crypto-js';
export enum KPType {
    sr25519 = "sr25519",
    ed25519 = "ed25519",

}
export function sign(payload: string | Uint8Array, signer: KeyringPair) {

    const typePrefix = signer.type === KPType.sr25519 ? "s" : "e";
    const sig = signer.sign(payload);
    const prefix = Buffer.from(typePrefix).readUInt8(0)
    const sigPrefixed = new Uint8Array([prefix, ...sig]);
    console.log(signer.address)
    return sigPrefixed;
}
export async function createShared(privKey: Uint8Array, pubKey: Uint8Array) {

    const pointX = secp.getSharedSecret(privKey, pubKey, false)
    const key = await secp.utils.sha256(pointX);
    console.log(key)
    return key
}




