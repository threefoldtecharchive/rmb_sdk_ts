import Keyring from "@polkadot/keyring";
import { newClient } from "../../lib/direct";

async function main() {

    // create client
    const client = await newClient(`wss://relay.dev.grid.tf/`, 1206, "test_client", "sr", "drama govern gossip audit mixed silent voice mule wonder protect latin idea");
    console.log('Connected', client)
    const con = client.con;
    con.on('open', () => {
        con.send("heyaaaaa")
    })

}
main()