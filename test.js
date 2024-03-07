import { wssProvider, user_wallet, owner_wallet } from "./config.js";
import { getUniv2PairAddress, parseUniv2RouterTx, getUniv2Reserve, getUniv2DataGivenOut } from "./utils.js";
import { ethers } from "ethers";
import { TOKENS, ROUTERS } from "./constants.js";

const main = async () => {

  let ABI = [
    "function swapExactTokensForTokensSupportingFeeOnTransferTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline)", 
    "function withdrawERC20(address token)"
  ];
    let iface = new ethers.utils.Interface(ABI);
    let payload = iface.encodeFunctionData("swapExactTokensForTokensSupportingFeeOnTransferTokens", [
        ethers.utils.parseUnits("0.001", "ether"),
        0,
        [
          TOKENS.WETH,
            TOKENS.STORM
        ],
        user_wallet.address,
        17097526870000
    ]);

  let nonce = await wssProvider.getTransactionCount(user_wallet.address);
  
    let tx = {
        from: user_wallet.address,
        to: ROUTERS.UNIV2_ROUTER,
      data: payload,
      chainId: 5,
        maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("1", "gwei"),
      gasLimit: 200000,
      nonce: nonce,
      type: 2
    };

  console.log(tx);

  // repair
  payload = iface.encodeFunctionData("swapExactTokensForTokensSupportingFeeOnTransferTokens", [
    "175060330000",
    0,
    [
      TOKENS.STORM,
      TOKENS.WETH
    ],
    user_wallet.address,
    17097526870000
  ]);

  nonce = await wssProvider.getTransactionCount(user_wallet.address);

  const victimTx1 = {
    from: user_wallet.address,
    to: ROUTERS.UNIV2_ROUTER,
    data: payload,
    chainId: 5,
    maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    maxFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    gasLimit: 200000,
    nonce: nonce,
    type: 2
  };

  const signedVictimTx1 = await user_wallet.signTransaction(victimTx1);
  // wssProvider.sendTransaction(signedVictimTx1).then((res) => {
  //   console.log(res);
  // });

  // withdraw
  payload = iface.encodeFunctionData("withdrawERC20", [
    TOKENS.WETH
  ]);

  nonce = await wssProvider.getTransactionCount(owner_wallet.address);

  const withdrawTx = {
    from: owner_wallet.address,
    to: ROUTERS.SANDWICH,
    data: payload,
    chainId: 5,
    maxPriorityFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    maxFeePerGas: ethers.utils.parseUnits("1", "gwei"),
    gasLimit: 200000,
    nonce: nonce,
    type: 2
  };
  const signedWithdrawTx = await owner_wallet.signTransaction(withdrawTx);
  wssProvider.sendTransaction(signedWithdrawTx).then((res) => {
    console.log(res);
  })
};

main();
