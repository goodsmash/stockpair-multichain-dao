// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ScriptVm {
    function envAddress(string calldata name) external view returns (address);
    function envUint(string calldata name) external view returns (uint256);
    function envBytes32(string calldata name) external view returns (bytes32);
    function envOr(string calldata name, address defaultValue) external view returns (address);
    function envOr(string calldata name, uint256 defaultValue) external view returns (uint256);
    function startBroadcast() external;
    function stopBroadcast() external;
}

abstract contract ScriptBase {
    ScriptVm internal constant vm = ScriptVm(address(uint160(uint256(keccak256("hevm cheat code")))));
}
