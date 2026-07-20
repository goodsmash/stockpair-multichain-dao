// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "./interfaces/IERC20.sol";
import {SafeTransferLib} from "./libraries/SafeTransferLib.sol";
import {ReentrancyGuard} from "./utils/ReentrancyGuard.sol";

/// @notice Non-upgradeable, self-claiming linear vesting for creator allocations.
contract CreatorVestingVault is ReentrancyGuard {
    using SafeTransferLib for address;

    error Unauthorized();
    error InvalidPosition();
    error InvalidBeneficiary();
    error InvalidSchedule();
    error InvalidAmount();
    error InsufficientReservedBalance();
    error NothingClaimable();

    struct Position {
        address token;
        address beneficiary;
        uint128 total;
        uint128 claimed;
        uint64 start;
        uint64 cliff;
        uint64 end;
    }

    address public immutable factory;
    mapping(address => uint256) public reservedBalance;
    mapping(address => uint256[]) private _positionsByBeneficiary;
    Position[] private _positions;

    event PositionRegistered(
        uint256 indexed positionId,
        address indexed token,
        address indexed beneficiary,
        uint256 amount,
        uint64 start,
        uint64 cliff,
        uint64 end
    );
    event Claimed(uint256 indexed positionId, address indexed beneficiary, uint256 amount);

    constructor(address factory_) {
        if (factory_ == address(0)) revert Unauthorized();
        factory = factory_;
    }

    function positionCount() external view returns (uint256) { return _positions.length; }

    function positionAt(uint256 positionId) external view returns (Position memory) {
        if (positionId >= _positions.length) revert InvalidPosition();
        return _positions[positionId];
    }

    function positionsByBeneficiary(address beneficiary) external view returns (uint256[] memory) {
        return _positionsByBeneficiary[beneficiary];
    }

    function registerPosition(
        address token,
        address beneficiary,
        uint256 amount,
        uint64 start,
        uint64 cliff,
        uint64 end
    ) external returns (uint256 positionId) {
        if (msg.sender != factory) revert Unauthorized();
        if (beneficiary == address(0)) revert InvalidBeneficiary();
        if (amount == 0 || amount > type(uint128).max) revert InvalidAmount();
        if (start > cliff || cliff >= end) revert InvalidSchedule();

        uint256 newReserved = reservedBalance[token] + amount;
        if (IERC20(token).balanceOf(address(this)) < newReserved) revert InsufficientReservedBalance();
        reservedBalance[token] = newReserved;

        positionId = _positions.length;
        _positions.push(Position({
            token: token,
            beneficiary: beneficiary,
            total: uint128(amount),
            claimed: 0,
            start: start,
            cliff: cliff,
            end: end
        }));
        _positionsByBeneficiary[beneficiary].push(positionId);
        emit PositionRegistered(positionId, token, beneficiary, amount, start, cliff, end);
    }

    function vestedAmount(uint256 positionId, uint256 timestamp) public view returns (uint256) {
        if (positionId >= _positions.length) revert InvalidPosition();
        Position memory position = _positions[positionId];
        if (timestamp < position.cliff) return 0;
        if (timestamp >= position.end) return position.total;
        return uint256(position.total) * (timestamp - position.start) / (position.end - position.start);
    }

    function claimable(uint256 positionId) external view returns (uint256) {
        Position memory position = _position(positionId);
        return vestedAmount(positionId, block.timestamp) - position.claimed;
    }

    /// @notice Claims only to the registered beneficiary. No arbitrary recipient is accepted.
    function claim(uint256 positionId) external nonReentrant returns (uint256 amount) {
        Position storage position = _positionStorage(positionId);
        if (msg.sender != position.beneficiary) revert Unauthorized();
        uint256 vested = vestedAmount(positionId, block.timestamp);
        amount = vested - position.claimed;
        if (amount == 0) revert NothingClaimable();

        position.claimed += uint128(amount);
        reservedBalance[position.token] -= amount;
        position.token.safeTransfer(position.beneficiary, amount);
        emit Claimed(positionId, position.beneficiary, amount);
    }

    function _position(uint256 positionId) private view returns (Position memory) {
        if (positionId >= _positions.length) revert InvalidPosition();
        return _positions[positionId];
    }

    function _positionStorage(uint256 positionId) private view returns (Position storage position) {
        if (positionId >= _positions.length) revert InvalidPosition();
        position = _positions[positionId];
    }
}
