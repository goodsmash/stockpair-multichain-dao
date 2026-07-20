// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

abstract contract TwoStepAdmin {
    error Unauthorized();
    error ZeroAddress();
    error NoPendingTransfer();
    error PendingTransferExpired(uint64 expiresAt);

    uint64 public constant OWNERSHIP_ACCEPTANCE_WINDOW = 7 days;

    address public owner;
    address public pendingOwner;
    uint64 public pendingOwnerExpiresAt;

    event OwnershipTransferStarted(address indexed currentOwner, address indexed pendingOwner, uint64 expiresAt);
    event OwnershipTransferCanceled(address indexed currentOwner, address indexed canceledOwner);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    function transferOwnership(address nextOwner) public virtual onlyOwner {
        _startOwnershipTransfer(nextOwner);
    }

    function cancelOwnershipTransfer() public virtual onlyOwner {
        _cancelOwnershipTransfer();
    }

    function acceptOwnership() public virtual {
        if (msg.sender != pendingOwner) revert Unauthorized();
        uint64 expiresAt = pendingOwnerExpiresAt;
        if (expiresAt == 0) revert NoPendingTransfer();
        if (block.timestamp > expiresAt) revert PendingTransferExpired(expiresAt);
        address previous = owner;
        owner = msg.sender;
        pendingOwner = address(0);
        pendingOwnerExpiresAt = 0;
        emit OwnershipTransferred(previous, msg.sender);
    }

    function _startOwnershipTransfer(address nextOwner) internal {
        if (nextOwner == address(0)) revert ZeroAddress();
        pendingOwner = nextOwner;
        pendingOwnerExpiresAt = uint64(block.timestamp + OWNERSHIP_ACCEPTANCE_WINDOW);
        emit OwnershipTransferStarted(owner, nextOwner, pendingOwnerExpiresAt);
    }

    function _cancelOwnershipTransfer() internal {
        address canceled = pendingOwner;
        if (canceled == address(0)) revert NoPendingTransfer();
        pendingOwner = address(0);
        pendingOwnerExpiresAt = 0;
        emit OwnershipTransferCanceled(owner, canceled);
    }
}
