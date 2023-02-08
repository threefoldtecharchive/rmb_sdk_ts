import { KeyringPair } from "@polkadot/keyring/types";
import ReconnectingWebSocket from "reconnecting-websocket";
import { Address, Envelope, Request, Response } from "./types/types_pb";
import { waitReady } from '@polkadot/wasm-crypto';
import { v4 as uuidv4 } from 'uuid';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { KeypairType } from "@polkadot/util-crypto/types";
import crypto from 'crypto';
import base64url from "base64url";
import Ws from 'ws';
const CHAIN_WS = "wss://tfchain.dev.grid.tf/ws";
enum KPType {
    sr25519 = "sr25519",
    ed25519 = "ed25519"
}
class Client {
    signer!: KeyringPair;
    source: Address = new Address();
    twinId: number = 0;
    url: string = "";
    responses;
    con!: ReconnectingWebSocket;


    constructor() {
        this.responses = new Map<string, Envelope>;

    }
    signEnvelope(envelope: Envelope) {
        const toSign = this.challenge(envelope);

        return this.sign(toSign);
    }
    sign(payload: string | Uint8Array) {
        const typePrefix = this.signer.type === KPType.sr25519 ? "s" : "e";
        const sig = this.signer.sign(payload);
        const prefix = Buffer.from(typePrefix).readUint8(0)
        const sigPrefixed = new Uint8Array([prefix, ...sig]);
        return sigPrefixed;
    }
    challenge(envelope: Envelope) {
        const request = envelope.getRequest();
        const response = envelope.getResponse();

        let hash = crypto.createHash('md5')
            .update(envelope.getUid())
            .update(envelope.getTags())
            .update(`${envelope.getTimestamp()}`)
            .update(`${envelope.getExpiration()}`)
            .update(this.challengeAddress(envelope.getSource()))
            .update(this.challengeAddress(envelope.getDestination()))

        if (request) {
            hash = this.challengeRequest(request, hash);
        }
        else if (response) {
            this.challengeResponse(response);
        }

        return hash.digest();

    }
    challengeAddress(address: Address | undefined) {
        return `${address?.getTwin()}${address?.getConnection()}`;

    }
    challengeRequest(request: Request, hash: crypto.Hash) {
        return hash.update(request.getCommand()).update(request.getData());
    }
    challengeResponse(response: Response) {
        const err = response.getError();
        const reply = response.getReply();
        if (err) {
            console.log(err.getCode(), err.getMessage());
        } else {
            console.log(reply?.getData())
        }
    }
    newEnvelope(destTwinId: number, requestCommand: string, requestData: any, expirationMinutes: number) {
        const envelope = new Envelope();
        envelope.setUid(uuidv4());
        envelope.setTimestamp(Math.round(Date.now() / 1000));
        envelope.setExpiration(expirationMinutes * 60);
        const source = new Address();
        source.setTwin(this.twinId);
        source.setConnection(this.source.getConnection());
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
        const signature = this.signEnvelope(envelope)
        envelope.setSignature(signature);

        return envelope;

    }
    send(requestCommand: string, requestData: any, destinationTwinId: number, expirationMinutes: number) {
        // create new envelope with given data and destination
        const envelope = this.newEnvelope(destinationTwinId, requestCommand, requestData, expirationMinutes);
        // send enevelope binary using socket
        this.con.send(envelope.serializeBinary());
        console.log('envelope sent')
        // add request id to responses map on client object
        this.responses.set(envelope.getUid(), envelope)
        return envelope.getUid();

    }

    listen(requestID: string, callback: (x: any) => void) {

        const result = setInterval(() => {
            while (this.responses.get(requestID)) {

                if (this.responses.get(requestID)?.getResponse()) {

                    const response = this.responses.get(requestID)?.getResponse();
                    const reply = response?.getReply();
                    const err = response?.getError();
                    this.responses.delete(requestID);

                    if (reply) {
                        const dataReceieved = reply.getData();
                        const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceieved))
                        const responseString = JSON.parse(decodedData);
                        clearInterval(result)
                        callback(responseString);

                    }
                    if (err) {
                        const errString = `${err.getCode()} ${err.getMessage()}`
                        callback(errString)
                    }

                }

            }
        }, 1000)

    }



    async connect(url: string, session: string, mnemonics: string, accountType: KeypairType) {
        await this.createSigner(mnemonics, accountType);
        await this.getTwinId(); // async;
        this.updateUrl(url, session);
        this.updateSource(session);
        // start websocket connection with updated url
        const options = {
            WebSocket: Ws,
            debug: true,
        }
        this.con = new ReconnectingWebSocket(this.url, [], options);
        this.con.onmessage = (e: any) => {
            console.log("waiting response...");
            const receivedEnvelope = Envelope.deserializeBinary(e.data);
            //verify
            if (this.responses.get(receivedEnvelope.getUid())) {
                // update envelope in responses map
                this.responses.set(receivedEnvelope.getUid(), receivedEnvelope)
            }

        }

    }
    async createSigner(mnemonics: string, accountType: KeypairType) {
        await waitReady()
        const keyring = new Keyring({ type: accountType });
        this.signer = keyring.addFromMnemonic(mnemonics);
    }
    updateSource(session: string) {
        this.source.setTwin(this.twinId);
        this.source.setConnection(session);
    }
    newJWT(session: string) {
        const header = {
            alg: "RS512",
            typ: "JWT"
        };

        const now = Math.ceil(Date.now().valueOf() / 1000);
        const claims = {
            sub: this.twinId,
            iat: now,
            exp: now + 1000,
            sid: session,
        }
        const jwt = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claims));

        const sigPrefixed = this.sign(jwt);
        const token = jwt + "." + base64url(Buffer.from(sigPrefixed));
        return token;

    }
    updateUrl(url: string, session: string) {
        // create token from identity
        const token = this.newJWT(session)

        // update url with token
        this.url = `${url}?${token}`;

    }
    async getTwinId() {
        const provider = new WsProvider(CHAIN_WS)
        const cl = await ApiPromise.create({ provider })
        this.twinId = Number(await cl.query.tfgridModule.twinIdByAccountID(this.signer.address));
        cl.disconnect();


    }
}
export { Client };







