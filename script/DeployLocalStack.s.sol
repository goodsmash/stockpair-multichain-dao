// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ScriptBase} from "./ScriptBase.sol";
import {StockCoinLaunchpad} from "../src/StockCoinLaunchpad.sol";
import {MockStockToken} from "../src/mocks/MockStockToken.sol";
import {MockAggregatorV3} from "../src/mocks/MockAggregatorV3.sol";
import {MockEligibilityGate} from "../src/mocks/MockEligibilityGate.sol";

contract DeployLocalStack is ScriptBase {
    event LocalStackDeployed(address launchpad, address stockToken, address priceFeed, address eligibilityGate);

    function run()
        external
        returns (
            StockCoinLaunchpad launchpad,
            MockStockToken stock,
            MockAggregatorV3 feed,
            MockEligibilityGate gate
        )
    {
        address owner = vm.envAddress("OWNER_ADDRESS");
        address guardian = vm.envOr("GUARDIAN_ADDRESS", owner);
        vm.startBroadcast();
        stock = new MockStockToken("Mock Robinhood Stock Token", "MRH");
        feed = new MockAggregatorV3(8, 100_00000000);
        gate = new MockEligibilityGate();
        gate.setEligible(owner, true);
        stock.mint(owner, 1_000_000e18);
        launchpad = new StockCoinLaunchpad(owner, guardian);
        launchpad.setCompliance(address(gate), true);
        launchpad.configureStock(address(stock), address(feed), bytes32("MRH"), 4 days, true, false);
        vm.stopBroadcast();
        emit LocalStackDeployed(address(launchpad), address(stock), address(feed), address(gate));
    }
}
