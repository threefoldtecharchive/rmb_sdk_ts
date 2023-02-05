# Introduction
This is a `Typescript` sdk that can be used to build both **services**, and **clients**
that can talk over the `rmb`.

[RMB](https://github.com/threefoldtech/rmb-rs) is a message bus that enable secure
and reliable `RPC` calls across the globe.

`RMB` itself does not implement an RPC protocol, but just the secure and reliable messaging
hence it's up to server and client to implement their own data format.

## Pre Requirements
You need to run an `rmb-relay` locally. 

### Direct Client
There is a `direct` client that does not require `rmb-peer` and can connect directly to the rmb `relay`. This client is defined under
[direct](examples/direct/main.ts)
rmb-relay -dd --domain amira -s wss://tfchain.dev.grid.tf:443
~/cs/rmb/rmb-rs/target/release
./rmb-peer -d -m "thing sound motor agent acoustic must vapor reopen heart tomorrow sand they" -s "wss://tfchain.dev.grid.tf:443" --relay "ws://localhost:8080" --no-update
redis-cli
XLEN "stream:1292" 
keys * 