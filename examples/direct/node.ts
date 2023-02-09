import { Client } from "../../lib/client";


async function main() {

    // create client 
    const client = new Client()
    // connect socket
    await client.connect(`wss://relay.dev.grid.tf/`, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519')
    console.log(client.con)

    // send request
    const requestID = client.send("zos.statistics.get", undefined, 17, 5);

    // get response
    client.listen(requestID, (response: any) => { console.log(response) });
    // const response2 = await client.receive(requestID2);
    // console.log(response2)
}



main();