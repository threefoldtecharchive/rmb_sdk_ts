import { KeyringPair } from "@polkadot/keyring/types";
import base64url from "base64url";
import { Envelope } from "./types/lib/types";
export enum KPType {
    sr25519 = "sr25519",
    ed25519 = "ed25519",

}
export function sign(payload: string | Uint8Array, signer: KeyringPair) {
    const typePrefix = signer.type === KPType.sr25519 ? "s" : "e";
    const sig = signer.sign(payload);
    const prefix = Buffer.from(typePrefix).readUInt8(0)
    const sigPrefixed = new Uint8Array([prefix, ...sig]);
    return sigPrefixed;
}
export function verify(envelope: Envelope, twin: any) {
    const signature = envelope.signature;
    const prefix = new TextDecoder().decode(Buffer.from(new Uint8Array([signature[0]])))
    let sigType: string;
    if (prefix == 'e') {
        sigType = KPType.ed25519
    } else if (prefix == 's') {
        sigType = KPType.sr25519
    } else {
        throw new Error('invalid signature type, should be either ed25519 or sr25519')
    }

    return true;
}