import { newClient, newEnvelope, clientInterface } from "../../lib/direct";
import { Envelope } from "../../lib/types/types_pb";
import WebSocket from 'ws';
let socket: any = null;
let client: clientInterface;
let envelope: Envelope
async function connect_socket() {
    // create client
    client = await newClient(`ws://localhost:8080/`, 1206, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519');
    console.log('Connected', client)
    socket = client.con
    envelope = newEnvelope(1206, client.source.getConnection(), 1292, client.signer, "calculator.add", [10.6, 20]);
    socket.on('open', () => {
        socket.send(envelope.serializeBinary());
        console.log('envelope sent')
        heartbeat();
    });

}
function heartbeat() {
    if (!socket) return;
    if (socket.readyState != 1) return;
    console.log("waiting  on message receival")
    socket.on('message', (data: Buffer) => {
        console.log("received:", data);
        const receivedEnvelope = Envelope.deserializeBinary(data);
        console.log(receivedEnvelope.hasResponse());
        const response = receivedEnvelope.getResponse();
        if (response) {
            const reply = response.getReply();
            const err = response.getError();
            if (reply) {
                const dataReceieved = reply.getData();
                const decodedData = new TextDecoder('utf8').decode(Buffer.from(dataReceieved))
                console.log("response: ", JSON.parse(decodedData))
            } else if (err) {
                console.log(err.getCode(), err.getMessage());
            }
        }

    })

}
connect_socket()