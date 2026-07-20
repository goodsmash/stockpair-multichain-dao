// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @dev Deploys crafted runtime with a valid-looking terminal CBOR map that is also executable.
/// A scanner that excludes compiler metadata misses the DELEGATECALL reached at metadataStart + 2.
contract MockExecutableMetadataBypass {
    constructor() {
        bytes memory runtime = new bytes(160);
        runtime[0] = 0x60; // PUSH1
        runtime[1] = 0x6d; // metadataStart (108) + 1
        runtime[2] = 0x56; // JUMP
        runtime[3] = 0x00; // STOP
        runtime[108] = 0xa1; // valid CBOR map prefix
        runtime[109] = 0x5b; // JUMPDEST inside the apparent metadata
        runtime[110] = 0xf4; // DELEGATECALL hidden in the apparent metadata
        runtime[158] = 0x00;
        runtime[159] = 0x32; // 50-byte terminal metadata length
        assembly ("memory-safe") { return(add(runtime, 0x20), mload(runtime)) }
    }
}
