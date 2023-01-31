import base64url from "base64url";
import Keyring from '@polkadot/keyring';
import { KeyringPair } from "@polkadot/keyring/types";
enum KeypairType {
    sr25519 = "sr25519",
    ed25519 = "ed25519"
}

/**
 * create jwt token string
 * @param identity 
 * @param id 
 * @param session 
 * @returns token string
 */
export function newJWT(identity: KeyringPair, id: number, session: string) {
    const header = {
        alg: "RS512",
        typ: "JWT"
    };

    const now = Math.ceil(Date.now().valueOf() / 1000);
    const claims = {
        sub: id,
        iat: now,
        exp: now + 1000,
        sid: session,
    }
    const jwt = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claims));

    const sigPrefixed = sign(jwt, identity);
    const token = jwt + "." + base64url(Buffer.from(sigPrefixed));
    return token;

}
export function sign(payload: string, identity: KeyringPair) {

    const typePrefix = identity.type === KeypairType.sr25519 ? "s" : "e";
    const sig = identity.sign(payload);
    const prefix = Buffer.from(typePrefix).readUint8(0)
    const sigPrefixed = new Uint8Array([prefix, ...sig]);
    return sigPrefixed;
}
export function createIdentity(mnemonics: string, accountType: string) {

    const keyring = new Keyring({ type: accountType === KeypairType.sr25519 ? 'sr25519' : 'ed25519' });
    const keypair = keyring.addFromMnemonic(mnemonics);

    return keypair;

}
