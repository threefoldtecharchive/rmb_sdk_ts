import ReconnectingWebSocket from "reconnecting-websocket";
import { Envelope } from "./types/types_pb";
import Ws from 'ws';
import { directClientInterface } from "./direct";

export function connect(client: directClientInterface) {

    // start websocket connection with updated url
    const options = {
        WebSocket: Ws,
        debug: true,
    }
    const ws = new ReconnectingWebSocket(client.url, [], options);

    return ws;
}
export function listening(requestID: string, client: directClientInterface, socket: ReconnectingWebSocket) {
    socket.onmessage = (e) => {
        console.log("waiting response...");
        // need to verify first
        if (client.responses.get(requestID)) {
            const receivedEnvelope = Envelope.deserializeBinary(e.data);

            const response = receivedEnvelope.getResponse();

            if (response) {
                const reply = response.getReply();
                const err = response.getError();
                if (reply) {
                    const dataReceieved = reply.getData();
                    const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceieved))
                    console.log(`response: ${JSON.parse(decodedData)}`);
                } else if (err) {
                    console.log(`error: ${err.getCode()} ${err.getMessage()}`);
                }
            }
        }

    }
}
