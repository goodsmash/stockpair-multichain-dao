// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IStockCoinPolicy {
    function assertActionAllowed(address stockToken, address actor, address recipient, uint8 action) external view;
}
