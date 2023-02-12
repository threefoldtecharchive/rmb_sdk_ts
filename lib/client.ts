import { KeyringPair } from "@polkadot/keyring/types";
import ReconnectingWebSocket from "reconnecting-websocket";
import { Address, Envelope, Error } from "./types/lib/types";
import { waitReady } from '@polkadot/wasm-crypto';
import { ApiPromise, Keyring, WsProvider } from '@polkadot/api'
import { KeypairType } from "@polkadot/util-crypto/types";
import base64url from "base64url";
import Ws from 'ws';
import ClientEnvelope from "./envelope";

enum KPType {
    sr25519 = "sr25519",
    ed25519 = "ed25519",

}
class Client {


    signer!: KeyringPair;
    source: Address = new Address();
    twinId: number = 0;
    responses;
    con!: ReconnectingWebSocket;
    mnemonics: string;
    relayUrl: string
    chainUrl: string
    session: string
    keypairType: KeypairType


    constructor(chainUrl: string, relayUrl: string, mnemonics: string, session: string, keypairType: string) {
        this.responses = new Map<string, Envelope>();
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

    sign(payload: string | Uint8Array) {
        const typePrefix = this.signer.type === KPType.sr25519 ? "s" : "e";
        const sig = this.signer.sign(payload);
        const prefix = Buffer.from(typePrefix).readUint8(0)
        const sigPrefixed = new Uint8Array([prefix, ...sig]);
        return sigPrefixed;
    }

    send(requestCommand: string, requestData: any, destinationTwinId: number, expirationMinutes: number) {
        // create new envelope with given data and destination
        const envelope = new ClientEnvelope(this, this.source, destinationTwinId, requestCommand, requestData, expirationMinutes);
        // send enevelope binary using socket
        this.con.send(envelope.serializeBinary());
        // add request id to responses map on client object
        this.responses.set(envelope.uid, envelope)
        return envelope.uid;

    }

    read(requestID: string) {
        return new Promise((resolve, reject) => {

            if (this.responses.get(requestID)) {

                const result = setInterval(() => {
                    // check if envelope in map has a response 
                    if (this.responses.get(requestID)?.response) {
                        const dataReceived = this.responses.get(requestID)?.plain;
                        if (dataReceived) {
                            const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceived))
                            const responseString = JSON.parse(decodedData);
                            resolve(responseString);
                            this.responses.delete(requestID);
                            clearInterval(result)
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
        await this.getTwinId();
        this.updateUrl();
        this.updateSource();
        // start websocket connection with updated url
        const options = {
            WebSocket: Ws,
            debug: true,
        }
        this.con = new ReconnectingWebSocket(this.relayUrl, [], options);
        this.con.onmessage = (e: any) => {
            console.log("waiting response...");

            const receivedEnvelope = Envelope.deserializeBinary(e.data);

            //verify
            if (this.responses.get(receivedEnvelope.uid)) {
                // update envelope in responses map
                this.responses.set(receivedEnvelope.uid, receivedEnvelope)
            }

        }

    }
    async createSigner() {
        await waitReady()
        const keyring = new Keyring({ type: this.keypairType });
        this.signer = keyring.addFromMnemonic(this.mnemonics);
    }
    updateSource() {
        this.source.twin = this.twinId;
        this.source.connection = this.session;
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
    updateUrl() {
        // create token from identity
        const token = this.newJWT(this.session)

        // update url with token
        this.relayUrl = `${this.relayUrl}?${token}`;

    }
    async getTwinId() {
        const provider = new WsProvider(this.chainUrl)
        const cl = await ApiPromise.create({ provider })
        this.twinId = Number(await cl.query.tfgridModule.twinIdByAccountID(this.signer.address));
        cl.disconnect();


    }
}
export { Client };







