import { createRequire } from "module";
const require = createRequire(import.meta.url);
import abiDecoder from "abi-decoder";
import { ethers } from "ethers";
import { ROUTERS, TOKENS } from "./constants.js";
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
  if (match(tx.to, ROUTERS.UNIV2_ROUTER)) {
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
export const getUniv2DataGivenOut = (bOut, reserveIn, reserveOut) => {
  // Underflow
  let newReserveOut = reserveOut.sub(bOut);
  if (newReserveOut.lt(0) || reserveOut.gt(reserveOut)) {
    newReserveOut = ethers.BigNumber.from(1);
  }

  const numerator = reserveIn.mul(bOut).mul(1000);
  const denominator = newReserveOut.mul(997);
  const aAmountIn = numerator.div(denominator).add(ethers.constants.One);

  // Overflow
  let newReserveIn = reserveIn.add(aAmountIn);
  if (newReserveIn.lt(reserveIn)) {
    newReserveIn = ethers.constants.MaxInt256;
  }

  return {
    amountIn: aAmountIn,
    newReserveIn,
    newReserveOut,
  };
};

function sqrt(value) {
  const ONE = ethers.BigNumber.from(1);
  const TWO = ethers.BigNumber.from(2);
  let x = value;
  let z = x.add(ONE).div(TWO);
  let y = x;
  while (z.sub(y).isNegative()) {
    y = z;
    z = x.div(z).add(z).div(TWO);
  }
  return y;
}

export const calcSandwichOptimalInWithNoSearch = (
  userAmountIn,
  userMinRecvToken,
  reserveWeth,
  reserveToken,
  availabltAmountIn
) => {
  let UMR = ethers.utils.parseUnits(String(userMinRecvToken), 'wei');
  if (UMR.toString() == "0") {
    UMR = UMR.add(1);
  }

  let A = reserveToken.mul(reserveWeth).mul(userAmountIn).mul(997).mul(1000);
  let B = userAmountIn.mul(997).add(reserveWeth.mul(1000));
  let C = reserveWeth.mul(UMR).mul(1000);

  let AA = UMR.mul(ethers.utils.parseUnits('997000', 'wei'));
  let BB = B.mul(997).mul(UMR).add(C.mul(1000));
  let CC = B.mul(C).sub(A);


  let D = BB.mul(BB).sub(CC.mul(AA).mul(4));
  let x = sqrt(D).sub(BB).div(AA.mul(2));

  console.log(`Original x = ${ethers.BigNumber.from(x).toString()}`);

  if (x.gt(ethers.utils.parseEther(availabltAmountIn.toString()))) {
    x = ethers.utils.parseEther(availabltAmountIn.toString());
  }
  console.log(`Available x = ${ethers.BigNumber.from(x).toString()}`);
  return x;
}

/*
 Uniswap v2; x * y = k formula

 How much out do we get if we supply in?
*/
export const getUniv2DataGivenIn = (aIn, reserveA, reserveB) => {
  const aInWithFee = aIn.mul(997);
  const numerator = aInWithFee.mul(reserveB);
  const denominator = aInWithFee.add(reserveA.mul(1000));
  const bOut = numerator.div(denominator);

  // Underflow
  let newReserveB = reserveB.sub(bOut);
  if (newReserveB.lt(0) || newReserveB.gt(reserveB)) {
    newReserveB = ethers.BigNumber.from(1);
  }

  // Overflow
  let newReserveA = reserveA.add(aIn);
  if (newReserveA.lt(reserveA)) {
    newReserveA = ethers.constants.MaxInt256;
  }

  return {
    amountOut: bOut,
    newReserveA,
    newReserveB,
  };
};

export const calcSandwichState = (
  optimalSandwichWethIn,
  userWethIn,
  userMinRecv,
  reserveWeth,
  reserveToken
) => {
  const frontrunState = getUniv2DataGivenIn(
    optimalSandwichWethIn,
    reserveWeth,
    reserveToken
  );
  const victimState = getUniv2DataGivenIn(
    userWethIn,
    frontrunState.newReserveA,
    frontrunState.newReserveB
  );

  let backrunState = getUniv2DataGivenIn(
    frontrunState.amountOut,
    victimState.newReserveB,
    victimState.newReserveA
  );

  const minimumBackrunState = getUniv2DataGivenOut(
    backrunState.amountOut,
    victimState.newReserveB,
    victimState.newReserveA
  );

  let realTokenAmountIn = frontrunState.amountOut;

  backrunState = getUniv2DataGivenIn(
    realTokenAmountIn,
    victimState.newReserveB,
    victimState.newReserveA
  );

  // Sanity check
  if (victimState.amountOut.lt(userMinRecv)) {
    return null;
  }

  // Return
  return {
    // NOT PROFIT
    // Profit = post gas
    revenue: backrunState.amountOut.sub(optimalSandwichWethIn),
    optimalSandwichWethIn,
    userAmountIn: userWethIn,
    userMinRecv,
    reserveState: {
      reserveWeth,
      reserveToken,
    },
    frontrun: frontrunState,
    victim: victimState,
    backrun: backrunState,
    backSliceIn: realTokenAmountIn
  };
};


export const calcNextBlockBaseFee = (curBlock) => {
  const baseFee = curBlock.baseFeePerGas;
  const gasUsed = curBlock.gasUsed;
  const targetGasUsed = curBlock.gasLimit.div(2);
  const delta = gasUsed.sub(targetGasUsed);

  const newBaseFee = baseFee.add(
    baseFee.mul(delta).div(targetGasUsed).div(ethers.BigNumber.from(8))
  );

  // Add 0-9 wei so it becomes a different hash each time
  // const rand = Math.floor(Math.random() * 10);
  // return newBaseFee.add(rand);
  return newBaseFee;
};
