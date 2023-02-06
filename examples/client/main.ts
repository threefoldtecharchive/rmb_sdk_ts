import { createClient, sendRequest } from "../../lib/client";


async function main() {
    // create client 
    const client = await createClient(`ws://localhost:6379`, 1206, "test_client");

    // send request
    sendRequest(1206, client, "calculator.add", [10.6, 20]);

}



main();