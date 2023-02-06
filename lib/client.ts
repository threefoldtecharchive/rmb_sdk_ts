import Ws from 'ws';
import { newJWT } from './jwt';
import { waitReady } from '@polkadot/wasm-crypto';
import { Envelope, Address, Request, Response } from './types/types_pb';
import { v4 as uuidv4 } from 'uuid';
import { KeyringPair } from '@polkadot/keyring/types';
import { createIdentity } from './identity';
import { challenge, sign } from './sign';
import ReconnectingWebSocket, { Message } from 'reconnecting-websocket';
import { WsReconnect } from 'websocket-reconnect';
export interface clientInterface {
    source: Address,
    signer: KeyringPair,
    connected: boolean,
    url: string,
    con: ReconnectingWebSocket,
    responses: Map<any, any>
};

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
    // create identity of source
    const identity = createIdentity(mnemonics, accountType);
    // create token from identity
    const token = newJWT(identity, twinId, session)

    // update url with token
    url = `${url}?${token}`;

    // create source from twin id and session string using generated proto types
    const source = new Address();
    source.setTwin(twinId);
    source.setConnection(session);

    // initialize responses map 
    const responses = new Map()

    // 
    const socket = connect(url);

    // create client with websocket connection
    const client: clientInterface = {
        source: source,
        signer: identity,
        connected: true,
        url: url,
        con: socket,
        responses: responses

    }

    return client;

}

export function connect(url: string) {

    // start websocket connection with updated url
    const options = {
        WebSocket: Ws,
        debug: true,
    }
    const ws = new ReconnectingWebSocket(url, [], options);

    ws.onmessage = (e) => {
        console.log("waiting response...");
        console.log(e.data)
        const receivedEnvelope = Envelope.deserializeBinary(e.data);
        const response = receivedEnvelope.getResponse();

        if (response) {
            const reply = response.getReply();
            const err = response.getError();
            if (reply) {
                const dataReceieved = reply.getData();
                const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceieved))
                console.log(`response: ${JSON.parse(decodedData)}`);
            } else if (err) {
                console.log(`error: ${err.getCode()} ${err.getMessage()}`);
            }
        }
    }


    console.log(ws)


    return ws;
}

export async function createClient(url: string, twinID: number, session: string, mnemonics: string, keyType: string) {
    // create client
    const client = await newClient(url, twinID, session, mnemonics, keyType);

    return client;

}
export function sendRequest(sourceTwinId: number, client: clientInterface, socket: ReconnectingWebSocket, requestCommand: string, requestData: any[], destinationTwinId: number) {

    // create new envelope with given data and destination
    const envelope = newEnvelope(sourceTwinId, client.source.getConnection(), destinationTwinId, client.signer, requestCommand, requestData);

    // send enevelope binary using socket
    socket.send(envelope.serializeBinary());
    console.log('enevelope sent')
    // add request id to responses map on client object
    const requestID = uuidv4();
    client.responses.set(requestID, null)


}

export function newEnvelope(sourceTwinId: number, session: string, destTwinId: number, identity: KeyringPair, requestCommand: string, requestData: any[]) {
    const envelope = new Envelope();
    envelope.setUid(uuidv4());

    envelope.setTimestamp(Math.round(Date.now() / 1000));
    envelope.setExpiration(5 * 60);
    const source = new Address();
    source.setTwin(sourceTwinId);
    source.setConnection(session);
    envelope.setSource(source);
    const destination = new Address();
    destination.setTwin(destTwinId);
    // destination.setConnection(null);
    envelope.setDestination(destination);
    envelope.setSchema("application/json");
    const request = new Request();
    request.setCommand(requestCommand);
    request.setData(Buffer.from(JSON.stringify(requestData)));
    envelope.setRequest(request);
    const signature = signEnvelope(envelope, identity)
    envelope.setSignature(signature);

    return envelope;

}
function signEnvelope(envelope: Envelope, identity: KeyringPair) {
    const toSign = challenge(envelope);

    return sign(toSign, identity);
}

