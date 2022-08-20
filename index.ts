import fs from "fs";
import prettier from "prettier";
import { schema, TokenInfo } from "@uniswap/token-lists";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { ChainId, UiPoolDataProvider } from "@aave/contract-helpers";
import { Contract, ethers } from "ethers";
import isEqual from "lodash/isEqual";
import erc20_abi from "./abi/erc20_abi.json";

const RPC_PROVIDERS = {
  [ChainId.mainnet]: "https://eth-mainnet.public.blastapi.io",
  [ChainId.polygon]: "https://polygon-rpc.com",
  [ChainId.avalanche]: "https://api.avax.network/ext/bc/C/rpc",
  [ChainId.arbitrum_one]: "https://arb1.arbitrum.io/rpc",
  [ChainId.harmony]: "https://api.s0.t.hmny.io",
  [ChainId.optimism]: "https://mainnet.optimism.io",
  [ChainId.fantom]: "https://rpc.ftm.tools",
} as const;

export interface Market {
  name: string;
  chainId: ChainId;
  UI_POOL_DATA_PROVIDER: string;
  LENDING_POOL_ADDRESS_PROVIDER: string;
  version: number;
  testnet?: boolean;
  provider: ethers.providers.StaticJsonRpcProvider;
}

export const markets: Market[] = [
  {
    name: "AaveV2Ethereum",
    chainId: ChainId.mainnet,
    UI_POOL_DATA_PROVIDER: "0x548e95Ce38B8cb1D91FD82A9F094F26295840277",
    LENDING_POOL_ADDRESS_PROVIDER: "0xB53C1a33016B2DC2fF3653530bfF1848a515c8c5",
    version: 2,
  },
  {
    name: "AaveV2EthereumAMM",
    chainId: ChainId.mainnet,
    UI_POOL_DATA_PROVIDER: "0x548e95Ce38B8cb1D91FD82A9F094F26295840277",
    LENDING_POOL_ADDRESS_PROVIDER: "0xacc030ef66f9dfeae9cbb0cd1b25654b82cfa8d5",
    version: 2,
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
    UI_POOL_DATA_PROVIDER: "0x67acdB3469580185811E5769113509c6e8B6Cba5",
    LENDING_POOL_ADDRESS_PROVIDER: "0xd05e3E715d945B59290df0ae8eF85c1BdB684744",
    version: 2,
  },
  {
    name: "AaveV3Polygon",
    chainId: ChainId.polygon,
    UI_POOL_DATA_PROVIDER: "0x8F1AD487C9413d7e81aB5B4E88B024Ae3b5637D0",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV2Avalanche",
    chainId: ChainId.avalanche,
    UI_POOL_DATA_PROVIDER: "0x88be7eC36719fadAbdE4307ec61EAB6fda788CEF",
    LENDING_POOL_ADDRESS_PROVIDER: "0xb6A86025F0FE1862B372cb0ca18CE3EDe02A318f",
    version: 2,
  },
  {
    name: "AaveV3Avalanche",
    chainId: ChainId.avalanche,
    UI_POOL_DATA_PROVIDER: "0xdBbFaFC45983B4659E368a3025b81f69Ab6E5093",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV3Arbitrum",
    chainId: ChainId.arbitrum_one,
    UI_POOL_DATA_PROVIDER: "0x3f960bB91e85Ae2dB561BDd01B515C5A5c65802b",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV3Fantom",
    chainId: ChainId.fantom,
    UI_POOL_DATA_PROVIDER: "0x1CCbfeC508da8D5242D5C1b368694Ab0066b39f1",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV3Harmony",
    chainId: ChainId.harmony,
    UI_POOL_DATA_PROVIDER: "0xBC3c351349f6A919A419EE1e57F85f3e07E59dd1",
    LENDING_POOL_ADDRESS_PROVIDER: "0xa97684ead0e402dC232d5A977953DF7ECBaB3CDb",
    version: 3,
  },
  {
    name: "AaveV3Optimism",
    chainId: ChainId.optimism,
    UI_POOL_DATA_PROVIDER: "0x64f558d4BFC1c03a8c8B2ff84976fF04c762b51f",
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
  for (const market of markets) {
    const uiPoolDataProvider = new UiPoolDataProvider({
      chainId: market.chainId,
      provider: market.provider,
      uiPoolDataProviderAddress: market.UI_POOL_DATA_PROVIDER,
    });

    const reserves = await uiPoolDataProvider.getReservesHumanized({
      lendingPoolAddressProvider: market.LENDING_POOL_ADDRESS_PROVIDER,
    });
    for (const reserve of reserves.reservesData) {
      const erc20AToken = new Contract(
        reserve.aTokenAddress,
        erc20_abi,
        market.provider
      );
      if (
        !tokens.find(
          (t) =>
            t.chainId === market.chainId &&
            t.address === reserve.underlyingAsset
        )
      ) {
        const erc20Underlying = new Contract(
          reserve.underlyingAsset,
          erc20_abi,
          market.provider
        );
        const nameUnderlying =
          market.chainId === 1 &&
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
          chainId: market.chainId,
        });
      }
      tokens.push({
        symbol: await erc20AToken.symbol(),
        address: reserve.aTokenAddress,
        tags: [market.version === 2 ? "atokenv2" : "atokenv3"],
        decimals: reserve.decimals,
        name: `Aave interest bearing ${reserve.symbol}`,
        chainId: market.chainId,
      });
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
