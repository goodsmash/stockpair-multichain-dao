// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {StockCoinPool} from "./StockCoinPool.sol";

/// @notice Isolates pool creation bytecode from the factory runtime.
contract StockCoinPoolDeployer {
    error Unauthorized();

    address public immutable factory;

    constructor(address factory_) {
        factory = factory_;
    }

    function deploy(
        address coinToken,
        address stockToken,
        uint16 feeBps,
        string calldata lpName,
        string calldata lpSymbol
    ) external returns (address pool) {
        if (msg.sender != factory) revert Unauthorized();
        pool = address(new StockCoinPool(factory, coinToken, stockToken, feeBps, lpName, lpSymbol));
    }
}
