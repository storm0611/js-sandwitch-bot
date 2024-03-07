import { owner_wallet, wssProvider, user_wallet } from "./config.js";
import {
  getUniv2PairAddress,
  parseUniv2RouterTx,
  getUniv2Reserve,
  getUniv2DataGivenOut,
  calcSandwichOptimalInWithNoSearch,
  calcSandwichState,
  calcNextBlockBaseFee
} from "./utils.js";
import { ethers } from "ethers";
import {
  ROUTERS,
  TOKENS
} from "./constants.js";


const attackUniswapV2 = async (tx, path, amountInMin, userAmountIn) => {
  const [weth, token] = path;
  const pair = getUniv2PairAddress(weth, token);
  const [reserveWeth, reserveToken] = await getUniv2Reserve(pair, weth, token);

  if (reserveWeth == 0) {
    console.log("reserveWeth is 0");
    return;
  }

  const optimalWethIn = calcSandwichOptimalInWithNoSearch(
    userAmountIn,
    amountInMin,
    reserveWeth,
    reserveToken,
    0.02
  );

  if (optimalWethIn.lte(ethers.constants.Zero)) {
    console.log("Nothing to Sandwich")
    return;
  }

  const sandwichStates = calcSandwichState(
    optimalWethIn,
    userAmountIn,
    amountInMin,
    reserveWeth,
    reserveToken
  );

  if (sandwichStates == null) {
    console.log("Nothing to Sandwich")
    return;
  }

  const block = await wssProvider.getBlock();
  const nextBaseFee = calcNextBlockBaseFee(block);

  let maxPriorityFee;
  if (tx.type != 2) {
    maxPriorityFee = tx.gasPrice.sub(nextBaseFee);
  } else {
    maxPriorityFee = tx.maxPriorityFeePerGas;
  }

  const txFee = nextBaseFee.add(maxPriorityFee.add(ethers.utils.parseUnits("1", "wei"))).add(nextBaseFee.add(maxPriorityFee)).mul(200000)
  if (sandwichStates.revenue.sub(txFee).lte(ethers.constants.Zero)) {
    console.log("The profit under zero");
    return;
  }

  let ABI = [
    "function buyToken(address token, address pair, uint256 amountIn, uint256 tokenOutNo)",
    "function sellToken(address token, address pair, uint256 tokenOutNo)",
    "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)"
  ];
  let iface = new ethers.utils.Interface(ABI);

  // crown
  let nonce = await wssProvider.getTransactionCount(owner_wallet.address);
  let payload = iface.encodeFunctionData("buyToken", [
    weth,
    pair,
    optimalWethIn,
    ethers.BigNumber.from(weth).lt(ethers.BigNumber.from(token)) ? 0 : 1,
  ]);

  const sandwichCrownTx = {
    from: owner_wallet.address,
    to: ROUTERS.SANDWICH,
    data: payload,
    chainId: 5,
    maxPriorityFeePerGas: maxPriorityFee.add(ethers.utils.parseUnits("1", "wei")),
    maxFeePerGas: nextBaseFee.add(maxPriorityFee.add(ethers.utils.parseUnits("1", "wei"))),
    gasLimit: 200000,
    nonce: nonce,
    type: 2
  };

  // victim tx
  payload = iface.encodeFunctionData("swapExactTokensForTokensSupportingFeeOnTransferTokens", [
    ethers.utils.parseUnits("0.001", "ether"),
    0,
    [
      TOKENS.WETH,
      TOKENS.STORM
    ],
    user_wallet.address,
    17097526870000
  ]);

  const victimTx = {
    from: user_wallet.address,
    to: ROUTERS.UNIV2_ROUTER,
    data: payload,
    chainId: 5,
    maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    maxFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    gasLimit: 200000,
    nonce: await wssProvider.getTransactionCount(user_wallet.address),
    type: 2
  };

  // heel
  payload = iface.encodeFunctionData("sellToken", [
    token,
    pair,
    ethers.BigNumber.from(weth).lt(ethers.BigNumber.from(token)) ? 0 : 1,
  ]);

  const sandwichHeelTx = {
    from: owner_wallet.address,
    to: ROUTERS.SANDWICH,
    data: payload,
    chainId: 5,
    maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    maxFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    gasLimit: 200000,
    nonce: nonce + 1,
    type: 2
  };

  const signedCrownTx = await owner_wallet.signTransaction(sandwichCrownTx);
  const signedHeelTx = await owner_wallet.signTransaction(sandwichHeelTx);
  const signedVictimTx = await user_wallet.signTransaction(victimTx);

  wssProvider.sendTransaction(signedCrownTx).then((res) => {
    console.log(res);
  });
  wssProvider.sendTransaction(signedVictimTx).then((res) => {
    console.log(res);
  });
  wssProvider.sendTransaction(signedHeelTx).then((res) => {
    console.log(res);
  });
}


const main = async () => {

  // wssProvider.on("pending", async (txHash) => {
  //   const tx = await wssProvider.getTransaction(txHash);
  //   console.log(tx)
  const nonce = await wssProvider.getTransactionCount(user_wallet.address);
  const tx = {
    from: '0x81C3B98B8CeF3E6266E862aB95C9c581765097E5',
    to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    data: '0x5c11d79500000000000000000000000000000000000000000000000000038d7ea4c68000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000081c3b98b8cef3e6266e862ab95c9c581765097e500000000000000000000000000000000000000000000000000000f8cd403fff00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d6000000000000000000000000edf1c51ac3ed2faebaaa12bcf505422d240e39dd',
    chainId: 5,
    maxPriorityFeePerGas: ethers.BigNumber.from('0x3b9aca00'),
    maxFeePerGas: ethers.BigNumber.from('0x3b9aca00'),
    gasLimit: 200000,
    nonce: nonce,
    type: 2
}
  if (tx == null) {
    return;
  }
  const routerDataDecoded = await parseUniv2RouterTx(tx);
  if (routerDataDecoded == null) {
    return;
  }
  const { path, userAmountIn, amountOutMin } = routerDataDecoded;
  if (path.length == 2) {
    const srcToken = path[0];
    const dstToken = path[1];
    const pair = getUniv2PairAddress(srcToken, dstToken);
    const [reserveSrc, reserveDst] = await getUniv2Reserve(pair, srcToken, dstToken);
    const { amountIn, newReserveIn, newReserveOut } = getUniv2DataGivenOut(
      amountOutMin,
      reserveSrc,
      reserveDst
    );
    const amountInMin = amountIn    // Mininum amountIn in terms of slippage
    try {
      attackUniswapV2(tx, path, amountInMin, userAmountIn);
    } catch (e) { console.log(e) }
  }
  // });
};

main();
