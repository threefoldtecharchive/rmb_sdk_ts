import { waitReady } from '@polkadot/wasm-crypto';
import { Address } from './types/types_pb';
import ReconnectingWebSocket from 'reconnecting-websocket';
import { connect } from './connect';
import { v4 as uuidv4 } from 'uuid';
export interface clientInterface {
    source: Address,
    connected: boolean,
    con: ReconnectingWebSocket,

};
interface requestInterface {
    Version: number,
    Reference?: string,
    Command: string,
    Expiration: number,
    Data: string,
    TwinDest: number,
    RetQueue: string,
    Schema: string,
    Epoch?: number

}

/**
 * creates new client
 * @param url 
 * @param twinId 
 * @param session 
 * @param kprType 
 * @param mnemonics 
 */
export async function newClient(url: string, twinId: number, session: string) {

    await waitReady();


    // create source from twin id and session string using generated proto types
    const source = new Address();
    source.setTwin(twinId);
    source.setConnection(session);

    // connect websocket
    const socket = connect(url);

    // create client with websocket connection
    const client: clientInterface = {
        source: source,
        connected: true,
        con: socket,
    }

    return client;

}


export async function createClient(url: string, twinID: number, session: string) {
    // create client
    const client = await newClient(url, twinID, session);
    return client;

}
export async function sendRequest(twinId: number, client: clientInterface, requestCommand: string, requestData: any[]) {
    const request: requestInterface = {
        Version: 1,
        Command: requestCommand,
        Expiration: 5 * 60,
        Data: (JSON.stringify(requestData)),
        TwinDest: twinId,
        RetQueue: uuidv4(),
        Schema: "application/json",

    }
}




