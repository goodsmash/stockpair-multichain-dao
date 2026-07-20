// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Deploys crafted runtime that jumps over INVALID and reaches DELEGATECALL.
/// The old scanner incorrectly stopped at byte 3 and missed byte 9.
contract MockInvalidOpcodeBypass {
    constructor() {
        bytes memory runtime = new bytes(160);
        runtime[0] = 0x60; // PUSH1
        runtime[1] = 0x04; // destination
        runtime[2] = 0x56; // JUMP
        runtime[3] = 0xfe; // INVALID trap that is skipped
        runtime[4] = 0x5b; // JUMPDEST
        runtime[5] = 0x60;
        runtime[6] = 0x00;
        runtime[7] = 0x60;
        runtime[8] = 0x00;
        runtime[9] = 0xf4; // DELEGATECALL
        runtime[10] = 0x00;
        assembly ("memory-safe") { return(add(runtime, 0x20), mload(runtime)) }
    }
}
