// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20Base} from "../utils/ERC20Base.sol";

contract MockERC20 is ERC20Base {
    uint8 private immutable _mockDecimals;

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20Base(name_, symbol_) {
        _mockDecimals = decimals_;
    }

    function decimals() public view override returns (uint8) {
        return _mockDecimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
