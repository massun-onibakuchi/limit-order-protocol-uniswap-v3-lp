// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "../limit-order-protocol/interfaces/InteractiveNotificationReceiver.sol";

interface IUniV3RangeOrder is InteractiveNotificationReceiver {
    struct UniV3MintParams {
        uint24 fee; // Pool Fee 0.3%=3000
        int24 tickLower;
        int24 tickUpper;
        address recipient;
    }
}
