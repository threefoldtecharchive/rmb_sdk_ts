import { KeyringPair } from "@polkadot/keyring/types";
import ReconnectingWebSocket from "reconnecting-websocket";
import { Address, Envelope, Error, Request } from "./types/lib/types";
import { waitReady } from '@polkadot/wasm-crypto';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { KeypairType } from "@polkadot/util-crypto/types";
import base64url from "base64url";
import Ws from 'ws';
import ClientEnvelope from "./envelope";
import { Buffer } from "buffer"
import { sign, KPType } from './sign'
import { v4 as uuidv4 } from 'uuid';


class Client {
    signer!: KeyringPair;
    source: Address = new Address();
    responses;
    con!: ReconnectingWebSocket;
    mnemonics: string;
    relayUrl: string
    chainUrl: string
    session: string
    keypairType: KeypairType
    twin: any;


    constructor(chainUrl: string, relayUrl: string, mnemonics: string, session: string, keypairType: string) {
        this.responses = new Map<string, ClientEnvelope>();
        this.mnemonics = mnemonics;
        this.relayUrl = relayUrl;
        this.session = session;
        if (keypairType.toLowerCase().trim() == 'sr25519') {
            this.keypairType = KPType.sr25519;
        } else if (keypairType.toLowerCase().trim() == 'ed25519') {
            this.keypairType = KPType.ed25519
        } else {
            throw new Error({ message: "Unsupported Keypair type" })
        }

        this.chainUrl = chainUrl;


    }
    close() {
        if (this.con.readyState != this.con.CLOSED) {
            this.con.close();
        }

    }
    reconnect() {
        if (this.con.readyState != this.con.OPEN) {
            this.con.reconnect();
        }

    }


    send(requestCommand: string, requestData: any, destinationTwinId: number, expirationMinutes: number) {
        // create new envelope with given data and destination
        const envelope = new Envelope({
            uid: uuidv4(),
            timestamp: Math.round(Date.now() / 1000),
            expiration: expirationMinutes * 60,
            source: this.source,
            destination: new Address({ twin: destinationTwinId })
        });
        if (requestCommand) {
            envelope.request = new Request({ command: requestCommand })
        }
        if (requestData) {
            envelope.plain = new Uint8Array(Buffer.from(requestData));

        }
        const clientEnvelope = new ClientEnvelope(this.signer, envelope, this.chainUrl);
        // send enevelope binary using socket
        this.con.send(clientEnvelope.serializeBinary());
        // add request id to responses map on client object
        this.responses.set(clientEnvelope.uid, clientEnvelope)
        return clientEnvelope.uid;

    }

    read(requestID: string) {
        return new Promise((resolve, reject) => {

            if (this.responses.get(requestID)) {

                const result = setInterval(async () => {
                    // check if envelope in map has a response 
                    if (this.responses.get(requestID)?.response) {
                        const envelope = this.responses.get(requestID);
                        if (envelope) {

                            const verified = await envelope.verify(envelope.signature)
                            if (verified) {
                                const dataReceived = this.responses.get(requestID)?.plain;
                                if (dataReceived) {
                                    const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceived))
                                    const responseString = JSON.parse(decodedData);
                                    resolve(responseString);
                                    this.responses.delete(requestID);
                                    clearInterval(result)
                                }
                            } else {
                                resolve("invalid signature, discarding response");
                                this.responses.delete(requestID);
                                clearInterval(result);
                            }



                        }


                    }
                    // check if envelope in map has an error
                    else if (this.responses.get(requestID)?.error) {
                        const err = this.responses.get(requestID)?.error
                        if (err) {
                            reject(`${err.code} ${err.message}`);
                            this.responses.delete(requestID);
                            clearInterval(result)
                        }


                    }


                }, 1000)
            }

        })
    }




    async connect() {
        await this.createSigner();
        await this.getSourceTwin();
        this.updateUrl();
        this.updateSource();
        // start websocket connection with updated url
        const options = {
            WebSocket: Ws,
            debug: true,
        }
        this.con = new ReconnectingWebSocket(this.relayUrl, [], options);
        this.con.onmessage = (e: any) => {
            const receivedEnvelope = Envelope.deserializeBinary(e.data);
            // cast received enevelope to client envelope
            const castedEnvelope = new ClientEnvelope(undefined, receivedEnvelope, this.chainUrl)
            //verify
            if (this.responses.get(receivedEnvelope.uid)) {
                // update envelope in responses map
                this.responses.set(receivedEnvelope.uid, castedEnvelope)
            }

        }

    }
    async createSigner() {
        await waitReady()
        const keyring = new Keyring({ type: this.keypairType });
        this.signer = keyring.addFromMnemonic(this.mnemonics);
    }
    updateSource() {
        this.source.twin = this.twin.id;
        this.source.connection = this.session;
    }
    newJWT(session: string) {
        const header = {
            alg: "RS512",
            typ: "JWT"
        };

        const now = Math.ceil(Date.now().valueOf() / 1000);
        const claims = {
            sub: this.twin.id,
            iat: now,
            exp: now + 1000,
            sid: session,
        }
        const jwt = base64url(JSON.stringify(header)) + "." + base64url(JSON.stringify(claims));

        const sigPrefixed = sign(jwt, this.signer);
        const token = jwt + "." + base64url(Buffer.from(sigPrefixed));
        return token;

    }
    updateUrl() {
        // create token from identity
        const token = this.newJWT(this.session)

        // update url with token
        this.relayUrl = `${this.relayUrl}?${token}`;

    }
    async getSourceTwin() {
        const provider = new WsProvider(this.chainUrl)
        const cl = await ApiPromise.create({ provider })
        const twinId = Number(await cl.query.tfgridModule.twinIdByAccountID(this.signer.address));
        this.twin = (await cl.query.tfgridModule.twins(twinId)).toJSON();
        cl.disconnect();

    }

}
export { Client };







