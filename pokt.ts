import { ChainId } from "@aave/contract-helpers";

const POKT_TOKEN = process.env.POKT_TOKEN;

const CHAIN_ID_TO_RELAY_ID: { [chainId: string]: string } = {
  [ChainId.avalanche]: "0003",
  [ChainId.mainnet]: "0021",
  [ChainId.fantom]: "0049",
  [ChainId.polygon]: "0009",
  [ChainId.optimism]: "0053",
  [ChainId.harmony]: "0040",
};

type AllowList = {
  blockchain_id: string;
  contracts: string[];
};

export async function updatePokt(list: { [chainId: string]: string[] }) {
  const allowList: AllowList[] = Object.keys(list).reduce((acc, chainId) => {
    const relayId = CHAIN_ID_TO_RELAY_ID[chainId];
    if (relayId) {
      acc.push({
        blockchain_id: relayId,
        contracts: list[chainId],
      });
    }
    return acc;
  }, [] as AllowList[]);

  await fetch(
    "https://settings-api.portal.pokt.network/v1/settings/add-contract",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POKT_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "62b3314e123e6f00397f19ca",
        gateway_settings: {
          contracts_allowlist: allowList,
        },
      }),
    }
  );
}
