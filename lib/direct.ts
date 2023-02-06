import { KeyringPair } from "@polkadot/keyring/types";
import ReconnectingWebSocket from "reconnecting-websocket";
import { connect } from "./connect";
import { createIdentity } from "./identity";
import { newJWT } from "./jwt";
import { challenge, sign } from "./sign";
import { Address, Envelope, Request } from "./types/types_pb";
import { waitReady } from '@polkadot/wasm-crypto';
import { v4 as uuidv4 } from 'uuid';
import { ApiPromise, WsProvider } from '@polkadot/api'
interface directClientInterface {
    source: Address,
    signer: KeyringPair,
    connected: boolean,
    con: ReconnectingWebSocket,
}
export async function getTwinId(address: string) {
    const provider = new WsProvider("wss://tfchain.dev.grid.tf/ws")
    const cl = await ApiPromise.create({ provider })
    const twin = await cl.query.tfgridModule.twinIdByAccountID(address);
    console.log(twin)
    cl.disconnect();
    return twin;

}
export async function newDirectClient(url: string, session: string, mnemonics: string, accountType: string) {
    await waitReady();

    // create identity of source
    const identity = createIdentity(mnemonics, accountType);
    const twinId = Number(await getTwinId(identity.address));
    // create token from identity
    const token = newJWT(identity, twinId, session)

    // update url with token
    url = `${url}?${token}`;

    // create source from twin id and session string using generated proto types
    const source = new Address();
    source.setTwin(twinId);
    source.setConnection(session);

    // connect websocket
    const socket = connect(url);

    // create client with websocket connection
    const client: directClientInterface = {
        source: source,
        signer: identity,
        connected: true,
        con: socket,
    }

    return client;

}
export async function createDirectClient(url: string, session: string, mnemonics: string, keyType: string) {
    // create client
    const client = await newDirectClient(url, session, mnemonics, keyType);

    return client;

}
export function sendDirectRequest(sourceTwinId: number, client: directClientInterface, socket: ReconnectingWebSocket, requestCommand: string, requestData: any[], destinationTwinId: number) {

    // create new envelope with given data and destination
    const envelope = newEnvelope(sourceTwinId, client.source.getConnection(), destinationTwinId, client.signer, requestCommand, requestData);

    // send enevelope binary using socket
    socket.send(envelope.serializeBinary());
    console.log('envelope sent')
    // add request id to responses map on client object
    const requestID = uuidv4();

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

