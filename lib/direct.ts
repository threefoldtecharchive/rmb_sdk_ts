import WebSocket from 'ws';
import { newJWT } from './jwt';
import { waitReady } from '@polkadot/wasm-crypto';
import { Envelope, Address, Request, Response } from './types/types_pb';
import { v4 as uuidv4 } from 'uuid';
import { KeyringPair } from '@polkadot/keyring/types';
import { createIdentity } from './identity';
import { challenge, sign } from './sign';
export interface clientInterface {
    source: Address,
    signer: KeyringPair,
    con: WebSocket
    // url: string
}

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
    // update url with to
    url = `${url}?${token}`;
    console.log(url)
    // start websocket connection with updated url
    const ws = new WebSocket(url);

    // create source from twin id and session string using generated proto types
    const source = new Address();
    source.setTwin(twinId);
    source.setConnection(session);

    // create client with websocket connection
    const client: clientInterface = {
        source: source,
        signer: identity,
        con: ws,
        // url: url

    }

    return client;

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
    // const response = new Response();
    envelope.setRequest(request);
    const signature = signEnvelope(envelope, identity)
    envelope.setSignature(signature);
    // console.log(envelope);
    return envelope;

}
function signEnvelope(envelope: Envelope, identity: KeyringPair) {
    const toSign = challenge(envelope);

    return sign(toSign, identity);
}

