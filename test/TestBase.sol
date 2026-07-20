// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface Vm {
    function prank(address) external;
    function startPrank(address) external;
    function stopPrank() external;
    function warp(uint256) external;
    function expectRevert() external;
    function expectRevert(bytes4) external;
    function expectRevert(bytes calldata) external;
    function assume(bool) external;
}

abstract contract TestBase {
    Vm internal constant vm = Vm(address(uint160(uint256(keccak256("hevm cheat code")))));

    error AssertionFailed();

    function assertTrue(bool value) internal pure {
        if (!value) revert AssertionFailed();
    }

    function assertEq(uint256 a, uint256 b) internal pure {
        if (a != b) revert AssertionFailed();
    }

    function assertEq(address a, address b) internal pure {
        if (a != b) revert AssertionFailed();
    }

    function assertGe(uint256 a, uint256 b) internal pure {
        if (a < b) revert AssertionFailed();
    }

    function assertGt(uint256 a, uint256 b) internal pure {
        if (a <= b) revert AssertionFailed();
    }
}
