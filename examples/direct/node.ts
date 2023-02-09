import { Client } from "../../lib/client";


async function main() {

    // create client 
    const client = new Client("wss://tfchain.dev.grid.tf/ws", `wss://relay.dev.grid.tf/`, "drama govern gossip audit mixed silent voice mule wonder protect latin idea", "test_client", 'sr25519')

    // connect socket
    await client.connect()


    // send request
    const requestID = client.send("zos.statistics.get", undefined, 17, 5);

    // get response
    client.listen(requestID, (response: any) => { console.log(response) });

}



main();