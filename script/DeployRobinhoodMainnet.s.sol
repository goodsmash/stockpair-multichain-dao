// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ScriptBase} from "./ScriptBase.sol";
import {StockCoinLaunchpad} from "../src/StockCoinLaunchpad.sol";

/// @notice Mainnet phase 1. Deploys the factory and schedules exact privileged setup actions.
/// @dev The shell wrapper defaults to simulation and refuses raw key material.
contract DeployRobinhoodMainnet is ScriptBase {
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
        require(deployer != owner && deployer != guardian && owner != guardian, "roles must be distinct");
        require(eligibilityGate != address(0), "eligibility gate required");
        require(stockToken != address(0) && priceFeed != address(0), "stock/feed required");
        require(minInitialStockValueUsd18 > 0 && minInitialStockValueUsd18 <= type(uint128).max, "invalid minimum");
        require(maxOracleAge <= type(uint32).max && sequencerGrace <= type(uint32).max, "uint32 overflow");
        require(enforceFreshSwaps <= 1, "fresh flag must be 0 or 1");

        vm.startBroadcast();
        launchpad = new StockCoinLaunchpad(deployer, guardian);
        emit LaunchpadDeployed(address(launchpad), deployer, guardian);
        _schedule(launchpad, abi.encodeCall(StockCoinLaunchpad.setCompliance, (eligibilityGate, true)));
        if (sequencerFeed != address(0)) {
            _schedule(launchpad, abi.encodeCall(StockCoinLaunchpad.setSequencerConfig, (sequencerFeed, uint32(sequencerGrace))));
        }
        _schedule(launchpad, abi.encodeCall(StockCoinLaunchpad.configureStock, (
            stockToken, priceFeed, ticker, uint32(maxOracleAge), uint128(minInitialStockValueUsd18), true, enforceFreshSwaps == 1
        )));
        _schedule(launchpad, abi.encodeCall(StockCoinLaunchpad.transferOwnership, (owner)));
        vm.stopBroadcast();
    }

    function _schedule(StockCoinLaunchpad launchpad, bytes memory callData) private {
        (bytes32 actionId, uint64 readyAt) = launchpad.scheduleAdminAction(callData);
        emit SetupActionScheduled(actionId, callData, readyAt);
    }
}
