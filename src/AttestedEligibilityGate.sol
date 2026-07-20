// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IEligibilityGate} from "./interfaces/IEligibilityGate.sol";
import {TwoStepAdmin} from "./utils/TwoStepAdmin.sol";

/// @notice On-chain eligibility cache for an external KYC/sanctions decision service.
/// @dev Stores only wallet and expiry. Sensitive identity and screening evidence remain off-chain.
///      Recovery actions are delayed and guardian-cancelable; emergency denials remain immediate.
contract AttestedEligibilityGate is IEligibilityGate, TwoStepAdmin {
    error UnauthorizedAttestor();
    error UnauthorizedGuardian();
    error InvalidAttestor();
    error InvalidGuardian();
    error InvalidBatch();
    error InvalidAccount();
    error InvalidEligibilityExpiry(uint64 validUntil);
    error AdminActionNotAllowed(bytes4 selector);
    error AdminActionAlreadyScheduled(bytes32 actionId);
    error AdminActionNotScheduled(bytes32 actionId);
    error AdminActionNotReady(bytes32 actionId, uint64 readyAt);
    error AdminActionExpired(bytes32 actionId, uint64 expiresAt);

    bytes32 public constant PROTOCOL_VERSION = keccak256("STOCKPAIR_ELIGIBILITY_GATE_V0.6.0");
    uint256 public constant MAX_BATCH = 200;
    uint64 public constant MAX_ELIGIBILITY_DURATION = 30 days;
    uint64 public constant ADMIN_DELAY = 48 hours;
    uint64 public constant ADMIN_EXECUTION_GRACE = 7 days;

    address public attestor;
    address public guardian;
    mapping(address => uint64) public eligibleUntil;
    mapping(address => bool) public emergencyDenied;
    mapping(bytes32 => uint64) public adminActionReadyAt;

    event AdminActionScheduled(bytes32 indexed actionId, bytes4 indexed selector, uint64 readyAt, uint64 expiresAt);
    event AdminActionCanceled(bytes32 indexed actionId, address indexed caller);
    event AdminActionExecuted(bytes32 indexed actionId, bytes4 indexed selector);
    event AttestorUpdated(address indexed attestor);
    event GuardianUpdated(address indexed guardian);
    event EligibilityUpdated(address indexed account, uint64 validUntil);
    event EmergencyDenialUpdated(address indexed account, bool denied, address indexed caller);

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

    constructor(address initialOwner, address initialAttestor, address initialGuardian) TwoStepAdmin(initialOwner) {
        if (initialAttestor == address(0)) revert InvalidAttestor();
        if (initialGuardian == address(0)) revert InvalidGuardian();
        attestor = initialAttestor;
        guardian = initialGuardian;
        emit AttestorUpdated(initialAttestor);
        emit GuardianUpdated(initialGuardian);
    }

    function isEligible(address account) external view returns (bool) {
        return account != address(0) && !emergencyDenied[account] && eligibleUntil[account] >= block.timestamp;
    }

    function adminActionId(bytes calldata callData) external view returns (bytes32) { return _adminActionId(callData); }

    function scheduleAdminAction(bytes calldata callData) external onlyOwner returns (bytes32 actionId, uint64 readyAt) {
        if (callData.length < 4) revert InvalidBatch();
        bytes4 selector = _selector(callData);
        if (!_isTimelockedSelector(selector)) revert AdminActionNotAllowed(selector);
        actionId = _adminActionId(callData);
        if (adminActionReadyAt[actionId] != 0) revert AdminActionAlreadyScheduled(actionId);
        readyAt = uint64(block.timestamp + ADMIN_DELAY);
        adminActionReadyAt[actionId] = readyAt;
        emit AdminActionScheduled(actionId, selector, readyAt, readyAt + ADMIN_EXECUTION_GRACE);
    }

    function cancelAdminAction(bytes32 actionId) external {
        if (msg.sender != owner && msg.sender != guardian) revert UnauthorizedGuardian();
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

    function setAttestor(address newAttestor) external onlyOwner onlyScheduledAdminAction {
        if (newAttestor == address(0)) revert InvalidAttestor();
        attestor = newAttestor;
        emit AttestorUpdated(newAttestor);
    }

    function setGuardian(address newGuardian) external onlyOwner onlyScheduledAdminAction {
        if (newGuardian == address(0)) revert InvalidGuardian();
        guardian = newGuardian;
        emit GuardianUpdated(newGuardian);
    }

    function setEligibility(address account, uint64 validUntil) external {
        if (msg.sender != owner && msg.sender != attestor) revert UnauthorizedAttestor();
        _validateEligibility(account, validUntil);
        eligibleUntil[account] = validUntil;
        emit EligibilityUpdated(account, validUntil);
    }

    function setEligibilityBatch(address[] calldata accounts, uint64[] calldata validUntil) external {
        if (msg.sender != owner && msg.sender != attestor) revert UnauthorizedAttestor();
        uint256 length = accounts.length;
        if (length == 0 || length > MAX_BATCH || length != validUntil.length) revert InvalidBatch();
        for (uint256 i; i < length; ++i) {
            _validateEligibility(accounts[i], validUntil[i]);
            eligibleUntil[accounts[i]] = validUntil[i];
            emit EligibilityUpdated(accounts[i], validUntil[i]);
        }
    }

    function emergencyDeny(address account) external {
        if (msg.sender != owner && msg.sender != guardian) revert UnauthorizedGuardian();
        if (account == address(0)) revert InvalidAccount();
        emergencyDenied[account] = true;
        emit EmergencyDenialUpdated(account, true, msg.sender);
    }

    function clearEmergencyDeny(address account) external onlyOwner onlyScheduledAdminAction {
        if (account == address(0)) revert InvalidAccount();
        emergencyDenied[account] = false;
        emit EmergencyDenialUpdated(account, false, msg.sender);
    }

    function _validateEligibility(address account, uint64 validUntil) private view {
        if (account == address(0)) revert InvalidAccount();
        if (validUntil == 0) return; // immediate revocation remains available to owner/attestor
        if (validUntil <= block.timestamp || validUntil > block.timestamp + MAX_ELIGIBILITY_DURATION) {
            revert InvalidEligibilityExpiry(validUntil);
        }
    }

    function _adminActionId(bytes calldata callData) private view returns (bytes32) {
        return keccak256(abi.encode(block.chainid, address(this), callData));
    }

    function _selector(bytes calldata callData) private pure returns (bytes4 selector) {
        assembly ("memory-safe") { selector := calldataload(callData.offset) }
    }

    function _isTimelockedSelector(bytes4 selector) private pure returns (bool) {
        return selector == this.transferOwnership.selector || selector == this.setAttestor.selector
            || selector == this.setGuardian.selector || selector == this.clearEmergencyDeny.selector;
    }
}
