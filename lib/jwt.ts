import { KeyringPair } from "@polkadot/keyring/types";
import jwt from 'jsonwebtoken'
import * as bip39 from 'bip39';
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
    }
    const claims = {
        exp: Math.floor(Date.now() / 1000) + (60 * 60),
        sub: id,
        iat: Date.now(),
        sid: session
    }
    const identity = bip39.mnemonicToSeedSync(mnemonics)

    // create jwt token by signing payload and header with PRIVATE key 
    const token = jwt.sign(JSON.stringify(claims), identity)
    return token;
}