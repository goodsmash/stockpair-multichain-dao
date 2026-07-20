// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {IStockCoinPolicy} from "./interfaces/IStockCoinPolicy.sol";
import {SafeTransferLib} from "./libraries/SafeTransferLib.sol";
import {Math} from "./libraries/Math.sol";
import {ERC20Base} from "./utils/ERC20Base.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/// @notice Constant-product AMM for one launch token and one operator-approved Stock Token.
/// @dev Only exact-transfer, non-rebasing ERC-20 assets are supported.
contract StockCoinPool is ERC20Base, ReentrancyGuard {
    using SafeTransferLib for address;

    error UnauthorizedFactory();
    error AlreadyInitialized();
    error NotInitialized();
    error DeadlineExpired();
    error DeadlineTooFar(uint256 deadline, uint256 maximum);
    error InvalidAmount();
    error InvalidRecipient();
    error InsufficientOutput();
    error InsufficientLiquidityMinted();
    error InsufficientLiquidityBurned();
    error ReserveOverflow();
    error InvalidFee();
    error InvariantViolation();
    error UnsupportedTokenBehavior(address token);
    error SwapTooLarge(uint256 amountIn, uint256 maximum);
    error SlippageLimitTooLoose(uint256 minimumProvided, uint256 minimumRequired);

    uint256 public constant BPS = 10_000;
    uint256 public constant MINIMUM_LIQUIDITY = 1_000;
    uint256 public constant MAX_SWAP_INPUT_BPS = 500;
    uint256 public constant MAX_SWAP_SLIPPAGE_BPS = 300;
    uint256 public constant MAX_LIQUIDITY_SLIPPAGE_BPS = 100;
    uint256 public constant MAX_DEADLINE_WINDOW = 30 minutes;
    bytes32 public constant PROTOCOL_VERSION = keccak256("STOCKPAIR_POOL_V0.6.0");
    address public constant LOCKED_LIQUIDITY = address(0x000000000000000000000000000000000000dEaD);

    uint8 private constant ACTION_ADD_LIQUIDITY = 1;
    uint8 private constant ACTION_REMOVE_LIQUIDITY = 2;
    uint8 private constant ACTION_SWAP = 3;

    address public immutable factory;
    address public immutable coinToken;
    address public immutable stockToken;
    uint16 public immutable feeBps;
    uint64 public immutable createdAt;

    uint112 private _reserveCoin;
    uint112 private _reserveStock;
    uint32 private _lastUpdated;
    bool public initialized;

    uint256 public swapCount;
    uint256 public cumulativeCoinVolume;
    uint256 public cumulativeStockVolume;

    event Initialized(address indexed recipient, uint256 coinAmount, uint256 stockAmount, uint256 liquidity);
    event LiquidityAdded(address indexed provider, address indexed recipient, uint256 coinAmount, uint256 stockAmount, uint256 liquidity);
    event LiquidityRemoved(address indexed provider, address indexed recipient, uint256 coinAmount, uint256 stockAmount, uint256 liquidity);
    event Swap(address indexed sender, address indexed recipient, address indexed tokenIn, uint256 amountIn, uint256 amountOut);
    event Sync(uint112 reserveCoin, uint112 reserveStock);

    constructor(
        address factory_,
        address coinToken_,
        address stockToken_,
        uint16 feeBps_,
        string memory lpName,
        string memory lpSymbol
    ) ERC20Base(lpName, lpSymbol) {
        if (factory_ == address(0) || coinToken_ == address(0) || stockToken_ == address(0)) revert InvalidRecipient();
        if (feeBps_ > 100) revert InvalidFee();
        factory = factory_;
        coinToken = coinToken_;
        stockToken = stockToken_;
        feeBps = feeBps_;
        createdAt = uint64(block.timestamp);
    }

    function getReserves() external view returns (uint112 reserveCoin, uint112 reserveStock, uint32 lastUpdated) {
        return (_reserveCoin, _reserveStock, _lastUpdated);
    }

    function getPoolState()
        external
        view
        returns (
            uint112 reserveCoin,
            uint112 reserveStock,
            uint32 lastUpdated,
            uint256 lpSupply,
            uint256 swaps,
            uint256 coinVolume,
            uint256 stockVolume
        )
    {
        return (
            _reserveCoin,
            _reserveStock,
            _lastUpdated,
            totalSupply,
            swapCount,
            cumulativeCoinVolume,
            cumulativeStockVolume
        );
    }

    function initialize(address recipient, uint256 minLiquidity) external nonReentrant returns (uint256 liquidity) {
        if (msg.sender != factory) revert UnauthorizedFactory();
        if (initialized) revert AlreadyInitialized();
        _validateRecipient(recipient);

        uint256 coinBalance = IERC20(coinToken).balanceOf(address(this));
        uint256 stockBalance = IERC20(stockToken).balanceOf(address(this));
        _checkBalances(coinBalance, stockBalance);
        if (coinBalance == 0 || stockBalance == 0) revert InvalidAmount();

        uint256 rootK = Math.sqrt(coinBalance * stockBalance);
        if (rootK <= MINIMUM_LIQUIDITY) revert InsufficientLiquidityMinted();
        liquidity = rootK - MINIMUM_LIQUIDITY;
        if (liquidity < minLiquidity) revert InsufficientLiquidityMinted();

        initialized = true;
        _mint(LOCKED_LIQUIDITY, MINIMUM_LIQUIDITY);
        _mint(recipient, liquidity);
        _update(coinBalance, stockBalance);
        emit Initialized(recipient, coinBalance, stockBalance, liquidity);
    }

    function previewAddLiquidity(uint256 coinDesired, uint256 stockDesired)
        external
        view
        returns (uint256 coinAmount, uint256 stockAmount, uint256 liquidity)
    {
        if (!initialized || coinDesired == 0 || stockDesired == 0) return (0, 0, 0);
        (coinAmount, stockAmount) = _optimalLiquidityAmounts(coinDesired, stockDesired, _reserveCoin, _reserveStock);
        liquidity = Math.min((coinAmount * totalSupply) / _reserveCoin, (stockAmount * totalSupply) / _reserveStock);
    }

    function previewRemoveLiquidity(uint256 liquidity) external view returns (uint256 coinAmount, uint256 stockAmount) {
        if (!initialized || liquidity == 0 || totalSupply == 0) return (0, 0);
        coinAmount = (liquidity * _reserveCoin) / totalSupply;
        stockAmount = (liquidity * _reserveStock) / totalSupply;
    }

    function addLiquidity(
        uint256 coinDesired,
        uint256 stockDesired,
        uint256 coinMin,
        uint256 stockMin,
        uint256 liquidityMin,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 coinAmount, uint256 stockAmount, uint256 liquidity) {
        _requireInitialized();
        _requireDeadline(deadline);
        _policy(msg.sender, recipient, ACTION_ADD_LIQUIDITY);
        _validateRecipient(recipient);
        if (coinDesired == 0 || stockDesired == 0) revert InvalidAmount();
        if (coinDesired > type(uint112).max || stockDesired > type(uint112).max) revert ReserveOverflow();

        uint256 reserveCoin = _reserveCoin;
        uint256 reserveStock = _reserveStock;
        (coinAmount, stockAmount) = _optimalLiquidityAmounts(coinDesired, stockDesired, reserveCoin, reserveStock);
        if (coinAmount < coinMin || stockAmount < stockMin || coinAmount == 0 || stockAmount == 0) revert InvalidAmount();
        _requireTightMinimum(coinMin, coinAmount, MAX_LIQUIDITY_SLIPPAGE_BPS);
        _requireTightMinimum(stockMin, stockAmount, MAX_LIQUIDITY_SLIPPAGE_BPS);

        _pullExact(coinToken, msg.sender, coinAmount);
        _pullExact(stockToken, msg.sender, stockAmount);

        uint256 coinBalance = IERC20(coinToken).balanceOf(address(this));
        uint256 stockBalance = IERC20(stockToken).balanceOf(address(this));
        _checkBalances(coinBalance, stockBalance);

        uint256 supply = totalSupply;
        liquidity = Math.min((coinAmount * supply) / reserveCoin, (stockAmount * supply) / reserveStock);
        if (liquidity == 0 || liquidity < liquidityMin) revert InsufficientLiquidityMinted();
        _requireTightMinimum(liquidityMin, liquidity, MAX_LIQUIDITY_SLIPPAGE_BPS);
        _mint(recipient, liquidity);
        _update(coinBalance, stockBalance);
        emit LiquidityAdded(msg.sender, recipient, coinAmount, stockAmount, liquidity);
    }

    function removeLiquidity(
        uint256 liquidity,
        uint256 coinMin,
        uint256 stockMin,
        address recipient,
        uint256 deadline
    ) external nonReentrant returns (uint256 coinAmount, uint256 stockAmount) {
        _requireInitialized();
        _requireDeadline(deadline);
        _policy(msg.sender, recipient, ACTION_REMOVE_LIQUIDITY);
        _validateRecipient(recipient);
        if (liquidity == 0) revert InvalidAmount();

        uint256 supply = totalSupply;
        coinAmount = (liquidity * _reserveCoin) / supply;
        stockAmount = (liquidity * _reserveStock) / supply;
        if (coinAmount == 0 || stockAmount == 0 || coinAmount < coinMin || stockAmount < stockMin) {
            revert InsufficientLiquidityBurned();
        }
        _requireTightMinimum(coinMin, coinAmount, MAX_LIQUIDITY_SLIPPAGE_BPS);
        _requireTightMinimum(stockMin, stockAmount, MAX_LIQUIDITY_SLIPPAGE_BPS);

        _burn(msg.sender, liquidity);
        _pushExact(coinToken, recipient, coinAmount);
        _pushExact(stockToken, recipient, stockAmount);
        uint256 coinBalance = IERC20(coinToken).balanceOf(address(this));
        uint256 stockBalance = IERC20(stockToken).balanceOf(address(this));
        _update(coinBalance, stockBalance);
        emit LiquidityRemoved(msg.sender, recipient, coinAmount, stockAmount, liquidity);
    }

    function swapExactCoinForStock(uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        return _swapExact(coinToken, stockToken, amountIn, amountOutMin, recipient, deadline);
    }

    function swapExactStockForCoin(uint256 amountIn, uint256 amountOutMin, address recipient, uint256 deadline)
        external
        nonReentrant
        returns (uint256 amountOut)
    {
        return _swapExact(stockToken, coinToken, amountIn, amountOutMin, recipient, deadline);
    }

    function quoteExactInput(address tokenIn, uint256 amountIn) external view returns (uint256 amountOut) {
        if (!initialized || amountIn == 0) return 0;
        if (tokenIn == coinToken) return _getAmountOut(amountIn, _reserveCoin, _reserveStock);
        if (tokenIn == stockToken) return _getAmountOut(amountIn, _reserveStock, _reserveCoin);
        return 0;
    }

    /// @notice Accounts for tokens donated directly to the pool. It does not transfer funds.
    function sync() external nonReentrant {
        _requireInitialized();
        uint256 coinBalance = IERC20(coinToken).balanceOf(address(this));
        uint256 stockBalance = IERC20(stockToken).balanceOf(address(this));
        _checkBalances(coinBalance, stockBalance);
        _update(coinBalance, stockBalance);
    }

    function _swapExact(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address recipient,
        uint256 deadline
    ) private returns (uint256 amountOut) {
        _requireInitialized();
        _requireDeadline(deadline);
        _policy(msg.sender, recipient, ACTION_SWAP);
        _validateRecipient(recipient);
        if (amountIn == 0) revert InvalidAmount();

        bool coinIn = tokenIn == coinToken;
        uint256 reserveIn = coinIn ? _reserveCoin : _reserveStock;
        uint256 reserveOut = coinIn ? _reserveStock : _reserveCoin;
        uint256 maximumInput = reserveIn * MAX_SWAP_INPUT_BPS / BPS;
        if (amountIn > maximumInput) revert SwapTooLarge(amountIn, maximumInput);
        uint256 oldK = uint256(_reserveCoin) * uint256(_reserveStock);

        _pullExact(tokenIn, msg.sender, amountIn);
        amountOut = _getAmountOut(amountIn, reserveIn, reserveOut);
        if (amountOut == 0 || amountOut < amountOutMin || amountOut >= reserveOut) revert InsufficientOutput();
        _requireTightMinimum(amountOutMin, amountOut, MAX_SWAP_SLIPPAGE_BPS);
        _pushExact(tokenOut, recipient, amountOut);

        uint256 coinBalance = IERC20(coinToken).balanceOf(address(this));
        uint256 stockBalance = IERC20(stockToken).balanceOf(address(this));
        _checkBalances(coinBalance, stockBalance);
        if (coinBalance * stockBalance < oldK) revert InvariantViolation();
        _update(coinBalance, stockBalance);

        swapCount += 1;
        if (coinIn) cumulativeCoinVolume += amountIn;
        else cumulativeStockVolume += amountIn;
        emit Swap(msg.sender, recipient, tokenIn, amountIn, amountOut);
    }

    function _optimalLiquidityAmounts(uint256 coinDesired, uint256 stockDesired, uint256 reserveCoin, uint256 reserveStock)
        private
        pure
        returns (uint256 coinAmount, uint256 stockAmount)
    {
        uint256 stockOptimal = (coinDesired * reserveStock) / reserveCoin;
        if (stockOptimal <= stockDesired) return (coinDesired, stockOptimal);
        uint256 coinOptimal = (stockDesired * reserveCoin) / reserveStock;
        return (coinOptimal, stockDesired);
    }

    function _getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) private view returns (uint256) {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0 || amountIn > type(uint112).max) return 0;
        uint256 amountInWithFee = amountIn * (BPS - feeBps);
        return (amountInWithFee * reserveOut) / (reserveIn * BPS + amountInWithFee);
    }

    function _pullExact(address token, address from, uint256 amount) private {
        uint256 beforeBalance = IERC20(token).balanceOf(address(this));
        token.safeTransferFrom(from, address(this), amount);
        uint256 afterBalance = IERC20(token).balanceOf(address(this));
        if (afterBalance < beforeBalance || afterBalance - beforeBalance != amount) revert UnsupportedTokenBehavior(token);
    }

    function _pushExact(address token, address to, uint256 amount) private {
        uint256 poolBefore = IERC20(token).balanceOf(address(this));
        uint256 recipientBefore = IERC20(token).balanceOf(to);
        token.safeTransfer(to, amount);
        uint256 poolAfter = IERC20(token).balanceOf(address(this));
        uint256 recipientAfter = IERC20(token).balanceOf(to);
        if (
            poolAfter > poolBefore || poolBefore - poolAfter != amount || recipientAfter < recipientBefore
                || recipientAfter - recipientBefore != amount
        ) revert UnsupportedTokenBehavior(token);
    }

    function _policy(address actor, address recipient, uint8 action) private view {
        IStockCoinPolicy(factory).assertActionAllowed(stockToken, actor, recipient, action);
    }

    function _update(uint256 coinBalance, uint256 stockBalance) private {
        _checkBalances(coinBalance, stockBalance);
        _reserveCoin = uint112(coinBalance);
        _reserveStock = uint112(stockBalance);
        _lastUpdated = uint32(block.timestamp);
        emit Sync(_reserveCoin, _reserveStock);
    }

    function _checkBalances(uint256 coinBalance, uint256 stockBalance) private pure {
        if (coinBalance > type(uint112).max || stockBalance > type(uint112).max) revert ReserveOverflow();
    }

    function _validateRecipient(address recipient) private view {
        if (recipient == address(0) || recipient == address(this)) revert InvalidRecipient();
    }

    function _requireInitialized() private view {
        if (!initialized) revert NotInitialized();
    }

    function _requireDeadline(uint256 deadline) private view {
        if (block.timestamp > deadline) revert DeadlineExpired();
        uint256 maximum = block.timestamp + MAX_DEADLINE_WINDOW;
        if (deadline > maximum) revert DeadlineTooFar(deadline, maximum);
    }

    function _requireTightMinimum(uint256 minimumProvided, uint256 expectedAmount, uint256 maximumSlippageBps) private pure {
        if (minimumProvided == 0) revert SlippageLimitTooLoose(minimumProvided, 1);
        uint256 minimumRequired = expectedAmount * (BPS - maximumSlippageBps) / BPS;
        if (minimumRequired == 0) minimumRequired = 1;
        if (minimumProvided < minimumRequired) revert SlippageLimitTooLoose(minimumProvided, minimumRequired);
    }
}
