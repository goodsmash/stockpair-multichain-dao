// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20Base} from "../utils/ERC20Base.sol";

contract MockDangerousStockToken is ERC20Base {
    constructor(address holder, uint256 supply) ERC20Base("Dangerous Stock", "DNG") { _mint(holder, supply); }
    function mint(address to, uint256 amount) external { _mint(to, amount); }
}
