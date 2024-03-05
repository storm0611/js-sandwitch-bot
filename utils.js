import { createRequire } from "module";
const require = createRequire(import.meta.url);
import abiDecoder from "abi-decoder";
import { ethers } from "ethers";
import { UNIV2_ROUTER, TOKENS } from "./constants.js";
import { uniswapV2Pair } from "./config.js";

const IUniswapV2RouterABI = require("./abi/IUniswapV2Router02.json");
abiDecoder.addABI(IUniswapV2RouterABI);

export const match = (a, b, caseIncensitive = true) => {
  // if (a === null || a === undefined) {
  //   return false;
  // }

  // if (Array.isArray(b)) {
  //   if (caseIncensitive) {
  //     return b.map((x) => x.toLowerCase()).includes(a.toLowerCase());
  //   }

  //   return b.includes(a);
  // }
  if (!a || !b) {
    return false;
  }

  if (caseIncensitive) {
    return a.toLowerCase() === b.toLowerCase();
  }

  return a === b;
};


export const parseUniv2RouterTx = async (tx) => {
  if (match(tx.to, UNIV2_ROUTER)) {
    let data = null;
    try {
      data = abiDecoder.decodeMethod(tx.data);
    } catch (e) {
      return null;
    }

    if (
      data.name == "swapExactETHForTokens" ||
      data.name == "swapExactETHForTokensSupportingFeeOnTransferTokens"
    ) {
      const [amountOutMin, path, to, deadline] = data.params.map(
        (x) => x.value
      );
      return {
        amountOutMin,
        path,
        to,
        deadline,
        userAmountIn: tx.value,
      };
    }
    if (
      data.name == "swapExactTokensForTokens" ||
      data.name == "swapExactTokensForTokensSupportingFeeOnTransferTokens"
    ) {
      const [amountIn, amountOutMin, path, to, deadline] = data.params.map(
        (x) => x.value
      );
      if (!match(path[0], TOKENS.WETH)) {
        return null;
      }
      return {
        amountOutMin,
        path,
        to,
        deadline,
        userAmountIn: ethers.utils.parseUnits(amountIn, "wei"),
      };
    }
    return null;
  }
}

/*
  Sorts tokens
*/
export const sortTokens = (tokenA, tokenB) => {
  if (ethers.BigNumber.from(tokenA).lt(ethers.BigNumber.from(tokenB))) {
    return [tokenA, tokenB];
  }
  return [tokenB, tokenA];
};

/*
  Computes pair addresses off-chain
*/
export const getUniv2PairAddress = (tokenA, tokenB) => {
  const [token0, token1] = sortTokens(tokenA, tokenB);

  const salt = ethers.utils.keccak256(token0 + token1.replace("0x", ""));
  const address = ethers.utils.getCreate2Address(
    "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f", // Factory address (contract creator)
    salt,
    "0x96e8ac4277198ff8b6f785478aa9a39f403cb768dd02cbee326c3e7da348845f" // init code hash
  );

  return address;
};

/*
  Get reserve helper function
*/
export const getUniv2Reserve = async (pair, tokenA, tokenB) => {
  const [token0] = sortTokens(tokenA, tokenB);
  let reserve0, reserve1;
  try {
    [reserve0, reserve1] = await uniswapV2Pair.attach(pair).getReserves();
  } catch (e) {
    console.log(e);
    [reserve0, reserve1] = [0, 0];
  }

  if (match(tokenA, token0)) {
    return [reserve0, reserve1];
  }
  return [reserve1, reserve0];
};

/*
 Uniswap v2; x * y = k formula

 How much in do we get if we supply out?
*/
export const getUniv2DataGivenOut = (bOut, reserveA, reserveB) => {
  // Underflow
  let newReserveB = reserveB.sub(bOut);
  if (newReserveB.lt(0) || reserveB.gt(reserveB)) {
    newReserveB = ethers.BigNumber.from(1);
  }

  const numerator = reserveA.mul(bOut).mul(1000);
  const denominator = newReserveB.mul(997);
  const aAmountIn = numerator.div(denominator).add(ethers.constants.One);

  // Overflow
  let newReserveA = reserveA.add(aAmountIn);
  if (newReserveA.lt(reserveA)) {
    newReserveA = ethers.constants.MaxInt256;
  }

  return {
    amountIn: aAmountIn,
    newReserveA,
    newReserveB,
  };
};