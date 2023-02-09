"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Client = void 0;
const reconnecting_websocket_1 = __importDefault(require("reconnecting-websocket"));
const types_1 = require("./types/lib/types");
const wasm_crypto_1 = require("@polkadot/wasm-crypto");
const uuid_1 = require("uuid");
const api_1 = require("@polkadot/api");
const crypto_1 = __importDefault(require("crypto"));
const base64url_1 = __importDefault(require("base64url"));
const ws_1 = __importDefault(require("ws"));
const CHAIN_WS = "wss://tfchain.dev.grid.tf/ws";
var KPType;
(function (KPType) {
    KPType["sr25519"] = "sr25519";
    KPType["ed25519"] = "ed25519";
})(KPType || (KPType = {}));
class Client {
    constructor() {
        this.source = new types_1.Address();
        this.twinId = 0;
        this.url = "";
        this.responses = new Map();
    }
    close() {
        if (this.con.readyState != 3) {
            this.con.close();
        }
    }
    reconnect() {
        if (this.con.readyState != 1) {
            this.con.reconnect();
        }
    }
    signEnvelope(envelope) {
        const toSign = this.challenge(envelope);
        return this.sign(toSign);
    }
    sign(payload) {
        const typePrefix = this.signer.type === KPType.sr25519 ? "s" : "e";
        const sig = this.signer.sign(payload);
        const prefix = Buffer.from(typePrefix).readUint8(0);
        const sigPrefixed = new Uint8Array([prefix, ...sig]);
        return sigPrefixed;
    }
    challenge(envelope) {
        const request = envelope.request;
        const response = envelope.response;
        const err = envelope.error;
        let hash = crypto_1.default.createHash('md5')
            .update(envelope.uid)
            .update(envelope.tags)
            .update(`${envelope.timestamp}`)
            .update(`${envelope.expiration}`)
            .update(this.challengeAddress(envelope.source))
            .update(this.challengeAddress(envelope.destination));
        if (request) {
            hash = this.challengeRequest(request, hash);
        }
        else if (response) {
            hash = this.challengeResponse(response, hash);
        }
        else if (err) {
            hash = this.challengeError(err, hash);
        }
        if (envelope.schema) {
            hash.update(envelope.schema);
        }
        if (envelope.federation) {
            hash.update(envelope.federation);
        }
        if (envelope.plain) {
            hash.update(envelope.plain);
        }
        else if (envelope.cipher) {
            hash.update(envelope.cipher);
        }
        return hash.digest();
    }
    challengeAddress(address) {
        return `${address === null || address === void 0 ? void 0 : address.twin}${address === null || address === void 0 ? void 0 : address.connection}`;
    }
    challengeError(err, hash) {
        return hash.update(`${err.code}${err.message}`);
    }
    challengeRequest(request, hash) {
        return hash.update(request.command);
    }
    challengeResponse(response, hash) {
        // to be implemented 
        return hash;
    }
    newEnvelope(destTwinId, requestCommand, requestData, expirationMinutes) {
        const envelope = new types_1.Envelope({
            uid: (0, uuid_1.v4)(),
            timestamp: Math.round(Date.now() / 1000),
            expiration: expirationMinutes * 60,
            source: new types_1.Address({ twin: this.twinId, connection: this.source.connection }),
            destination: new types_1.Address({ twin: destTwinId }),
            request: new types_1.Request({ command: requestCommand }),
        });
        if (requestData) {
            envelope.plain = new Uint8Array(Buffer.from(JSON.stringify(requestData)));
        }
        envelope.schema = "application/json";
        envelope.signature = this.signEnvelope(envelope);
        return envelope;
    }
    send(requestCommand, requestData, destinationTwinId, expirationMinutes) {
        // create new envelope with given data and destination
        const envelope = this.newEnvelope(destinationTwinId, requestCommand, requestData, expirationMinutes);
        // send enevelope binary using socket
        this.con.send(envelope.serializeBinary());
        // add request id to responses map on client object
        this.responses.set(envelope.uid, envelope);
        return envelope.uid;
    }
    listen(requestID, callback) {
        if (this.responses.get(requestID)) {
            const result = setInterval(() => {
                var _a, _b, _c, _d;
                // check if envelope in map has a response 
                if ((_a = this.responses.get(requestID)) === null || _a === void 0 ? void 0 : _a.response) {
                    const dataReceived = (_b = this.responses.get(requestID)) === null || _b === void 0 ? void 0 : _b.plain;
                    if (dataReceived) {
                        const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceived));
                        const responseString = JSON.parse(decodedData);
                        callback(responseString);
                        this.responses.delete(requestID);
                        clearInterval(result);
                    }
                }
                // check if envelope in map has an error
                else if ((_c = this.responses.get(requestID)) === null || _c === void 0 ? void 0 : _c.error) {
                    const err = (_d = this.responses.get(requestID)) === null || _d === void 0 ? void 0 : _d.error;
                    if (err) {
                        callback(`${err.code} ${err.message}`);
                        this.responses.delete(requestID);
                        clearInterval(result);
                    }
                }
            }, 1000);
        }
    }
    connect(url, session, mnemonics, accountType) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.createSigner(mnemonics, accountType);
            yield this.getTwinId(); // async;
            this.updateUrl(url, session);
            this.updateSource(session);
            // start websocket connection with updated url
            const options = {
                WebSocket: ws_1.default,
                debug: true,
            };
            this.con = new reconnecting_websocket_1.default(this.url, [], options);
            this.con.onmessage = (e) => {
                console.log("waiting response...");
                const receivedEnvelope = types_1.Envelope.deserializeBinary(e.data);
                //verify
                if (this.responses.get(receivedEnvelope.uid)) {
                    // update envelope in responses map
                    this.responses.set(receivedEnvelope.uid, receivedEnvelope);
                }
            };
        });
    }
    createSigner(mnemonics, accountType) {
        return __awaiter(this, void 0, void 0, function* () {
            yield (0, wasm_crypto_1.waitReady)();
            const keyring = new api_1.Keyring({ type: accountType });
            this.signer = keyring.addFromMnemonic(mnemonics);
        });
    }
    updateSource(session) {
        this.source.twin = this.twinId;
        this.source.connection = session;
    }
    newJWT(session) {
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
        };
        const jwt = (0, base64url_1.default)(JSON.stringify(header)) + "." + (0, base64url_1.default)(JSON.stringify(claims));
        const sigPrefixed = this.sign(jwt);
        const token = jwt + "." + (0, base64url_1.default)(Buffer.from(sigPrefixed));
        return token;
    }
    updateUrl(url, session) {
        // create token from identity
        const token = this.newJWT(session);
        // update url with token
        this.url = `${url}?${token}`;
    }
    getTwinId() {
        return __awaiter(this, void 0, void 0, function* () {
            const provider = new api_1.WsProvider(CHAIN_WS);
            const cl = yield api_1.ApiPromise.create({ provider });
            this.twinId = Number(yield cl.query.tfgridModule.twinIdByAccountID(this.signer.address));
            cl.disconnect();
        });
    }
}
exports.Client = Client;
