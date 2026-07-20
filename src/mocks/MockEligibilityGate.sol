// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEligibilityGate} from "../interfaces/IEligibilityGate.sol";

contract MockEligibilityGate is IEligibilityGate {
    mapping(address => bool) public eligible;

    function setEligible(address account, bool value) external {
        eligible[account] = value;
    }

    function isEligible(address account) external view returns (bool) {
        return eligible[account];
    }
}
