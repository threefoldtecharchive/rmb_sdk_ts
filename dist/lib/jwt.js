"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.newJWT = void 0;
const base64url_1 = __importDefault(require("base64url"));
const sign_1 = require("./sign");
/**
 * create jwt token string
 * @param identity
 * @param id
 * @param session
 * @returns token string
 */
function newJWT(identity, id, session) {
    const header = {
        alg: "RS512",
        typ: "JWT"
    };
    const now = Math.ceil(Date.now().valueOf() / 1000);
    const claims = {
        sub: id,
        iat: now,
        exp: now + 1000,
        sid: session,
    };
    const jwt = (0, base64url_1.default)(JSON.stringify(header)) + "." + (0, base64url_1.default)(JSON.stringify(claims));
    const sigPrefixed = (0, sign_1.sign)(jwt, identity);
    const token = jwt + "." + (0, base64url_1.default)(Buffer.from(sigPrefixed));
    return token;
}
exports.newJWT = newJWT;
