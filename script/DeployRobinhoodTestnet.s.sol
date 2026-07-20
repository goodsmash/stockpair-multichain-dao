// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ScriptBase} from "./ScriptBase.sol";
import {StockCoinLaunchpad} from "../src/StockCoinLaunchpad.sol";

/// @notice Phase 1: deploy V0.4 and schedule every privileged setup action.
/// @dev Never reads a raw PRIVATE_KEY. Broadcast with an encrypted keystore, Ledger, HSM, or MPC signer.
contract DeployRobinhoodTestnet is ScriptBase {
    event LaunchpadDeployed(address indexed launchpad, address indexed deployer, address indexed guardian);
    event SetupActionScheduled(bytes32 indexed actionId, bytes callData, uint64 readyAt);

    function run() external returns (StockCoinLaunchpad launchpad) {
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address guardian = vm.envAddress("GUARDIAN_ADDRESS");
        address eligibilityGate = vm.envAddress("ELIGIBILITY_GATE_ADDRESS");
        address stockToken = vm.envAddress("STOCK_TOKEN_ADDRESS");
        address priceFeed = vm.envAddress("STOCK_PRICE_FEED_ADDRESS");
        address sequencerFeed = vm.envOr("SEQUENCER_UPTIME_FEED_ADDRESS", address(0));
        bytes32 ticker = vm.envBytes32("STOCK_TICKER_BYTES32");
        uint256 maxOracleAge = vm.envOr("MAX_ORACLE_AGE_SECONDS", uint256(345600));
        uint256 minInitialStockValueUsd18 = vm.envUint("MIN_INITIAL_STOCK_VALUE_USD18");
        uint256 sequencerGrace = vm.envOr("SEQUENCER_GRACE_SECONDS", uint256(3600));
        uint256 enforceFreshSwaps = vm.envOr("REQUIRE_FRESH_ORACLE_FOR_SWAPS", uint256(1));

        require(deployer != address(0) && owner != address(0) && guardian != address(0), "roles required");
        require(eligibilityGate != address(0), "eligibility gate required");
        require(stockToken != address(0) && priceFeed != address(0), "stock/feed required");
        require(minInitialStockValueUsd18 > 0, "minimum stock value required");
        require(maxOracleAge <= type(uint32).max && sequencerGrace <= type(uint32).max, "uint32 overflow");
        require(minInitialStockValueUsd18 <= type(uint128).max, "uint128 overflow");
        require(enforceFreshSwaps <= 1, "fresh flag must be 0 or 1");

        vm.startBroadcast();
        launchpad = new StockCoinLaunchpad(deployer, guardian);
        emit LaunchpadDeployed(address(launchpad), deployer, guardian);

        _schedule(
            launchpad,
            abi.encodeCall(StockCoinLaunchpad.setCompliance, (eligibilityGate, true))
        );
        if (sequencerFeed != address(0)) {
            _schedule(
                launchpad,
                abi.encodeCall(StockCoinLaunchpad.setSequencerConfig, (sequencerFeed, uint32(sequencerGrace)))
            );
        }
        _schedule(
            launchpad,
            abi.encodeCall(
                StockCoinLaunchpad.configureStock,
                (
                    stockToken,
                    priceFeed,
                    ticker,
                    uint32(maxOracleAge),
                    uint128(minInitialStockValueUsd18),
                    true,
                    enforceFreshSwaps == 1
                )
            )
        );
        if (owner != deployer) {
            _schedule(launchpad, abi.encodeCall(StockCoinLaunchpad.transferOwnership, (owner)));
        }
        vm.stopBroadcast();
    }

    function _schedule(StockCoinLaunchpad launchpad, bytes memory callData) private {
        (bytes32 actionId, uint64 readyAt) = launchpad.scheduleAdminAction(callData);
        emit SetupActionScheduled(actionId, callData, readyAt);
    }
}
