// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BytecodePolicy} from "../libraries/BytecodePolicy.sol";

contract BytecodePolicyHarness {
    function validate(address token) external view returns (bytes32) {
        return BytecodePolicy.validateStrictAsset(token);
    }
}
