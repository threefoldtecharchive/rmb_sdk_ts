"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listening = exports.connect = void 0;
const reconnecting_websocket_1 = __importDefault(require("reconnecting-websocket"));
const types_pb_1 = require("./types/types_pb");
const ws_1 = __importDefault(require("ws"));
function connect(client) {
    // start websocket connection with updated url
    const options = {
        WebSocket: ws_1.default,
        debug: true,
    };
    const ws = new reconnecting_websocket_1.default(client.url, [], options);
    return ws;
}
exports.connect = connect;
function listening(requestID, client, socket) {
    return new Promise((resolve, reject) => {
        socket.onmessage = (e) => {
            console.log("waiting response...");
            // need to verify first
            if (client.responses.get(requestID)) {
                const receivedEnvelope = types_pb_1.Envelope.deserializeBinary(e.data);
                const response = receivedEnvelope.getResponse();
                if (response) {
                    const reply = response.getReply();
                    const err = response.getError();
                    if (reply) {
                        const dataReceieved = reply.getData();
                        const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceieved));
                        const responseString = JSON.parse(decodedData);
                        resolve(responseString);
                    }
                    else if (err) {
                        const errString = `${err.getCode()} ${err.getMessage()}`;
                        reject(errString);
                    }
                }
                // remove no longer needed key value pair
                client.responses.delete(requestID);
            }
        };
    });
}
exports.listening = listening;
