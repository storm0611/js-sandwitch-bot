// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "./interfaces/IERC20.sol";
import "./interfaces/IUniswapV2Pair.sol";

contract StormSandwich {

    // Authorized
    address internal immutable user;

    // Contructor sets the only user
    receive() external payable {}

    constructor(address _owner) {
        user = _owner;
    }

    // *** Receive profits from contract *** //
    function withdrawERC20(address token) public {
        require(msg.sender == user, "shoo");
        IERC20(token).transfer(
            msg.sender,
            IERC20(token).balanceOf(address(this))
        );
    }

    // *** Deposit ERC20(WETH) token to contract *** //
    function dipositeERC20(address token) public payable {
        require(msg.sender == user, "shoo");
        IERC20(token).deposit{value: msg.value}();
    }

    // *** Buy token with src token(WETH) *** //
    function buyToken(address token, address pair, uint256 amountIn, uint256 tokenOutNo) external {
        require(msg.sender == user, "shoo");
        IERC20(token).transfer(pair, amountIn);        
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        if(tokenOutNo == 0) {
            uint amountInWithFee = amountIn*997;
            uint numerator = amountInWithFee*reserve1;
            uint denominator = reserve0*1000 + amountInWithFee;
            IUniswapV2Pair(pair).swap(0, numerator / denominator, address(this), "");
        }
        else {
            uint amountInWithFee = amountIn*997;
            uint numerator = amountInWithFee*reserve0;
            uint denominator = reserve1*1000 + amountInWithFee;
            IUniswapV2Pair(pair).swap(numerator / denominator, 0, address(this), "");
        }
    }

    // *** Sell token *** //
    function sellToken(address token, address pair, uint256 tokenOutNo) external {
        require(msg.sender == user, "shoo");
        uint256 amountIn = IERC20(token).balanceOf(address(this));
        IERC20(token).transfer(pair, amountIn);
        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        if(tokenOutNo == 0) {
            uint amountInWithFee = amountIn*997;
            uint numerator = amountInWithFee*reserve0;
            uint denominator = reserve1*1000 + amountInWithFee;
            IUniswapV2Pair(pair).swap(numerator / denominator,0,address(this), "");
        }
        else {
            uint amountInWithFee = amountIn*997;
            uint numerator = amountInWithFee*reserve1;
            uint denominator = reserve0*1000 + amountInWithFee;
            IUniswapV2Pair(pair).swap(0,numerator / denominator,address(this), "");
        }
    }
}
