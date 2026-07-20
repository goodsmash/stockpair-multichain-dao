// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20Base} from "../utils/ERC20Base.sol";

contract MockStockToken is ERC20Base {
    uint256 public uiMultiplier = 1e18;

    constructor(string memory name_, string memory symbol_) ERC20Base(name_, symbol_) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setUiMultiplier(uint256 multiplier) external {
        uiMultiplier = multiplier;
    }
}
