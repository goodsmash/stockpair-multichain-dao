// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ScriptBase} from "./ScriptBase.sol";
import {StockCoinLaunchpad} from "../src/StockCoinLaunchpad.sol";

/// @notice Phase 2: execute the exact actions scheduled by DeployRobinhoodTestnet after ADMIN_DELAY.
contract ExecuteRobinhoodTestnetSetup is ScriptBase {
    event SetupExecuted(address indexed launchpad, bytes4 indexed selector);

    function run() external {
        StockCoinLaunchpad launchpad = StockCoinLaunchpad(vm.envAddress("LAUNCHPAD_ADDRESS"));
        address deployer = vm.envAddress("DEPLOYER_ADDRESS");
        address owner = vm.envAddress("OWNER_ADDRESS");
        address eligibilityGate = vm.envAddress("ELIGIBILITY_GATE_ADDRESS");
        address stockToken = vm.envAddress("STOCK_TOKEN_ADDRESS");
        address priceFeed = vm.envAddress("STOCK_PRICE_FEED_ADDRESS");
        address sequencerFeed = vm.envOr("SEQUENCER_UPTIME_FEED_ADDRESS", address(0));
        bytes32 ticker = vm.envBytes32("STOCK_TICKER_BYTES32");
        uint256 maxOracleAge = vm.envOr("MAX_ORACLE_AGE_SECONDS", uint256(345600));
        uint256 minInitialStockValueUsd18 = vm.envUint("MIN_INITIAL_STOCK_VALUE_USD18");
        uint256 sequencerGrace = vm.envOr("SEQUENCER_GRACE_SECONDS", uint256(3600));
        uint256 enforceFreshSwaps = vm.envOr("REQUIRE_FRESH_ORACLE_FOR_SWAPS", uint256(1));

        require(address(launchpad) != address(0) && address(launchpad).code.length != 0, "launchpad missing");
        require(launchpad.owner() == deployer, "deployer is not current owner");
        require(maxOracleAge <= type(uint32).max && sequencerGrace <= type(uint32).max, "uint32 overflow");
        require(minInitialStockValueUsd18 > 0 && minInitialStockValueUsd18 <= type(uint128).max, "invalid minimum");
        require(enforceFreshSwaps <= 1, "fresh flag must be 0 or 1");

        vm.startBroadcast();
        launchpad.setCompliance(eligibilityGate, true);
        emit SetupExecuted(address(launchpad), StockCoinLaunchpad.setCompliance.selector);

        if (sequencerFeed != address(0)) {
            launchpad.setSequencerConfig(sequencerFeed, uint32(sequencerGrace));
            emit SetupExecuted(address(launchpad), StockCoinLaunchpad.setSequencerConfig.selector);
        }

        launchpad.configureStock(
            stockToken,
            priceFeed,
            ticker,
            uint32(maxOracleAge),
            uint128(minInitialStockValueUsd18),
            true,
            enforceFreshSwaps == 1
        );
        emit SetupExecuted(address(launchpad), StockCoinLaunchpad.configureStock.selector);

        if (owner != deployer) {
            launchpad.transferOwnership(owner);
            emit SetupExecuted(address(launchpad), StockCoinLaunchpad.transferOwnership.selector);
        }
        vm.stopBroadcast();
    }
}
