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
Object.defineProperty(exports, "__esModule", { value: true });
exports.newEnvelope = exports.sendDirectRequest = exports.createDirectClient = exports.newDirectClient = exports.getTwinId = void 0;
const identity_1 = require("./identity");
const jwt_1 = require("./jwt");
const sign_1 = require("./sign");
const types_pb_1 = require("./types/types_pb");
const wasm_crypto_1 = require("@polkadot/wasm-crypto");
const uuid_1 = require("uuid");
const api_1 = require("@polkadot/api");
function getTwinId(address) {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = new api_1.WsProvider("wss://tfchain.dev.grid.tf/ws");
        const cl = yield api_1.ApiPromise.create({ provider });
        const twin = yield cl.query.tfgridModule.twinIdByAccountID(address);
        console.log(twin);
        cl.disconnect();
        return twin;
    });
}
exports.getTwinId = getTwinId;
function newDirectClient(url, session, mnemonics, accountType) {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, wasm_crypto_1.waitReady)();
        // create identity of source
        const identity = (0, identity_1.createIdentity)(mnemonics, accountType);
        const twinId = Number(yield getTwinId(identity.address));
        // create token from identity
        const token = (0, jwt_1.newJWT)(identity, twinId, session);
        // update url with token
        url = `${url}?${token}`;
        // create source from twin id and session string using generated proto types
        const source = new types_pb_1.Address();
        source.setTwin(twinId);
        source.setConnection(session);
        // connect websocket
        const responses = new Map();
        // create client with websocket connection
        const client = {
            source: source,
            signer: identity,
            twinId: twinId,
            url: url,
            responses: responses
        };
        return client;
    });
}
exports.newDirectClient = newDirectClient;
function createDirectClient(url, session, mnemonics, keyType) {
    return __awaiter(this, void 0, void 0, function* () {
        // create client
        const client = yield newDirectClient(url, session, mnemonics, keyType);
        return client;
    });
}
exports.createDirectClient = createDirectClient;
function sendDirectRequest(client, socket, requestCommand, requestData, destinationTwinId) {
    // create new envelope with given data and destination
    const envelope = newEnvelope(client.twinId, client.source.getConnection(), destinationTwinId, client.signer, requestCommand, requestData);
    // send enevelope binary using socket
    socket.send(envelope.serializeBinary());
    console.log('envelope sent');
    // add request id to responses map on client object
    const requestID = (0, uuid_1.v4)();
    client.responses.set(requestID, envelope);
    console.log(client.responses);
    return requestID;
}
exports.sendDirectRequest = sendDirectRequest;
function newEnvelope(sourceTwinId, session, destTwinId, identity, requestCommand, requestData) {
    const envelope = new types_pb_1.Envelope();
    envelope.setUid((0, uuid_1.v4)());
    envelope.setTimestamp(Math.round(Date.now() / 1000));
    envelope.setExpiration(5 * 60);
    const source = new types_pb_1.Address();
    source.setTwin(sourceTwinId);
    source.setConnection(session);
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
    const signature = signEnvelope(envelope, identity);
    envelope.setSignature(signature);
    return envelope;
}
exports.newEnvelope = newEnvelope;
function signEnvelope(envelope, identity) {
    const toSign = (0, sign_1.challenge)(envelope);
    return (0, sign_1.sign)(toSign, identity);
}
