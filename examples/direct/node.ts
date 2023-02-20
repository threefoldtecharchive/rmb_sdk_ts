import { Client } from "../../lib/client";


async function main() {

    // create client 
    const client = new Client("wss://tfchain.dev.grid.tf/ws", `wss://relay.dev.grid.tf/`, "drama govern gossip audit mixed silent voice mule wonder protect latin idea", "test_client", 'sr25519')

    // connect socket
    await client.connect()


    // send request
    const requestID = await client.send("zos.statistics.get", undefined, 17, 5);

    if (requestID) {
        // get response
        const response = await client.read(requestID);

        // print response
        console.log(response)
    }


    client.close();

}



main();