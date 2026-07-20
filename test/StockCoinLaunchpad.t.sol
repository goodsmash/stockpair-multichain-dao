// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {TestBase} from "./TestBase.sol";
import {IERC20} from "../src/interfaces/IERC20.sol";
import {LaunchToken} from "../src/LaunchToken.sol";
import {LiquidityLocker} from "../src/LiquidityLocker.sol";
import {CreatorVestingVault} from "../src/CreatorVestingVault.sol";
import {StockCoinPool} from "../src/StockCoinPool.sol";
import {StockCoinLaunchpad} from "../src/StockCoinLaunchpad.sol";
import {MockStrictStockToken} from "../src/mocks/MockStrictStockToken.sol";
import {MockDangerousStockToken} from "../src/mocks/MockDangerousStockToken.sol";
import {MockAggregatorV3} from "../src/mocks/MockAggregatorV3.sol";
import {MockEligibilityGate} from "../src/mocks/MockEligibilityGate.sol";

contract StockCoinLaunchpadTest is TestBase {
    address internal constant ALICE = address(0xA11CE);
    address internal constant BOB = address(0xB0B);
    address internal constant GUARDIAN = address(0x600D);

    StockCoinLaunchpad internal launchpad;
    MockStrictStockToken internal stock;
    MockAggregatorV3 internal feed;
    MockEligibilityGate internal gate;

    function setUp() public {
        launchpad = new StockCoinLaunchpad(address(this), GUARDIAN);
        stock = new MockStrictStockToken("Robinhood Mock Stock", "RHM", address(this), 1_000_000e18);
        feed = new MockAggregatorV3(8, 250_00_000_000);
        gate = new MockEligibilityGate();
        gate.setEligible(ALICE, true);
        gate.setEligible(BOB, true);
        stock.transfer(ALICE, 10_000e18);
        stock.transfer(BOB, 10_000e18);

        bytes memory complianceCall = abi.encodeCall(StockCoinLaunchpad.setCompliance, (address(gate), true));
        bytes memory stockCall = _stockConfigCall(4 days, true);
        launchpad.scheduleAdminAction(complianceCall);
        launchpad.scheduleAdminAction(stockCall);
        vm.warp(block.timestamp + launchpad.ADMIN_DELAY() + 1);
        launchpad.setCompliance(address(gate), true);
        launchpad.configureStock(address(stock), address(feed), bytes32("RHM"), 4 days, 1_000e18, true, true);
    }

    function testLaunchCreatesVestedFixedSupplyAndLockedPool() public {
        (address coin, address pool, uint256 liquidity) = _launch();
        assertEq(LaunchToken(coin).totalSupply(), 1_000_000e18);
        assertEq(LaunchToken(coin).balanceOf(ALICE), 0);
        assertEq(LaunchToken(coin).issuer(), address(launchpad));
        assertTrue(launchpad.isPool(pool));
        assertTrue(launchpad.isTrustedPool(pool, coin, address(stock)));

        StockCoinLaunchpad.LaunchRecord memory record = launchpad.launchAt(0);
        assertTrue(record.creatorVestingId != type(uint256).max);
        assertEq(StockCoinPool(pool).balanceOf(address(launchpad.liquidityLocker())), liquidity);
        assertEq(LaunchToken(coin).balanceOf(address(launchpad.creatorVestingVault())), 100_000e18);

        vm.prank(ALICE);
        vm.expectRevert(CreatorVestingVault.NothingClaimable.selector);
        launchpad.creatorVestingVault().claim(record.creatorVestingId);
        vm.prank(ALICE);
        vm.expectRevert(LiquidityLocker.LockStillActive.selector);
        launchpad.liquidityLocker().claim(record.liquidityLockId);
    }

    function testSwapPreservesInvariantAndPaysOnlyActor() public {
        (address coin, address pool,) = _launch();
        StockCoinPool amm = StockCoinPool(pool);
        (uint112 coinBefore, uint112 stockBefore,) = amm.getReserves();
        uint256 oldK = uint256(coinBefore) * uint256(stockBefore);

        vm.startPrank(BOB);
        stock.approve(pool, 1e18);
        uint256 quote = amm.quoteExactInput(address(stock), 1e18);
        uint256 out = amm.swapExactStockForCoin(1e18, quote, BOB, block.timestamp + 1);
        vm.stopPrank();

        assertEq(out, quote);
        assertEq(LaunchToken(coin).balanceOf(BOB), out);
        (uint112 coinAfter, uint112 stockAfter,) = amm.getReserves();
        assertGe(uint256(coinAfter) * uint256(stockAfter), oldK);
    }

    function testArbitraryRecipientRejected() public {
        (, address pool,) = _launch();
        vm.startPrank(BOB);
        stock.approve(pool, 1e18);
        vm.expectRevert(StockCoinLaunchpad.SelfRecipientRequired.selector);
        StockCoinPool(pool).swapExactStockForCoin(1e18, 0, ALICE, block.timestamp + 1);
        vm.stopPrank();
    }

    function testSwapAboveFivePercentReserveRejected() public {
        (, address pool,) = _launch();
        vm.startPrank(BOB);
        stock.approve(pool, 6e18);
        vm.expectRevert(StockCoinPool.SwapTooLarge.selector);
        StockCoinPool(pool).swapExactStockForCoin(6e18, 0, BOB, block.timestamp + 1);
        vm.stopPrank();
    }

    function testGuardianPauseBlocksRiskActionsButAllowsSelfExit() public {
        (address coin, address pool,) = _launch();
        StockCoinPool amm = StockCoinPool(pool);
        vm.startPrank(ALICE);
        IERC20(coin).approve(pool, 9_000e18);
        stock.approve(pool, 1e18);
        (, , uint256 minted) = amm.addLiquidity(9_000e18, 1e18, 9_000e18, 1e18, 1, ALICE, block.timestamp + 1);
        vm.stopPrank();

        vm.prank(GUARDIAN);
        launchpad.pause();

        vm.startPrank(BOB);
        stock.approve(pool, 1e18);
        vm.expectRevert(StockCoinLaunchpad.Paused.selector);
        amm.swapExactStockForCoin(1e18, 0, BOB, block.timestamp + 1);
        vm.stopPrank();

        vm.prank(ALICE);
        (uint256 coinOut, uint256 stockOut) = amm.removeLiquidity(minted, 1, 1, ALICE, block.timestamp + 1);
        assertGt(coinOut, 0);
        assertGt(stockOut, 0);
    }

    function testInitialLiquidityUnlockRequiresOneYearAndSelfClaim() public {
        (, address pool, uint256 liquidity) = _launch();
        StockCoinLaunchpad.LaunchRecord memory record = launchpad.launchAt(0);
        vm.warp(record.liquidityUnlockAt);
        vm.prank(BOB);
        vm.expectRevert(LiquidityLocker.Unauthorized.selector);
        launchpad.liquidityLocker().claim(record.liquidityLockId);
        vm.prank(ALICE);
        launchpad.liquidityLocker().claim(record.liquidityLockId);
        assertEq(StockCoinPool(pool).balanceOf(ALICE), liquidity);
    }

    function testCreatorAllocationCapAndOneYearLockFloor() public {
        StockCoinLaunchpad.LaunchParams memory p = _params();
        p.poolCoinAmount = 800_000e18;
        p.creatorCoinAmount = 200_000e18;
        vm.startPrank(ALICE);
        stock.approve(address(launchpad), p.stockAmount);
        vm.expectRevert(StockCoinLaunchpad.CreatorAllocationTooHigh.selector);
        launchpad.launch(p);
        vm.stopPrank();

        p = _params();
        p.liquidityLockDuration = 364 days;
        vm.startPrank(ALICE);
        stock.approve(address(launchpad), p.stockAmount);
        vm.expectRevert(StockCoinLaunchpad.InvalidLiquidityLock.selector);
        launchpad.launch(p);
        vm.stopPrank();
    }

    function testAdminConfigurationRequiresDelayAndGuardianCanCancel() public {
        bytes memory callData = abi.encodeCall(StockCoinLaunchpad.setGuardian, (address(0xBEEF)));
        launchpad.scheduleAdminAction(callData);
        vm.expectRevert(StockCoinLaunchpad.AdminActionNotReady.selector);
        launchpad.setGuardian(address(0xBEEF));
        bytes32 actionId = launchpad.adminActionId(callData);
        vm.prank(GUARDIAN);
        launchpad.cancelAdminAction(actionId);
        vm.warp(block.timestamp + launchpad.ADMIN_DELAY() + 1);
        vm.expectRevert(StockCoinLaunchpad.AdminActionNotScheduled.selector);
        launchpad.setGuardian(address(0xBEEF));
    }

    function testDangerousMintableStockRejected() public {
        MockDangerousStockToken dangerous = new MockDangerousStockToken(address(this), 1_000e18);
        bytes memory callData = abi.encodeCall(
            StockCoinLaunchpad.configureStock,
            (address(dangerous), address(feed), bytes32("DNG"), uint32(4 days), uint128(1_000e18), true, true)
        );
        launchpad.scheduleAdminAction(callData);
        vm.warp(block.timestamp + launchpad.ADMIN_DELAY() + 1);
        vm.expectRevert();
        launchpad.configureStock(address(dangerous), address(feed), bytes32("DNG"), 4 days, 1_000e18, true, true);
    }

    function testStaleOracleBlocksLaunch() public {
        vm.warp(block.timestamp + 10 days);
        feed.setAnswer(250_00_000_000, block.timestamp - 5 days);
        vm.startPrank(ALICE);
        stock.approve(address(launchpad), 100e18);
        vm.expectRevert(StockCoinLaunchpad.OracleStale.selector);
        launchpad.launch(_params());
        vm.stopPrank();
    }

    function testFuzzQuoteBelowReserveWithinTradeCap(uint96 rawAmount) public {
        (, address pool,) = _launch();
        uint256 amount = uint256(rawAmount % 5e18) + 1;
        StockCoinPool amm = StockCoinPool(pool);
        uint256 out = amm.quoteExactInput(address(stock), amount);
        (uint112 reserveCoin,,) = amm.getReserves();
        assertTrue(out > 0 && out < reserveCoin);
    }

    function _launch() internal returns (address coin, address pool, uint256 liquidity) {
        vm.startPrank(ALICE);
        stock.approve(address(launchpad), 100e18);
        (, coin, pool, liquidity) = launchpad.launch(_params());
        vm.stopPrank();
    }

    function _params() internal view returns (StockCoinLaunchpad.LaunchParams memory p) {
        p = StockCoinLaunchpad.LaunchParams({
            name: "Agent Launch Coin",
            symbol: "ALC",
            metadataHash: keccak256("ipfs://metadata"),
            stockToken: address(stock),
            totalCoinSupply: 1_000_000e18,
            poolCoinAmount: 900_000e18,
            creatorCoinAmount: 100_000e18,
            stockAmount: 100e18,
            feeBps: 30,
            liquidityLockDuration: 365 days,
            minInitialLiquidity: 1,
            deadline: block.timestamp + 1
        });
    }

    function _stockConfigCall(uint32 maxAge, bool requireFresh) internal view returns (bytes memory) {
        return abi.encodeCall(
            StockCoinLaunchpad.configureStock,
            (address(stock), address(feed), bytes32("RHM"), maxAge, uint128(1_000e18), true, requireFresh)
        );
    }
}
