import { wssProvider } from "./config.js";
import { getUniv2PairAddress, parseUniv2RouterTx, getUniv2Reserve, getUniv2DataGivenOut } from "./utils.js";
import { ethers } from "ethers";

const main = async () => {

  // wssProvider.on("pending", async (txHash) => {
  //   const tx = await wssProvider.getTransaction(txHash);
  //   console.log(tx)
  const tx = {
    from: '0x81C3B98B8CeF3E6266E862aB95C9c581765097E5',
    to: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
    data: '0x5c11d7950000000000000000000000000000000000000000000000000011c37937e08000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000081c3b98b8cef3e6266e862ab95c9c581765097e500000000000000000000000000000000000000000000000000000f8cd403fff00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000edf1c51ac3ed2faebaaa12bcf505422d240e39dd',
    chainId: 5,
    maxPriorityFeePerGas: ethers.BigNumber.from('0x989680'),
    maxFeePerGas: ethers.BigNumber.from('0x989680'),
    gasLimit: 1000000,
    nonce: 0,
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
    console.log(pair)
    // const [reserveFrom, reserveTo] = await getUniv2Reserve(pair, fromToken, toToken);
    // const { amountIn, newReserveFrom, newReserveTo } = getUniv2DataGivenOut(
    //   amountOutMin,
    //   reserveFrom,
    //   reserveTo
    // );
    // console.log(amountIn, newReserveFrom, newReserveTo);
  }
  // });
};

main();
