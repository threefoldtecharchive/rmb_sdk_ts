import base64url from "base64url";

import { KeyringPair } from "@polkadot/keyring/types";
import { sign } from "./sign"

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


