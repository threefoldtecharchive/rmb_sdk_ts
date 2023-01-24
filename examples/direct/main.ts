import { newClient, newEnvelope } from "../../lib/direct";

async function main() {

    // create client
    const client = await newClient(`wss://relay.dev.grid.tf`, 1206, "test_client", "drama govern gossip audit mixed silent voice mule wonder protect latin idea", 'sr25519');
    console.log('Connected', client)
    const con = client.con;
    const envelope = newEnvelope();
    con.on('open', () => {
        con.send("heyaaaaa")
        console.log('message sent')
    })

}
main()