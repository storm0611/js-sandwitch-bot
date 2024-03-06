import { wssProvider } from "./config.js";
import { getUniv2PairAddress, parseUniv2RouterTx, getUniv2Reserve, getUniv2DataGivenOut } from "./utils.js";
import { ethers } from "ethers";

const main = async () => {

  const TEST_TX = "0x97378d2725344481e61186b2c0edf88efef421bb56ceb8a7177a7108591f0d5e";

  // wssProvider.on("pending", async (txHash) => {
  //   const tx = await wssProvider.getTransaction(txHash);
  //   console.log(tx)
  const tx = await wssProvider.getTransaction(TEST_TX);
  console.log(tx)
    if (tx == null) {
      return;
    }
    const routerDataDecoded = await parseUniv2RouterTx(tx);
    if (routerDataDecoded == null) {
      return;
    }
    const { path, userAmountIn, amountOutMin } = routerDataDecoded;
    if (path.length == 2) {
      const fromToken = path[0];
      const toToken = path[1];
      const pair = getUniv2PairAddress(fromToken, toToken);
      const [reserveFrom, reserveTo] = await getUniv2Reserve(pair, fromToken, toToken);
      console.log(reserveFrom, reserveTo);
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
