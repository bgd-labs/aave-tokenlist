import * as dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import prettier from "prettier";
import { schema, TokenInfo } from "@uniswap/token-lists";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ChainId, UiPoolDataProvider } from "@aave/contract-helpers";
import { Contract, ethers } from "ethers";
import isEqual from "lodash/isEqual";
import erc20_abi from "./abi/erc20_abi.json";
import { updatePokt } from "./pokt";

const RPC_PROVIDERS = {
  [ChainId.mainnet]: "https://eth-mainnet.public.blastapi.io",
  [ChainId.goerli]: "https://eth-goerli.public.blastapi.io",
  [ChainId.polygon]: "https://polygon-rpc.com",
  [ChainId.avalanche]: "https://api.avax.network/ext/bc/C/rpc",
  [ChainId.arbitrum_one]: "https://arb1.arbitrum.io/rpc",
  [ChainId.harmony]: "https://api.s0.t.hmny.io",
  [ChainId.optimism]: "https://mainnet.optimism.io",
  [ChainId.fantom]: "https://rpc.ftm.tools",
} as const;

export interface Pool {
  name: string;
  chainId: ChainId;
  UI_POOL_DATA_PROVIDER: string;
  LENDING_POOL_ADDRESS_PROVIDER: string;
  version: number;
  testnet?: boolean;
  provider: ethers.providers.StaticJsonRpcProvider;
}

