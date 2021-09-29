// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import "./interfaces/INonfungiblePositionManager.sol";
import "./interfaces/IUniV3RangeOrder.sol";
import "./interfaces/IWETH.sol";

import "hardhat/console.sol";

contract UniV3RangeOrder is IUniV3RangeOrder {
    using SafeERC20 for IERC20;

    // solhint-disable-next-line var-name-mixedcase
    address public immutable WETH9;

    address public immutable limitOrderProtocol;
    // @dev UniswapV3 Position Manager
    INonfungiblePositionManager public immutable nonfungiblePositionManager;

    constructor(
        INonfungiblePositionManager _nonfungiblePositionManager,
        address _limitOrderProtocol,
        address _WETH9
    ) {
        limitOrderProtocol = _limitOrderProtocol;
        nonfungiblePositionManager = _nonfungiblePositionManager;
        WETH9 = _WETH9;
    }

    /// @dev Unwrap WETH
    function _unwrapWETH(uint256 amount) internal {
        IWETH(WETH9).withdraw(amount);
    }

    /// @notice Callback, for to notify maker on order execution.
    ///         Deposit tokens which maker bought to lending protocol, and then borrow tokens which maker want to sell
    ///         and transfer it to the owner.
    /// @param makerAsset asset which maker account want to sell
    /// @param takerAsset asset which maker account want to bought
    /// @param takingAmount amounts of taker asset
    /// @param interactiveData arbitrary data
    function notifyFillOrder(
        address,
        address makerAsset,
        address takerAsset,
        uint256,
        uint256 takingAmount,
        bytes memory interactiveData
    ) external override {
        UniV3MintParams memory data = abi.decode(interactiveData, (UniV3MintParams));

        require(msg.sender == limitOrderProtocol, "only-limit-order-protocol");
        require(data.fee > 0, "pool-fee-zero");
        require(data.tickLower < data.tickUpper, "tick-error");
        require(data.recipient != address(0), "recipient-address-zero");

        INonfungiblePositionManager.MintParams memory params;

        {
            // Stack too deep
            address token0;
            address token1;
            uint256 amount0Desired;
            uint256 amount1Desired;
            if (makerAsset < takerAsset) {
                token0 = makerAsset;
                token1 = takerAsset;
                amount1Desired = takingAmount;
            } else {
                token0 = takerAsset;
                token1 = makerAsset;
                amount0Desired = takingAmount;
            }
            require(token0 != address(0));

            params = INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: data.fee,
                tickLower: data.tickLower,
                tickUpper: data.tickUpper,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: amount0Desired,
                amount1Min: amount1Desired,
                recipient: data.recipient,
                deadline: block.timestamp + 300
            });
        }

        uint256 ethValue;
        if (takerAsset == WETH9) {
            ethValue = takingAmount;
            _unwrapWETH(takingAmount);
        } else {
            IERC20(takerAsset).safeApprove(address(nonfungiblePositionManager), takingAmount);
        }
        
        (uint256 tokenId, uint256 liquidity, uint256 amount0, uint256 amount1) = nonfungiblePositionManager.mint{
            value: ethValue
        }(params);

        console.log("tokenId :>>", tokenId);
        console.log("liquidity :>>", liquidity);
        console.log("amount0 :>>", amount0);
        console.log("amount1 :>>", amount1);
    }

    receive() external payable {}
}
