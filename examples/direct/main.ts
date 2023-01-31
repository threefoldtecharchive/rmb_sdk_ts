import { newClient, newEnvelope } from "../../lib/direct";
import { Envelope } from "../../lib/types/types_pb";

async function main() {

    // create client
    const client = await newClient(`wss://relay.dev.grid.tf`, 1206, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519');
    console.log('Connected', client)
    const con = client.con;
    const envelope = newEnvelope(1200, client.source.getConnection(), 1200, client.signer, "calculator.add", [10, 20]);
    // con.onopen = onOpen;
    // con.onerror = onError;
    // con.onmessage = onMessage;
    con.on('open', function open() {
        console.log('client connected')
        con.send(envelope.serializeBinary());
    });
    // function onError(error: any) {
    //     console.log(error)
    // }
    // // function onOpen(event: any) {
    // //     console.log('client connected');
    // //     con.send(proto.Marshal());
    // // }
    // function onMessage(event: any) {
    //     console.log('received:', event);
    // }
    con.on('message', function message(data) {
        console.log('received: %s', data.toString());
    });

}
main()