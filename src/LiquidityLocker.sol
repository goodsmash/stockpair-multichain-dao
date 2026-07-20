// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {SafeTransferLib} from "./libraries/SafeTransferLib.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/// @notice Immutable custody for initial LP positions created by StockCoinLaunchpad.
/// @dev Claims are always paid to the registered beneficiary; arbitrary recipients are intentionally unsupported.
contract LiquidityLocker is ReentrancyGuard {
    using SafeTransferLib for address;

    error Unauthorized();
    error InvalidContract(address target);
    error InvalidBeneficiary();
    error InvalidAmount();
    error InvalidUnlockTime();
    error InsufficientLockedBalance();
    error LockNotFound();
    error LockAlreadyClaimed();
    error LockStillActive(uint64 unlockAt);

    struct LockPosition {
        address token;
        address beneficiary;
        uint256 amount;
        uint64 unlockAt;
        bool claimed;
    }

    address public immutable factory;
    mapping(address => uint256) public lockedBalance;
    mapping(address => uint256[]) private _locksByBeneficiary;
    LockPosition[] private _locks;

    event LockRegistered(uint256 indexed lockId, address indexed token, address indexed beneficiary, uint256 amount, uint64 unlockAt);
    event LockClaimed(uint256 indexed lockId, address indexed token, address indexed beneficiary, uint256 amount);

    constructor(address factory_) {
        if (factory_ == address(0)) revert Unauthorized();
        factory = factory_;
    }

    function lockCount() external view returns (uint256) { return _locks.length; }

    function lockAt(uint256 lockId) external view returns (LockPosition memory) {
        if (lockId >= _locks.length) revert LockNotFound();
        return _locks[lockId];
    }

    function lockIdsByBeneficiary(address beneficiary) external view returns (uint256[] memory) {
        return _locksByBeneficiary[beneficiary];
    }

    function registerLock(address token, address beneficiary, uint256 amount, uint64 unlockAt) external returns (uint256 lockId) {
        if (msg.sender != factory) revert Unauthorized();
        if (token == address(0) || token.code.length == 0) revert InvalidContract(token);
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        if (amount == 0) revert InvalidAmount();
        if (unlockAt <= block.timestamp) revert InvalidUnlockTime();

        uint256 newLockedBalance = lockedBalance[token] + amount;
        if (IERC20(token).balanceOf(address(this)) < newLockedBalance) revert InsufficientLockedBalance();
        lockedBalance[token] = newLockedBalance;

        lockId = _locks.length;
        _locks.push(LockPosition({token: token, beneficiary: beneficiary, amount: amount, unlockAt: unlockAt, claimed: false}));
        _locksByBeneficiary[beneficiary].push(lockId);
        emit LockRegistered(lockId, token, beneficiary, amount, unlockAt);
    }

    function claim(uint256 lockId) external nonReentrant returns (uint256 amount) {
        if (lockId >= _locks.length) revert LockNotFound();
        LockPosition storage position = _locks[lockId];
        if (msg.sender != position.beneficiary) revert Unauthorized();
        if (position.claimed) revert LockAlreadyClaimed();
        if (block.timestamp < position.unlockAt) revert LockStillActive(position.unlockAt);

        position.claimed = true;
        amount = position.amount;
        lockedBalance[position.token] -= amount;
        position.token.safeTransfer(position.beneficiary, amount);
        emit LockClaimed(lockId, position.token, position.beneficiary, amount);
    }
}
