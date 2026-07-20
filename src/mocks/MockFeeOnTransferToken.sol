// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20Metadata} from "../interfaces/IERC20Metadata.sol";

contract MockFeeOnTransferToken is IERC20Metadata {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;
    uint16 public immutable feeBps;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    constructor(string memory name_, string memory symbol_, uint16 feeBps_, address holder, uint256 supply) {
        name = name_;
        symbol = symbol_;
        feeBps = feeBps_;
        totalSupply = supply;
        balanceOf[holder] = supply;
        emit Transfer(address(0), holder, supply);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "allowance");
            allowance[from][msg.sender] = allowed - amount;
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) private {
        require(to != address(0), "receiver");
        require(balanceOf[from] >= amount, "balance");
        uint256 fee = amount * feeBps / 10_000;
        uint256 received = amount - fee;
        balanceOf[from] -= amount;
        balanceOf[to] += received;
        totalSupply -= fee;
        emit Transfer(from, to, received);
        if (fee != 0) emit Transfer(from, address(0), fee);
    }
}
