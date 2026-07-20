// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "../interfaces/IERC20.sol";

library SafeTransferLib {
    error TokenTransferFailed(address token, bytes4 selector);

    function safeTransfer(address token, address to, uint256 amount) internal {
        _call(token, abi.encodeCall(IERC20.transfer, (to, amount)), IERC20.transfer.selector);
    }

    function safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        _call(token, abi.encodeCall(IERC20.transferFrom, (from, to, amount)), IERC20.transferFrom.selector);
    }

    function safeApprove(address token, address spender, uint256 amount) internal {
        _call(token, abi.encodeCall(IERC20.approve, (spender, amount)), IERC20.approve.selector);
    }

    function _call(address token, bytes memory payload, bytes4 selector) private {
        (bool success, bytes memory returndata) = token.call(payload);
        if (!success || (returndata.length != 0 && (returndata.length < 32 || !abi.decode(returndata, (bool))))) {
            revert TokenTransferFailed(token, selector);
        }
    }
}
