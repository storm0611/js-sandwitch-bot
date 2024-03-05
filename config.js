import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const IUniswapV2PairAbi = require("./abi/IUniswapV2Pair.json");
const IERC20ABI = require("./abi/IERC20.json");

export const wssProvider = new ethers.providers.WebSocketProvider(
    process.env.RPC_URL_WSS
);

// Used to send transactions, needs ether
export const searcherWallet = new ethers.Wallet(
    process.env.PRIVATE_KEY,
    wssProvider
);

export const authKeyWallet = new ethers.Wallet(
    process.env.PRIVATE_KEY,
    wssProvider
);

// Common contracts
export const uniswapV2Pair = new ethers.Contract(
    ethers.constants.AddressZero,
    IUniswapV2PairAbi,
    searcherWallet
);

export const IERC20 = new ethers.Contract(
    ethers.constants.AddressZero,
    IERC20ABI,
    searcherWallet
)

