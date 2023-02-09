import { Client } from "../../lib/client";


async function main() {

    // create client 
    const client = new Client()

    // connect socket
    await client.connect(`wss://relay.dev.grid.tf/`, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519')


    // send request
    const requestID = client.send("calculator.add", [10.6, 20], 1292, 5);

    // get response
    client.listen(requestID, (response: string) => { console.log(response) });

}



main();