export const pools: Pool[] = [
  {
    name: "AaveV2Ethereum",
    chainId: ChainId.mainnet,
    UI_POOL_DATA_PROVIDER: "0x30375522F67a6308630d49A694ca1491fA2D3BC6",
    LENDING_POOL_ADDRESS_PROVIDER: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    version: 2,
  },
  {
    name: "AaveV2EthereumAMM",
    chainId: ChainId.mainnet,
    UI_POOL_DATA_PROVIDER: "0x30375522F67a6308630d49A694ca1491fA2D3BC6",
    LENDING_POOL_ADDRESS_PROVIDER: "0xacc030ef66f9dfeae9cbb0cd1b25654b82cfa8d5",
    version: 2,
  },
  {
    name: "AaveV2EthereumGoerli",
    chainId: ChainId.goerli,
    UI_POOL_DATA_PROVIDER: "0xcCb7a1B6B5D72c4AA633B114537cD20612fDccbB",
    LENDING_POOL_ADDRESS_PROVIDER: "0x5E52dEc931FFb32f609681B8438A51c675cc232d",
    version: 2,
  },
  {
    name: "AaveV3EthereumGoerli",
    chainId: ChainId.goerli,
    UI_POOL_DATA_PROVIDER: "0xC576539371a2f425545B7BF4eb2a14Eee1944a1C",
    LENDING_POOL_ADDRESS_PROVIDER: "0xc4dCB5126a3AfEd129BC3668Ea19285A9f56D15D",
    version: 3,
  },
  // {
  //   name: "AaveV2EthereumArc",
  //   chainId: ChainId.mainnet,
  //   UI_POOL_DATA_PROVIDER: "0x548e95Ce38B8cb1D91FD82A9F094F26295840277",
  //   version: 2,
  // },
  {
    name: "AaveV2Polygon",
    chainId: ChainId.polygon,
    UI_POOL_DATA_PROVIDER: "0x0d24b23DBaB0dc1A6F58029bA94F94Ff0D5382c2",
    LENDING_POOL_ADDRESS_PROVIDER: "0xd05e3E715d945B59290df0ae8eF85c1BdB684744",
    version: 2,
  },
  {
    name: "AaveV3Polygon",
    chainId: ChainId.polygon,
    UI_POOL_DATA_PROVIDER: "0x7006e5a16E449123a3F26920746d03337ff37340",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV2Avalanche",
    chainId: ChainId.avalanche,
    UI_POOL_DATA_PROVIDER: "0xa7da242e099136A71fF975B8D78b79AA543c9182",
    LENDING_POOL_ADDRESS_PROVIDER: "0xb6A86025F0FE1862B372cb0ca18CE3EDe02A318f",
    version: 2,
  },
  {
    name: "AaveV3Avalanche",
    chainId: ChainId.avalanche,
    UI_POOL_DATA_PROVIDER: "0x1dDAF95C8f58d1283E9aE5e3C964b575D7cF7aE3",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV3Arbitrum",
    chainId: ChainId.arbitrum_one,
    UI_POOL_DATA_PROVIDER: "0x85272bf6DdCCBDea45Cf0535ea5C65bf91B480c4",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV3Fantom",
    chainId: ChainId.fantom,
    UI_POOL_DATA_PROVIDER: "0x46E1b32fA843da745D7AA0ae630b544D6af9fe81",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV3Harmony",
    chainId: ChainId.harmony,
    UI_POOL_DATA_PROVIDER: "0xf952959c0F7FBed55786749219FECd8cd0ec8441",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV3Optimism",
    chainId: ChainId.optimism,
    UI_POOL_DATA_PROVIDER: "0x472337F1C9c1C5497c23dD8060df8729f33b5543",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
].map((m) => ({
  ...m,
  // fix checksum
  provider: new ethers.providers.StaticJsonRpcProvider(
    RPC_PROVIDERS[m.chainId as keyof typeof RPC_PROVIDERS]
  ),
}));

async function main() {
  const cache = require("./tokenlist.json");
  const tokens: TokenInfo[] = [];
  const allowList: { [chainId: number]: string[] } = {};
  for (const pool of pools) {
    if (!allowList[pool.chainId]) allowList[pool.chainId] = [];
    const uiPoolDataProvider = new UiPoolDataProvider({
      chainId: pool.chainId,
      provider: pool.provider,
      uiPoolDataProviderAddress: pool.UI_POOL_DATA_PROVIDER,
    });

    const reserves = await uiPoolDataProvider.getReservesHumanized({
      lendingPoolAddressProvider: pool.LENDING_POOL_ADDRESS_PROVIDER,
    });
    for (const reserve of reserves.reservesData) {
      const erc20AToken = new Contract(
        reserve.aTokenAddress,
        erc20_abi,
        pool.provider
      );
      if (
        !tokens.find(
          (t) =>
            t.chainId === pool.chainId && t.address === reserve.underlyingAsset
        )
      ) {
        const erc20Underlying = new Contract(
          reserve.underlyingAsset,
          erc20_abi,
          pool.provider
        );
        const nameUnderlying =
          pool.chainId === 1 &&
          reserve.underlyingAsset ===
            "0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2"
            ? "MKR"
            : await erc20Underlying.name();
        tokens.push({
          symbol: reserve.symbol,
          address: reserve.underlyingAsset,
          tags: ["underlying"],
          decimals: reserve.decimals,
          name: nameUnderlying,
          chainId: pool.chainId,
        });
        allowList[pool.chainId].push(reserve.underlyingAsset);
      }
      tokens.push({
        symbol: await erc20AToken.symbol(),
        address: reserve.aTokenAddress,
        tags: [pool.version === 2 ? "atokenv2" : "atokenv3"],
        decimals: reserve.decimals,
        name: `Aave interest bearing ${reserve.symbol}`,
        chainId: pool.chainId,
      });
      allowList[pool.chainId].push(
        reserve.aTokenAddress,
        reserve.stableDebtTokenAddress,
        reserve.variableDebtTokenAddress
      );
    }
  }
  if (isEqual(cache.tokens || {}, tokens)) {
    console.log("tokenlist already up to date");
    return;
  }

  const tokenList = {
    name: "Aave token list",
    logoURI: "ipfs://QmWzL3TSmkMhbqGBEwyeFyWVvLmEo3F44HBMFnmTUiTfp1",
    keywords: ["audited", "verified", "aave"],
    tags: {
      underlying: {
        name: "underlyingAsset",
        description:
          "Tokens that are used as underlying assets in the Aave protocol",
      },
      atokenv2: {
        name: "aToken V2",
        description: "Tokens that earn interest on the Aave Protocol V2",
      },
      atokenv3: {
        name: "aToken V3",
        description: "Tokens that earn interest on the Aave Protocol V3",
      },
    },
    timestamp: new Date().toISOString(),
    version: {
      ...cache.version,
      major: 2,
      minor: 0,
      patch: cache.version?.patch + 1,
    },
    tokens,
  };

  const ajv = new Ajv({ allErrors: true, verbose: true });
  addFormats(ajv);
  const validator = ajv.compile(schema);
  const valid = validator(tokenList);
  if (valid) {
    fs.writeFileSync(
      "./tokenlist.json",
      prettier.format(JSON.stringify(tokenList), {
        filepath: "./tokenlist.json",
      })
    );
    await updatePokt(allowList);
  }
  if (validator.errors) {
    throw validator.errors.map((error) => {
      delete error.data;
      return error;
    });
  }
}

main()
  .then((d) => console.log("finished"))
  .catch((e) => console.log(e));
