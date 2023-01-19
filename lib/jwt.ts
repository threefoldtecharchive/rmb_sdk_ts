
import { createHmac } from 'crypto'
import base64url from "base64url";
import Keyring from '@polkadot/keyring';
/**
 * create jwt token string
 * @param identity 
 * @param id 
 * @param session 
 * @returns token string
 */
export function newJWT(mnemonics: string, id: number, session: string) {
    const header = {
        alg: "RS512",
        typ: "JWT"
    };
    const encodedHeader = base64url(Buffer.from(JSON.stringify(header)));
    const payload = {
        exp: Math.floor(Date.now() / 1000) + 60,
        sub: id,
        iat: Date.now() / 1000,
        sid: session
    }
    const encodedPayload = base64url(Buffer.from(JSON.stringify(payload)));
    const keyring = new Keyring({ type: 'sr25519' });
    const pk = keyring.addFromUri(mnemonics).publicKey
    const sig = createHmac('sha256', mnemonics).update(encodedHeader + "." + encodedPayload).digest('base64');
    const signature = base64url.fromBase64(sig);
    const token = `${encodedHeader}.${encodedPayload}.${signature}`;
    return token;

}
