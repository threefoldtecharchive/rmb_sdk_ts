"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.challengeResponse = exports.challengeRequest = exports.challengeAddress = exports.challenge = exports.sign = void 0;
const crypto_1 = __importDefault(require("crypto"));
const identity_1 = require("./identity");
function sign(payload, identity) {
    const typePrefix = identity.type === identity_1.KeypairType.sr25519 ? "s" : "e";
    const sig = identity.sign(payload);
    const prefix = Buffer.from(typePrefix).readUint8(0);
    const sigPrefixed = new Uint8Array([prefix, ...sig]);
    return sigPrefixed;
}
exports.sign = sign;
function challenge(envelope) {
    const request = envelope.getRequest();
    const response = envelope.getResponse();
    let hash = crypto_1.default.createHash('md5')
        .update(envelope.getUid())
        .update(envelope.getTags())
        .update(`${envelope.getTimestamp()}`)
        .update(`${envelope.getExpiration()}`)
        .update(challengeAddress(envelope.getSource()))
        .update(challengeAddress(envelope.getDestination()));
    if (request) {
        hash = challengeRequest(request, hash);
    }
    else if (response) {
        challengeResponse(response);
    }
    return hash.digest();
}
exports.challenge = challenge;
function challengeAddress(address) {
    return `${address === null || address === void 0 ? void 0 : address.getTwin()}${address === null || address === void 0 ? void 0 : address.getConnection()}`;
}
exports.challengeAddress = challengeAddress;
function challengeRequest(request, hash) {
    return hash.update(request.getCommand()).update(request.getData());
}
exports.challengeRequest = challengeRequest;
function challengeResponse(response) {
    const err = response.getError();
    const reply = response.getReply();
    if (err) {
        console.log(err.getCode(), err.getMessage());
    }
    else {
        console.log(reply === null || reply === void 0 ? void 0 : reply.getData());
    }
}
exports.challengeResponse = challengeResponse;
