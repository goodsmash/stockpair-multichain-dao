// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20Base} from "./utils/ERC20Base.sol";

/// @notice Immutable-supply launch token. No privileged mint, burn, blacklist, tax, pause, or upgrade hooks exist.
contract LaunchToken is ERC20Base {
    bytes32 public constant PROTOCOL_VERSION = keccak256("STOCKPAIR_LAUNCH_TOKEN_V0.6.0");
    bytes32 public immutable metadataHash;
    address public immutable issuer;

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 metadataHash_,
        address issuer_,
        address poolFundingReceiver,
        uint256 poolFundingAmount,
        address creatorVestingReceiver,
        uint256 creatorVestingAmount
    ) ERC20Base(name_, symbol_) {
        metadataHash = metadataHash_;
        issuer = issuer_;
        if (poolFundingAmount != 0) _mint(poolFundingReceiver, poolFundingAmount);
        if (creatorVestingAmount != 0) _mint(creatorVestingReceiver, creatorVestingAmount);
    }
}
