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
const types_pb_1 = require("./types/types_pb");
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
        this.source = new types_pb_1.Address();
        this.twinId = 0;
        this.url = "";
        this.responses = new Map();
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
        const request = envelope.getRequest();
        const response = envelope.getResponse();
        let hash = crypto_1.default.createHash('md5')
            .update(envelope.getUid())
            .update(envelope.getTags())
            .update(`${envelope.getTimestamp()}`)
            .update(`${envelope.getExpiration()}`)
            .update(this.challengeAddress(envelope.getSource()))
            .update(this.challengeAddress(envelope.getDestination()));
        if (request) {
            hash = this.challengeRequest(request, hash);
        }
        else if (response) {
            this.challengeResponse(response);
        }
        return hash.digest();
    }
    challengeAddress(address) {
        return `${address === null || address === void 0 ? void 0 : address.getTwin()}${address === null || address === void 0 ? void 0 : address.getConnection()}`;
    }
    challengeRequest(request, hash) {
        return hash.update(request.getCommand()).update(request.getData());
    }
    challengeResponse(response) {
        const err = response.getError();
        const reply = response.getReply();
        if (err) {
            console.log(err.getCode(), err.getMessage());
        }
        else {
            console.log(reply === null || reply === void 0 ? void 0 : reply.getData());
        }
    }
    newEnvelope(destTwinId, requestCommand, requestData, expirationMinutes) {
        const envelope = new types_pb_1.Envelope();
        envelope.setUid((0, uuid_1.v4)());
        envelope.setTimestamp(Math.round(Date.now() / 1000));
        envelope.setExpiration(expirationMinutes * 60);
        const source = new types_pb_1.Address();
        source.setTwin(this.twinId);
        source.setConnection(this.source.getConnection());
        envelope.setSource(source);
        const destination = new types_pb_1.Address();
        destination.setTwin(destTwinId);
        // destination.setConnection(null);
        envelope.setDestination(destination);
        envelope.setSchema("application/json");
        const request = new types_pb_1.Request();
        request.setCommand(requestCommand);
        request.setData(Buffer.from(JSON.stringify(requestData)));
        envelope.setRequest(request);
        const signature = this.signEnvelope(envelope);
        envelope.setSignature(signature);
        return envelope;
    }
    send(requestCommand, requestData, destinationTwinId, expirationMinutes) {
        // create new envelope with given data and destination
        const envelope = this.newEnvelope(destinationTwinId, requestCommand, requestData, expirationMinutes);
        // send enevelope binary using socket
        this.con.send(envelope.serializeBinary());
        console.log('envelope sent');
        // add request id to responses map on client object
        this.responses.set(envelope.getUid(), envelope);
        return envelope.getUid();
    }
    listen(requestID, callback) {
        const result = setInterval(() => {
            var _a, _b;
            while (this.responses.get(requestID)) {
                if ((_a = this.responses.get(requestID)) === null || _a === void 0 ? void 0 : _a.getResponse()) {
                    const response = (_b = this.responses.get(requestID)) === null || _b === void 0 ? void 0 : _b.getResponse();
                    const reply = response === null || response === void 0 ? void 0 : response.getReply();
                    const err = response === null || response === void 0 ? void 0 : response.getError();
                    this.responses.delete(requestID);
                    if (reply) {
                        const dataReceieved = reply.getData();
                        const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceieved));
                        const responseString = JSON.parse(decodedData);
                        clearInterval(result);
                        callback(responseString);
                    }
                    if (err) {
                        const errString = `${err.getCode()} ${err.getMessage()}`;
                        callback(errString);
                    }
                }
            }
        }, 1000);
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
                const receivedEnvelope = types_pb_1.Envelope.deserializeBinary(e.data);
                //verify
                if (this.responses.get(receivedEnvelope.getUid())) {
                    // update envelope in responses map
                    this.responses.set(receivedEnvelope.getUid(), receivedEnvelope);
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
        this.source.setTwin(this.twinId);
        this.source.setConnection(session);
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
