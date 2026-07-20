// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {IERC20Metadata} from "./interfaces/IERC20Metadata.sol";
import {IAggregatorV3} from "./interfaces/IAggregatorV3.sol";
import {IEligibilityGate} from "./interfaces/IEligibilityGate.sol";
import {IStockCoinPolicy} from "./interfaces/IStockCoinPolicy.sol";
import {SafeTransferLib} from "./libraries/SafeTransferLib.sol";
import {BytecodePolicy} from "./libraries/BytecodePolicy.sol";
import {TwoStepAdmin} from "./utils/TwoStepAdmin.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";
import {LaunchTokenDeployer} from "./LaunchTokenDeployer.sol";
import {LiquidityLocker} from "./LiquidityLocker.sol";
import {CreatorVestingVault} from "./CreatorVestingVault.sol";
import {StockCoinPool} from "./StockCoinPool.sol";
import {StockCoinPoolDeployer} from "./StockCoinPoolDeployer.sol";

/// @notice Hardened factory, immutable pool registry, and policy layer for Coin/Stock Token pools.
/// @dev V0.4.0 requires a new deployment. Existing deployments are not upgraded by this source code.
contract StockCoinLaunchpad is TwoStepAdmin, ReentrancyGuard, IStockCoinPolicy {
    using SafeTransferLib for address;

    error Paused();
    error NotPaused();
    error UnauthorizedGuardian();
    error InvalidContract(address target);
    error InvalidDecimals(address token, uint8 decimals);
    error StockNotEnabled(address token);
    error StockEmergencyBlocked(address token);
    error PoolEmergencyBlocked(address pool);
    error StockCodeHashChanged(address token, bytes32 expected, bytes32 actual);
    error InvalidConfiguration();
    error InvalidSupply();
    error CreatorAllocationTooHigh();
    error InvalidLiquidityLock();
    error InvalidFee();
    error DeadlineExpired();
    error DeadlineTooFar(uint256 deadline, uint256 maximum);
    error Ineligible(address account);
    error EligibilityGateMissing();
    error NotPool();
    error OracleAnswerInvalid(address feed);
    error OracleAnswerOutOfRange(address feed, int256 value);
    error OracleStale(address feed, uint256 updatedAt);
    error SequencerDown();
    error SequencerGracePeriod();
    error UnsupportedTokenBehavior(address token);
    error SymbolAlreadyUsed(bytes32 symbolHash);
    error InvalidName();
    error InvalidSymbol();
    error InvalidMetadataHash();
    error InvalidPagination();
    error SelfRecipientRequired();
    error InitialStockValueTooLow(uint256 actualUsd18, uint256 minimumUsd18);
    error AdminActionNotAllowed(bytes4 selector);
    error AdminActionAlreadyScheduled(bytes32 actionId);
    error AdminActionNotScheduled(bytes32 actionId);
    error AdminActionNotReady(bytes32 actionId, uint64 readyAt);
    error AdminActionExpired(bytes32 actionId, uint64 expiresAt);

    bytes32 public constant PROTOCOL_VERSION = keccak256("STOCKPAIR_LAUNCHPAD_V0.6.0");
    uint8 public constant ACTION_ADD_LIQUIDITY = 1;
    uint8 public constant ACTION_REMOVE_LIQUIDITY = 2;
    uint8 public constant ACTION_SWAP = 3;
    uint16 public constant MAX_FEE_BPS = 100;
    uint16 public constant MAX_CREATOR_ALLOCATION_BPS = 1_000;
    uint32 public constant MIN_LIQUIDITY_LOCK_DURATION = 365 days;
    uint32 public constant MAX_LIQUIDITY_LOCK_DURATION = 4 * 365 days;
    uint32 public constant CREATOR_VESTING_CLIFF = 90 days;
    uint32 public constant CREATOR_VESTING_DURATION = 365 days;
    uint64 public constant ADMIN_DELAY = 48 hours;
    uint64 public constant ADMIN_EXECUTION_GRACE = 7 days;
    uint256 public constant MAX_PAGE_SIZE = 100;
    uint256 public constant MAX_DEADLINE_WINDOW = 30 minutes;
    uint256 public constant MAX_NAME_LENGTH = 64;
    uint256 public constant MAX_SYMBOL_LENGTH = 12;

    struct StockConfig {
        bool enabled;
        bool requireFreshOracleForSwaps;
        bool emergencyBlocked;
        address priceFeed;
        uint32 maxOracleAge;
        uint8 feedDecimals;
        bytes32 ticker;
        bytes32 approvedCodeHash;
        uint128 minInitialStockValueUsd18;
    }

    struct LaunchParams {
        string name;
        string symbol;
        bytes32 metadataHash;
        address stockToken;
        uint256 totalCoinSupply;
        uint256 poolCoinAmount;
        uint256 creatorCoinAmount;
        uint256 stockAmount;
        uint16 feeBps;
        uint32 liquidityLockDuration;
        uint256 minInitialLiquidity;
        uint256 deadline;
    }

    struct LaunchRecord {
        address creator;
        address coinToken;
        address stockToken;
        address pool;
        uint64 createdAt;
        uint64 liquidityUnlockAt;
        uint16 feeBps;
        uint256 liquidityLockId;
        uint256 creatorVestingId;
        bytes32 metadataHash;
    }

    address public guardian;
    bool public paused;
    bool public complianceEnforced;
    IEligibilityGate public eligibilityGate;
    address public sequencerUptimeFeed;
    uint32 public sequencerGracePeriod = 3_600;
    LiquidityLocker public immutable liquidityLocker;
    CreatorVestingVault public immutable creatorVestingVault;
    LaunchTokenDeployer public immutable launchTokenDeployer;
    StockCoinPoolDeployer public immutable poolDeployer;

    mapping(bytes32 => uint64) public adminActionReadyAt;
    mapping(address => StockConfig) public stockConfigs;
    mapping(address => bool) public isPool;
    mapping(address => bool) public poolEmergencyBlocked;
    mapping(address => uint256) public launchIdPlusOneByPool;
    mapping(address => uint256) public launchIdPlusOneByCoin;
    mapping(bytes32 => address) public coinBySymbolHash;
    mapping(address => uint256[]) private _launchesByCreator;
    mapping(address => address[]) private _poolsByStock;
    mapping(address => bool) private _knownStock;
    address[] private _stockTokens;
    LaunchRecord[] private _launches;

    event AdminActionScheduled(bytes32 indexed actionId, bytes4 indexed selector, uint64 readyAt, uint64 expiresAt);
    event AdminActionCanceled(bytes32 indexed actionId, address indexed caller);
    event AdminActionExecuted(bytes32 indexed actionId, bytes4 indexed selector);
    event GuardianUpdated(address indexed guardian);
    event PauseStatusChanged(bool paused, address indexed caller);
    event ComplianceUpdated(address indexed gate, bool enforced);
    event SequencerConfigUpdated(address indexed feed, uint32 gracePeriod);
    event StockEmergencyStatusChanged(address indexed stockToken, bool blocked, address indexed caller);
    event PoolEmergencyStatusChanged(address indexed pool, bool blocked, address indexed caller);
    event StockConfigured(
        address indexed stockToken,
        address indexed priceFeed,
        bytes32 indexed ticker,
        uint32 maxOracleAge,
        uint8 feedDecimals,
        uint128 minInitialStockValueUsd18,
        bool enabled,
        bool requireFreshOracleForSwaps,
        bytes32 approvedCodeHash
    );
    event PairLaunched(
        uint256 indexed launchId,
        address indexed creator,
        address indexed pool,
        address coinToken,
        address stockToken,
        uint256 coinAmount,
        uint256 stockAmount,
        uint256 liquidity,
        uint64 liquidityUnlockAt,
        uint256 liquidityLockId,
        uint256 creatorVestingId,
        uint16 feeBps,
        bytes32 metadataHash
    );

    modifier onlyScheduledAdminAction() {
        bytes32 actionId = _adminActionId(msg.data);
        uint64 readyAt = adminActionReadyAt[actionId];
        if (readyAt == 0) revert AdminActionNotScheduled(actionId);
        if (block.timestamp < readyAt) revert AdminActionNotReady(actionId, readyAt);
        uint64 expiresAt = readyAt + ADMIN_EXECUTION_GRACE;
        if (block.timestamp > expiresAt) revert AdminActionExpired(actionId, expiresAt);
        delete adminActionReadyAt[actionId];
        emit AdminActionExecuted(actionId, msg.sig);
        _;
    }

    constructor(address initialOwner, address initialGuardian) TwoStepAdmin(initialOwner) {
        if (initialGuardian == address(0)) revert InvalidConfiguration();
        guardian = initialGuardian;
        liquidityLocker = new LiquidityLocker(address(this));
        creatorVestingVault = new CreatorVestingVault(address(this));
        launchTokenDeployer = new LaunchTokenDeployer(address(this));
        poolDeployer = new StockCoinPoolDeployer(address(this));
        emit GuardianUpdated(initialGuardian);
    }

    function launchCount() external view returns (uint256) { return _launches.length; }
    function launchAt(uint256 index) external view returns (LaunchRecord memory) { return _launches[index]; }

    function launchesPage(uint256 offset, uint256 limit) external view returns (LaunchRecord[] memory page) {
        if (limit == 0 || limit > MAX_PAGE_SIZE) revert InvalidPagination();
        uint256 length = _launches.length;
        if (offset >= length) return new LaunchRecord[](0);
        uint256 end = offset + limit;
        if (end > length) end = length;
        page = new LaunchRecord[](end - offset);
        for (uint256 i; i < page.length; ++i) page[i] = _launches[offset + i];
    }

    function launchIdsByCreator(address creator) external view returns (uint256[] memory) { return _launchesByCreator[creator]; }
    function poolsByStock(address stockToken) external view returns (address[] memory) { return _poolsByStock[stockToken]; }
    function stockCount() external view returns (uint256) { return _stockTokens.length; }

    function stockAt(uint256 index) external view returns (address token, StockConfig memory config) {
        token = _stockTokens[index];
        config = stockConfigs[token];
    }

    function symbolHash(string calldata symbol) external pure returns (bytes32) { return keccak256(bytes(symbol)); }

    function launchIdForPool(address pool) external view returns (bool found, uint256 launchId) {
        uint256 value = launchIdPlusOneByPool[pool];
        return value == 0 ? (false, 0) : (true, value - 1);
    }

    function isTrustedPool(address pool, address expectedCoin, address expectedStock) external view returns (bool) {
        if (!isPool[pool] || pool.code.length == 0) return false;
        try StockCoinPool(pool).factory() returns (address factory_) {
            if (factory_ != address(this)) return false;
        } catch { return false; }
        try StockCoinPool(pool).coinToken() returns (address coin_) {
            if (coin_ != expectedCoin) return false;
        } catch { return false; }
        try StockCoinPool(pool).stockToken() returns (address stock_) {
            if (stock_ != expectedStock) return false;
        } catch { return false; }
        return true;
    }

    function adminActionId(bytes calldata callData) external view returns (bytes32) { return _adminActionId(callData); }

    function scheduleAdminAction(bytes calldata callData) external onlyOwner returns (bytes32 actionId, uint64 readyAt) {
        if (callData.length < 4) revert InvalidConfiguration();
        bytes4 selector = _selector(callData);
        if (!_isTimelockedSelector(selector)) revert AdminActionNotAllowed(selector);
        actionId = _adminActionId(callData);
        if (adminActionReadyAt[actionId] != 0) revert AdminActionAlreadyScheduled(actionId);
        readyAt = uint64(block.timestamp + ADMIN_DELAY);
        adminActionReadyAt[actionId] = readyAt;
        emit AdminActionScheduled(actionId, selector, readyAt, readyAt + ADMIN_EXECUTION_GRACE);
    }

    function cancelAdminAction(bytes32 actionId) external {
        _requireOwnerOrGuardian();
        if (adminActionReadyAt[actionId] == 0) revert AdminActionNotScheduled(actionId);
        delete adminActionReadyAt[actionId];
        emit AdminActionCanceled(actionId, msg.sender);
    }

    function transferOwnership(address nextOwner) public override onlyOwner onlyScheduledAdminAction {
        _startOwnershipTransfer(nextOwner);
    }

    function guardianCancelOwnershipTransfer() external {
        if (msg.sender != guardian) revert UnauthorizedGuardian();
        _cancelOwnershipTransfer();
    }

    function setGuardian(address newGuardian) external onlyOwner onlyScheduledAdminAction {
        if (newGuardian == address(0)) revert InvalidConfiguration();
        guardian = newGuardian;
        emit GuardianUpdated(newGuardian);
    }

    function pause() external {
        _requireOwnerOrGuardian();
        if (paused) revert Paused();
        paused = true;
        emit PauseStatusChanged(true, msg.sender);
    }

    function unpause() external onlyOwner onlyScheduledAdminAction {
        if (!paused) revert NotPaused();
        paused = false;
        emit PauseStatusChanged(false, msg.sender);
    }

    function emergencyBlockStock(address stockToken) external {
        _requireOwnerOrGuardian();
        if (!_knownStock[stockToken]) revert StockNotEnabled(stockToken);
        stockConfigs[stockToken].emergencyBlocked = true;
        emit StockEmergencyStatusChanged(stockToken, true, msg.sender);
    }

    function clearStockEmergencyBlock(address stockToken) external onlyOwner onlyScheduledAdminAction {
        if (!_knownStock[stockToken]) revert StockNotEnabled(stockToken);
        stockConfigs[stockToken].emergencyBlocked = false;
        emit StockEmergencyStatusChanged(stockToken, false, msg.sender);
    }

    function emergencyBlockPool(address pool) external {
        _requireOwnerOrGuardian();
        if (!isPool[pool]) revert NotPool();
        poolEmergencyBlocked[pool] = true;
        emit PoolEmergencyStatusChanged(pool, true, msg.sender);
    }

    function clearPoolEmergencyBlock(address pool) external onlyOwner onlyScheduledAdminAction {
        if (!isPool[pool]) revert NotPool();
        poolEmergencyBlocked[pool] = false;
        emit PoolEmergencyStatusChanged(pool, false, msg.sender);
    }

    function setCompliance(address gate, bool enforced) external onlyOwner onlyScheduledAdminAction {
        if (enforced && gate == address(0)) revert EligibilityGateMissing();
        if (gate != address(0) && gate.code.length == 0) revert InvalidContract(gate);
        eligibilityGate = IEligibilityGate(gate);
        complianceEnforced = enforced;
        emit ComplianceUpdated(gate, enforced);
    }

    function setSequencerConfig(address feed, uint32 gracePeriod) external onlyOwner onlyScheduledAdminAction {
        if (feed != address(0) && feed.code.length == 0) revert InvalidContract(feed);
        if (feed != address(0) && gracePeriod == 0) revert InvalidConfiguration();
        sequencerUptimeFeed = feed;
        sequencerGracePeriod = gracePeriod;
        emit SequencerConfigUpdated(feed, gracePeriod);
    }

    function configureStock(
        address stockToken,
        address priceFeed,
        bytes32 ticker,
        uint32 maxOracleAge,
        uint128 minInitialStockValueUsd18,
        bool enabled,
        bool requireFreshOracleForSwaps
    ) external onlyOwner onlyScheduledAdminAction {
        if (!enabled) {
            if (!_knownStock[stockToken]) revert StockNotEnabled(stockToken);
            StockConfig storage existing = stockConfigs[stockToken];
            existing.enabled = false;
            existing.requireFreshOracleForSwaps = false;
            emit StockConfigured(
                stockToken,
                existing.priceFeed,
                existing.ticker,
                existing.maxOracleAge,
                existing.feedDecimals,
                existing.minInitialStockValueUsd18,
                false,
                false,
                existing.approvedCodeHash
            );
            return;
        }
        if (stockToken == address(0) || stockToken.code.length == 0) revert InvalidContract(stockToken);
        uint8 stockDecimals = IERC20Metadata(stockToken).decimals();
        if (stockDecimals != 18) revert InvalidDecimals(stockToken, stockDecimals);

        uint8 feedDecimals;
        bytes32 codeHash = BytecodePolicy.validateStrictAsset(stockToken);
        if (enabled) {
            if (priceFeed == address(0) || priceFeed.code.length == 0) revert InvalidContract(priceFeed);
            if (ticker == bytes32(0) || maxOracleAge == 0 || minInitialStockValueUsd18 == 0) revert InvalidConfiguration();
            feedDecimals = IAggregatorV3(priceFeed).decimals();
            if (feedDecimals > 18) revert InvalidDecimals(priceFeed, feedDecimals);
            IERC20(stockToken).totalSupply();
        }
        if (!_knownStock[stockToken]) {
            _knownStock[stockToken] = true;
            _stockTokens.push(stockToken);
        }

        bool remainsEmergencyBlocked = stockConfigs[stockToken].emergencyBlocked;
        stockConfigs[stockToken] = StockConfig({
            enabled: enabled,
            requireFreshOracleForSwaps: requireFreshOracleForSwaps,
            emergencyBlocked: remainsEmergencyBlocked,
            priceFeed: priceFeed,
            maxOracleAge: maxOracleAge,
            feedDecimals: feedDecimals,
            ticker: ticker,
            approvedCodeHash: codeHash,
            minInitialStockValueUsd18: minInitialStockValueUsd18
        });
        emit StockConfigured(
            stockToken,
            priceFeed,
            ticker,
            maxOracleAge,
            feedDecimals,
            minInitialStockValueUsd18,
            enabled,
            requireFreshOracleForSwaps,
            codeHash
        );
    }

    function launch(LaunchParams calldata params)
        external
        nonReentrant
        returns (uint256 launchId, address coinToken, address pool, uint256 liquidity)
    {
        if (paused) revert Paused();
        if (block.timestamp > params.deadline) revert DeadlineExpired();
        uint256 maximumDeadline = block.timestamp + MAX_DEADLINE_WINDOW;
        if (params.deadline > maximumDeadline) revert DeadlineTooFar(params.deadline, maximumDeadline);
        if (params.metadataHash == bytes32(0)) revert InvalidMetadataHash();
        _assertEligible(msg.sender);
        _validateNameAndSymbol(params.name, params.symbol);

        bytes32 launchSymbolHash = keccak256(bytes(params.symbol));
        if (coinBySymbolHash[launchSymbolHash] != address(0)) revert SymbolAlreadyUsed(launchSymbolHash);

        StockConfig memory stock = stockConfigs[params.stockToken];
        _assertStockUsable(params.stockToken, stock);
        uint256 stockPrice = _assertOracleHealthy(stock);
        if (
            params.totalCoinSupply == 0 || params.poolCoinAmount == 0 || params.stockAmount == 0
                || params.poolCoinAmount > type(uint112).max || params.stockAmount > type(uint112).max
        ) revert InvalidSupply();
        if (params.poolCoinAmount + params.creatorCoinAmount != params.totalCoinSupply) revert InvalidSupply();
        if (params.creatorCoinAmount * 10_000 > params.totalCoinSupply * MAX_CREATOR_ALLOCATION_BPS) {
            revert CreatorAllocationTooHigh();
        }
        if (
            params.liquidityLockDuration < MIN_LIQUIDITY_LOCK_DURATION
                || params.liquidityLockDuration > MAX_LIQUIDITY_LOCK_DURATION
        ) revert InvalidLiquidityLock();
        if (params.feeBps > MAX_FEE_BPS) revert InvalidFee();

        uint256 stockValueUsd18 = params.stockAmount * stockPrice / (10 ** stock.feedDecimals);
        if (stockValueUsd18 < stock.minInitialStockValueUsd18) {
            revert InitialStockValueTooLow(stockValueUsd18, stock.minInitialStockValueUsd18);
        }

        coinToken = launchTokenDeployer.deploy(
            params.name,
            params.symbol,
            params.metadataHash,
            address(this),
            params.poolCoinAmount,
            address(creatorVestingVault),
            params.creatorCoinAmount
        );

        uint256 creatorVestingId = type(uint256).max;
        if (params.creatorCoinAmount != 0) {
            uint64 vestingStart = uint64(block.timestamp);
            creatorVestingId = creatorVestingVault.registerPosition(
                coinToken,
                msg.sender,
                params.creatorCoinAmount,
                vestingStart,
                vestingStart + CREATOR_VESTING_CLIFF,
                vestingStart + CREATOR_VESTING_DURATION
            );
        }

        string memory stockSymbol = IERC20Metadata(params.stockToken).symbol();
        pool = poolDeployer.deploy(
            coinToken,
            params.stockToken,
            params.feeBps,
            string.concat(params.symbol, "/", stockSymbol, " LP"),
            string.concat(params.symbol, "-", stockSymbol, "-LP")
        );
        StockCoinPool createdPool = StockCoinPool(pool);

        uint256 stockBefore = IERC20(params.stockToken).balanceOf(pool);
        params.stockToken.safeTransferFrom(msg.sender, pool, params.stockAmount);
        uint256 stockAfter = IERC20(params.stockToken).balanceOf(pool);
        if (stockAfter < stockBefore || stockAfter - stockBefore != params.stockAmount) {
            revert UnsupportedTokenBehavior(params.stockToken);
        }

        uint256 coinBefore = IERC20(coinToken).balanceOf(pool);
        coinToken.safeTransfer(pool, params.poolCoinAmount);
        uint256 coinAfter = IERC20(coinToken).balanceOf(pool);
        if (coinAfter < coinBefore || coinAfter - coinBefore != params.poolCoinAmount) {
            revert UnsupportedTokenBehavior(coinToken);
        }

        liquidity = createdPool.initialize(address(liquidityLocker), params.minInitialLiquidity);
        uint64 liquidityUnlockAt = uint64(block.timestamp + params.liquidityLockDuration);
        uint256 liquidityLockId = liquidityLocker.registerLock(pool, msg.sender, liquidity, liquidityUnlockAt);

        isPool[pool] = true;
        coinBySymbolHash[launchSymbolHash] = coinToken;

        launchId = _launches.length;
        _launches.push(LaunchRecord({
            creator: msg.sender,
            coinToken: coinToken,
            stockToken: params.stockToken,
            pool: pool,
            createdAt: uint64(block.timestamp),
            liquidityUnlockAt: liquidityUnlockAt,
            feeBps: params.feeBps,
            liquidityLockId: liquidityLockId,
            creatorVestingId: creatorVestingId,
            metadataHash: params.metadataHash
        }));
        launchIdPlusOneByPool[pool] = launchId + 1;
        launchIdPlusOneByCoin[coinToken] = launchId + 1;
        _launchesByCreator[msg.sender].push(launchId);
        _poolsByStock[params.stockToken].push(pool);

        (uint112 reserveCoin, uint112 reserveStock,) = createdPool.getReserves();
        emit PairLaunched(
            launchId,
            msg.sender,
            pool,
            coinToken,
            params.stockToken,
            reserveCoin,
            reserveStock,
            liquidity,
            liquidityUnlockAt,
            liquidityLockId,
            creatorVestingId,
            params.feeBps,
            params.metadataHash
        );
    }

    /// @notice Policy callback invoked only by registered pools.
    /// @dev Every action pays only to the actor. Incident-mode withdrawals remain available without eligibility checks.
    function assertActionAllowed(address stockToken, address actor, address recipient, uint8 action) external view {
        if (!isPool[msg.sender]) revert NotPool();
        if (action < ACTION_ADD_LIQUIDITY || action > ACTION_SWAP) revert InvalidConfiguration();
        if (recipient != actor) revert SelfRecipientRequired();

        StockConfig memory stock = stockConfigs[stockToken];
        bool codeChanged = stock.approvedCodeHash == bytes32(0) || stockToken.codehash != stock.approvedCodeHash;
        bool incident = paused || !stock.enabled || stock.emergencyBlocked || poolEmergencyBlocked[msg.sender] || codeChanged;

        if (action == ACTION_REMOVE_LIQUIDITY) {
            if (incident) return;
            _assertEligible(actor);
            return;
        }

        if (paused) revert Paused();
        if (poolEmergencyBlocked[msg.sender]) revert PoolEmergencyBlocked(msg.sender);
        _assertStockUsable(stockToken, stock);
        _assertEligible(actor);
        if (action == ACTION_ADD_LIQUIDITY || stock.requireFreshOracleForSwaps) _assertOracleHealthy(stock);
    }

    function assertOracleHealthy(address stockToken) external view {
        StockConfig memory stock = stockConfigs[stockToken];
        _assertStockUsable(stockToken, stock);
        _assertOracleHealthy(stock);
    }

    function latestStockPrice(address stockToken)
        external
        view
        returns (int256 answer, uint8 feedDecimals, uint256 updatedAt, bool fresh)
    {
        StockConfig memory stock = stockConfigs[stockToken];
        if (!stock.enabled) revert StockNotEnabled(stockToken);
        IAggregatorV3 feed = IAggregatorV3(stock.priceFeed);
        (uint80 roundId, int256 value,, uint256 time, uint80 answeredInRound) = feed.latestRoundData();
        answer = value;
        feedDecimals = stock.feedDecimals;
        updatedAt = time;
        fresh = value > 0 && uint256(value) <= type(uint128).max && time != 0 && time <= block.timestamp
            && answeredInRound >= roundId && block.timestamp - time <= stock.maxOracleAge;
    }

    function _validateNameAndSymbol(string calldata name, string calldata symbol) private pure {
        bytes memory nameBytes = bytes(name);
        bytes memory symbolBytes = bytes(symbol);
        if (nameBytes.length == 0 || nameBytes.length > MAX_NAME_LENGTH) revert InvalidName();
        if (nameBytes[0] == 0x20 || nameBytes[nameBytes.length - 1] == 0x20) revert InvalidName();
        for (uint256 i; i < nameBytes.length; ++i) {
            if (nameBytes[i] < 0x20 || nameBytes[i] > 0x7e) revert InvalidName();
        }
        if (symbolBytes.length < 2 || symbolBytes.length > MAX_SYMBOL_LENGTH) revert InvalidSymbol();
        if (symbolBytes[0] < 0x41 || symbolBytes[0] > 0x5A) revert InvalidSymbol();
        for (uint256 i; i < symbolBytes.length; ++i) {
            bytes1 c = symbolBytes[i];
            bool upper = c >= 0x41 && c <= 0x5A;
            bool digit = c >= 0x30 && c <= 0x39;
            if (!upper && !digit) revert InvalidSymbol();
        }
    }

    function _assertEligible(address account) private view {
        if (!complianceEnforced) return;
        IEligibilityGate gate = eligibilityGate;
        if (address(gate) == address(0)) revert EligibilityGateMissing();
        if (!gate.isEligible(account)) revert Ineligible(account);
    }

    function _assertStockUsable(address stockToken, StockConfig memory stock) private view {
        if (!stock.enabled) revert StockNotEnabled(stockToken);
        if (stock.emergencyBlocked) revert StockEmergencyBlocked(stockToken);
        bytes32 actual = stockToken.codehash;
        if (stock.approvedCodeHash == bytes32(0) || actual != stock.approvedCodeHash) {
            revert StockCodeHashChanged(stockToken, stock.approvedCodeHash, actual);
        }
    }

    function _assertOracleHealthy(StockConfig memory stock) private view returns (uint256 price) {
        address sequencerFeed = sequencerUptimeFeed;
        if (sequencerFeed != address(0)) {
            (, int256 answer, uint256 startedAt,,) = IAggregatorV3(sequencerFeed).latestRoundData();
            if (answer != 0) revert SequencerDown();
            if (startedAt == 0 || startedAt > block.timestamp || block.timestamp - startedAt <= sequencerGracePeriod) {
                revert SequencerGracePeriod();
            }
        }

        IAggregatorV3 feed = IAggregatorV3(stock.priceFeed);
        (uint80 roundId, int256 value,, uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
        if (value <= 0 || updatedAt == 0 || updatedAt > block.timestamp || answeredInRound < roundId) {
            revert OracleAnswerInvalid(stock.priceFeed);
        }
        if (uint256(value) > type(uint128).max) revert OracleAnswerOutOfRange(stock.priceFeed, value);
        if (block.timestamp - updatedAt > stock.maxOracleAge) revert OracleStale(stock.priceFeed, updatedAt);
        return uint256(value);
    }

    function _adminActionId(bytes calldata callData) private view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), callData));
    }

    function _selector(bytes calldata callData) private pure returns (bytes4 selector) {
        assembly ("memory-safe") { selector := calldataload(callData.offset) }
    }

    function _isTimelockedSelector(bytes4 selector) private pure returns (bool) {
        return selector == this.transferOwnership.selector || selector == this.setGuardian.selector
            || selector == this.unpause.selector || selector == this.clearStockEmergencyBlock.selector
            || selector == this.clearPoolEmergencyBlock.selector || selector == this.setCompliance.selector
            || selector == this.setSequencerConfig.selector || selector == this.configureStock.selector;
    }

    function _requireOwnerOrGuardian() private view {
        if (msg.sender != owner && msg.sender != guardian) revert UnauthorizedGuardian();
    }
}
