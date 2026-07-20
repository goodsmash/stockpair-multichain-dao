// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20Base} from "../utils/ERC20Base.sol";

/// @dev Fixed-supply, non-upgradeable ERC-20-like stock mock with no privileged runtime selectors.
contract MockStrictStockToken is ERC20Base {
    constructor(string memory name_, string memory symbol_, address holder, uint256 supply)
        ERC20Base(name_, symbol_)
    {
        _mint(holder, supply);
    }
}
