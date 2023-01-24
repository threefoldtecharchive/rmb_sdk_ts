import ws from 'ws';
import { newJWT } from './jwt';
import { waitReady } from '@polkadot/wasm-crypto';
import { Address } from './types/lib/types_pb';



/**
 * creates new client
 * @param url 
 * @param twinId 
 * @param session 
 * @param kprType 
 * @param mnemonics 
 */
export async function newClient(url: string, twinId: number, session: string, mnemonics: string, accountType: string) {

    await waitReady();
    // create token from mnemonics
    const token = newJWT(mnemonics, twinId, session, accountType)
    // update url with token
    url = `${url}?${token}`;
    console.log(url)
    // start websocket connection with updated url
    const wsConnection = new ws(url);

    // create source from twin id and session string using generated proto types
    const source = new Address();
    source.setTwin(twinId);
    source.setConnection(session);

    // create client with websocket connection
    const client = {
        source,
        // signer: identity,
        con: wsConnection
    }

    return client;

}
export function newEnvelope() {

}
