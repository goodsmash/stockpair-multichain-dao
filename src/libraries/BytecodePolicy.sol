// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Strict bytecode policy for production stock-token assets.
/// @dev This deliberately rejects delegate-based and self-destructible runtimes. It is a conservative
///      defense-in-depth boundary, not a proof that an accepted token is economically or legally safe.
///      The full runtime is scanned, including compiler metadata, because handcrafted bytecode can jump
///      into a valid-looking metadata trailer. Ambiguous runtime bytes are rejected rather than trusted.
library BytecodePolicy {
    error RuntimeTooSmall(address token, uint256 size);
    error ForbiddenOpcode(address token, uint8 opcode, uint256 offset);
    error DangerousSelector(address token, bytes4 selector);

    uint256 internal constant MIN_RUNTIME_SIZE = 128;

    bytes4 internal constant MINT_SELECTOR = bytes4(keccak256("mint(address,uint256)"));
    bytes4 internal constant BLACKLIST_SELECTOR = bytes4(keccak256("blacklist(address)"));
    bytes4 internal constant SET_BLACKLIST_SELECTOR = bytes4(keccak256("setBlacklist(address,bool)"));
    bytes4 internal constant SET_SELL_FEE_SELECTOR = bytes4(keccak256("setSellFee(uint256)"));
    bytes4 internal constant SET_FEES_SELECTOR = bytes4(keccak256("setFees(uint256,uint256)"));
    bytes4 internal constant SET_TRADING_SELECTOR = bytes4(keccak256("setTradingEnabled(bool)"));
    bytes4 internal constant PAUSE_SELECTOR = bytes4(keccak256("pause()"));
    bytes4 internal constant UPGRADE_TO_SELECTOR = bytes4(keccak256("upgradeTo(address)"));
    bytes4 internal constant UPGRADE_TO_AND_CALL_SELECTOR = bytes4(keccak256("upgradeToAndCall(address,bytes)"));
    bytes4 internal constant SET_IMPLEMENTATION_SELECTOR = bytes4(keccak256("setImplementation(address)"));

    function validateStrictAsset(address token) internal view returns (bytes32 codeHash) {
        bytes memory code = token.code;
        uint256 length = code.length;
        if (length < MIN_RUNTIME_SIZE) revert RuntimeTooSmall(token, length);

        for (uint256 i; i < length;) {
            uint8 opcode = uint8(code[i]);
            if (opcode == 0xf2 || opcode == 0xf4 || opcode == 0xff) {
                revert ForbiddenOpcode(token, opcode, i);
            }
            if (opcode >= 0x60 && opcode <= 0x7f) {
                uint256 next = i + uint256(opcode) - 0x5f + 1;
                i = next > length ? length : next;
            } else {
                unchecked { ++i; }
            }
        }

        _rejectSelector(token, code, MINT_SELECTOR);
        _rejectSelector(token, code, BLACKLIST_SELECTOR);
        _rejectSelector(token, code, SET_BLACKLIST_SELECTOR);
        _rejectSelector(token, code, SET_SELL_FEE_SELECTOR);
        _rejectSelector(token, code, SET_FEES_SELECTOR);
        _rejectSelector(token, code, SET_TRADING_SELECTOR);
        _rejectSelector(token, code, PAUSE_SELECTOR);
        _rejectSelector(token, code, UPGRADE_TO_SELECTOR);
        _rejectSelector(token, code, UPGRADE_TO_AND_CALL_SELECTOR);
        _rejectSelector(token, code, SET_IMPLEMENTATION_SELECTOR);

        codeHash = token.codehash;
    }

    function _rejectSelector(address token, bytes memory code, bytes4 selector) private pure {
        uint256 length = code.length;
        if (length < 4) return;
        for (uint256 i; i + 4 <= length; ++i) {
            bytes4 candidate;
            assembly ("memory-safe") {
                candidate := mload(add(add(code, 0x20), i))
            }
            if (candidate == selector) revert DangerousSelector(token, selector);
        }
    }
}
