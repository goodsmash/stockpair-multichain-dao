// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {LaunchToken} from "./LaunchToken.sol";

/// @notice Isolates launch-token creation bytecode from the factory runtime.
contract LaunchTokenDeployer {
    error Unauthorized();

    address public immutable factory;

    constructor(address factory_) {
        factory = factory_;
    }

    function deploy(
        string calldata name,
        string calldata symbol,
        bytes32 metadataHash,
        address poolFundingReceiver,
        uint256 poolFundingAmount,
        address creatorVestingReceiver,
        uint256 creatorVestingAmount
    ) external returns (address token) {
        if (msg.sender != factory) revert Unauthorized();
        token = address(
            new LaunchToken(
                name,
                symbol,
                metadataHash,
                factory,
                poolFundingReceiver,
                poolFundingAmount,
                creatorVestingReceiver,
                creatorVestingAmount
            )
        );
    }
}
