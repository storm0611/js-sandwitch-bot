import { wssProvider, user_wallet } from "./config.js";
import { getUniv2PairAddress, parseUniv2RouterTx, getUniv2Reserve, getUniv2DataGivenOut } from "./utils.js";
import { ethers } from "ethers";
import { TOKENS, ROUTERS } from "./constants.js";

const main = async () => {

    let ABI = ["function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)"];
    let iface = new ethers.utils.Interface(ABI);
    let payload = iface.encodeFunctionData("swapExactTokensForTokensSupportingFeeOnTransferTokens", [
        ethers.utils.parseUnits("0.005", "ether"),
        0,
        [
            TOKENS.WETH,
            TOKENS.STORM
        ],
        user_wallet.address,
        17097526870000
    ]);

    let tx = {
        from: user_wallet.address,
        to: ROUTERS.UNIV2_ROUTER,
      data: payload,
      chainId: 5,
        maxPriorityFeePerGas: ethers.utils.parseUnits("0.01", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("0.01", "gwei"),
        gasLimit: 1000000,
      nonce: 0,
      type: 2
    };

    console.log(tx);
};

main();
