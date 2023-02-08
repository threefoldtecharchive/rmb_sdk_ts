import { Client } from "../../lib/client";


async function main() {

    // create client 
    const client = new Client()
    // connect socket
    await client.connect(`ws://localhost:8080/`, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519')
    console.log(client.con)

    // send request
    const requestID = client.send("calculator.add", [10.6, 20], 1292, 5);

    // get response
    client.listen(requestID, (x) => { console.log(x) });
}



main();