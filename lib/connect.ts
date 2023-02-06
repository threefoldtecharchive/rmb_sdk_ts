import ReconnectingWebSocket from "reconnecting-websocket";
import { Envelope } from "./types/types_pb";
import Ws from 'ws';

export function connect(url: string) {

    // start websocket connection with updated url
    const options = {
        WebSocket: Ws,
        debug: true,
    }
    const ws = new ReconnectingWebSocket(url, [], options);

    ws.onmessage = (e) => {
        console.log("waiting response...");

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

    return ws;
}
