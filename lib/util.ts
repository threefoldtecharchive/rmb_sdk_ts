import type { ApiPromise } from "@polkadot/api";

export async function getTwinFromTwinID(api: ApiPromise, twinId: number) {
  return (await api.query.tfgridModule.twins(twinId)).toJSON();
}

export async function getTwinFromTwinAddress(api: ApiPromise, address: string) {
  const twinId = await api.query.tfgridModule.twinIdByAccountID(address);
  return (await api.query.tfgridModule.twins(Number(twinId))).toJSON();
}
