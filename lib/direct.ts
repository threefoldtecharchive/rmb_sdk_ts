import ws from 'ws';
import { Keyring } from '@polkadot/api';
import { newJWT } from './jwt';

import { waitReady } from '@polkadot/wasm-crypto'
/**
 * creates new client
 * @param url 
 * @param twinId 
 * @param session 
 * @param kprType 
 * @param mnemonics 
 */
export async function newClient(url: string, twinId: number, session: string, kprType: string, mnemonics: string) {
    // create keyring pair based on given type
    // let keyring;
    // if (kprType.toLowerCase() == 'sr') {
    //     keyring = new Keyring({ type: 'sr25519' });
    // } else {
    //     keyring = new Keyring({ type: 'ed25519' });
    // }
    await waitReady();
    // // create identity (i.e keypair) from mnemonics
    // const identity = keyring.addFromUri(mnemonics);
    // create token from identity
    const token = newJWT(mnemonics, twinId, session)
    // update url with token
    url = `${url}?${token}`;
    console.log(url)
    // start websocket connection with updated url
    const wsConnection = new ws(url);
    // create source from twin id and session string
    const source = {
        Twin: twinId,
        Connection: session
    }
    // create client with websocket connection
    const client = {
        source,
        // signer: identity,
        con: wsConnection
    }

    return client;

}
