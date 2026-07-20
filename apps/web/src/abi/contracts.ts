export const launchpadAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "initialGuardian",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      }
    ],
    "name": "AdminActionAlreadyScheduled",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "expiresAt",
        "type": "uint64"
      }
    ],
    "name": "AdminActionExpired",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "AdminActionNotAllowed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "readyAt",
        "type": "uint64"
      }
    ],
    "name": "AdminActionNotReady",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      }
    ],
    "name": "AdminActionNotScheduled",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "CreatorAllocationTooHigh",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "DangerousSelector",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DeadlineExpired",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maximum",
        "type": "uint256"
      }
    ],
    "name": "DeadlineTooFar",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "EligibilityGateMissing",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "opcode",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      }
    ],
    "name": "ForbiddenOpcode",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "Ineligible",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "actualUsd18",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minimumUsd18",
        "type": "uint256"
      }
    ],
    "name": "InitialStockValueTooLow",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidConfiguration",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "target",
        "type": "address"
      }
    ],
    "name": "InvalidContract",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "decimals",
        "type": "uint8"
      }
    ],
    "name": "InvalidDecimals",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidFee",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidLiquidityLock",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidMetadataHash",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidName",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidPagination",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSupply",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSymbol",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NoPendingTransfer",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPaused",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPool",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "feed",
        "type": "address"
      }
    ],
    "name": "OracleAnswerInvalid",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "feed",
        "type": "address"
      },
      {
        "internalType": "int256",
        "name": "value",
        "type": "int256"
      }
    ],
    "name": "OracleAnswerOutOfRange",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "feed",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "updatedAt",
        "type": "uint256"
      }
    ],
    "name": "OracleStale",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Paused",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint64",
        "name": "expiresAt",
        "type": "uint64"
      }
    ],
    "name": "PendingTransferExpired",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "PoolEmergencyBlocked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Reentrancy",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "size",
        "type": "uint256"
      }
    ],
    "name": "RuntimeTooSmall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SelfRecipientRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SequencerDown",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "SequencerGracePeriod",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "expected",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "actual",
        "type": "bytes32"
      }
    ],
    "name": "StockCodeHashChanged",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "StockEmergencyBlocked",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "StockNotEnabled",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "symbolHash",
        "type": "bytes32"
      }
    ],
    "name": "SymbolAlreadyUsed",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "TokenTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Unauthorized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedGuardian",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "UnsupportedTokenBehavior",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "AdminActionCanceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "AdminActionExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "readyAt",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "expiresAt",
        "type": "uint64"
      }
    ],
    "name": "AdminActionScheduled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "gate",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "enforced",
        "type": "bool"
      }
    ],
    "name": "ComplianceUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "guardian",
        "type": "address"
      }
    ],
    "name": "GuardianUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "currentOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "canceledOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferCanceled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "currentOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "pendingOwner",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "expiresAt",
        "type": "uint64"
      }
    ],
    "name": "OwnershipTransferStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "launchId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "coinToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "coinAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stockAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint64",
        "name": "liquidityUnlockAt",
        "type": "uint64"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "liquidityLockId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "creatorVestingId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint16",
        "name": "feeBps",
        "type": "uint16"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "metadataHash",
        "type": "bytes32"
      }
    ],
    "name": "PairLaunched",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "bool",
        "name": "paused",
        "type": "bool"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "PauseStatusChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "blocked",
        "type": "bool"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "PoolEmergencyStatusChanged",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "feed",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "gracePeriod",
        "type": "uint32"
      }
    ],
    "name": "SequencerConfigUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "priceFeed",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "ticker",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "uint32",
        "name": "maxOracleAge",
        "type": "uint32"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "feedDecimals",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint128",
        "name": "minInitialStockValueUsd18",
        "type": "uint128"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "enabled",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "requireFreshOracleForSwaps",
        "type": "bool"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "approvedCodeHash",
        "type": "bytes32"
      }
    ],
    "name": "StockConfigured",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "blocked",
        "type": "bool"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "StockEmergencyStatusChanged",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ACTION_ADD_LIQUIDITY",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ACTION_REMOVE_LIQUIDITY",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ACTION_SWAP",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ADMIN_DELAY",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ADMIN_EXECUTION_GRACE",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CREATOR_VESTING_CLIFF",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "CREATOR_VESTING_DURATION",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_CREATOR_ALLOCATION_BPS",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_DEADLINE_WINDOW",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_FEE_BPS",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_LIQUIDITY_LOCK_DURATION",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_NAME_LENGTH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_PAGE_SIZE",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SYMBOL_LENGTH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MIN_LIQUIDITY_LOCK_DURATION",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "OWNERSHIP_ACCEPTANCE_WINDOW",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PROTOCOL_VERSION",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "acceptOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "callData",
        "type": "bytes"
      }
    ],
    "name": "adminActionId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "adminActionReadyAt",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "actor",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint8",
        "name": "action",
        "type": "uint8"
      }
    ],
    "name": "assertActionAllowed",
    "outputs": [],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      }
    ],
    "name": "assertOracleHealthy",
    "outputs": [],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      }
    ],
    "name": "cancelAdminAction",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cancelOwnershipTransfer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "clearPoolEmergencyBlock",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      }
    ],
    "name": "clearStockEmergencyBlock",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "coinBySymbolHash",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "complianceEnforced",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "priceFeed",
        "type": "address"
      },
      {
        "internalType": "bytes32",
        "name": "ticker",
        "type": "bytes32"
      },
      {
        "internalType": "uint32",
        "name": "maxOracleAge",
        "type": "uint32"
      },
      {
        "internalType": "uint128",
        "name": "minInitialStockValueUsd18",
        "type": "uint128"
      },
      {
        "internalType": "bool",
        "name": "enabled",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "requireFreshOracleForSwaps",
        "type": "bool"
      }
    ],
    "name": "configureStock",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "creatorVestingVault",
    "outputs": [
      {
        "internalType": "contract CreatorVestingVault",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "eligibilityGate",
    "outputs": [
      {
        "internalType": "contract IEligibilityGate",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "emergencyBlockPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      }
    ],
    "name": "emergencyBlockStock",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "guardian",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "guardianCancelOwnershipTransfer",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "isPool",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "expectedCoin",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "expectedStock",
        "type": "address"
      }
    ],
    "name": "isTrustedPool",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      }
    ],
    "name": "latestStockPrice",
    "outputs": [
      {
        "internalType": "int256",
        "name": "answer",
        "type": "int256"
      },
      {
        "internalType": "uint8",
        "name": "feedDecimals",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "updatedAt",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "fresh",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "symbol",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "metadataHash",
            "type": "bytes32"
          },
          {
            "internalType": "address",
            "name": "stockToken",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "totalCoinSupply",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "poolCoinAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "creatorCoinAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "stockAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint16",
            "name": "feeBps",
            "type": "uint16"
          },
          {
            "internalType": "uint32",
            "name": "liquidityLockDuration",
            "type": "uint32"
          },
          {
            "internalType": "uint256",
            "name": "minInitialLiquidity",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "deadline",
            "type": "uint256"
          }
        ],
        "internalType": "struct StockCoinLaunchpad.LaunchParams",
        "name": "params",
        "type": "tuple"
      }
    ],
    "name": "launch",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "launchId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "coinToken",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "launchAt",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "coinToken",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "stockToken",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "createdAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "liquidityUnlockAt",
            "type": "uint64"
          },
          {
            "internalType": "uint16",
            "name": "feeBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "liquidityLockId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "creatorVestingId",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "metadataHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct StockCoinLaunchpad.LaunchRecord",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "launchCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "pool",
        "type": "address"
      }
    ],
    "name": "launchIdForPool",
    "outputs": [
      {
        "internalType": "bool",
        "name": "found",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "launchId",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "launchIdPlusOneByCoin",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "launchIdPlusOneByPool",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      }
    ],
    "name": "launchIdsByCreator",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "launchTokenDeployer",
    "outputs": [
      {
        "internalType": "contract LaunchTokenDeployer",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "offset",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limit",
        "type": "uint256"
      }
    ],
    "name": "launchesPage",
    "outputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "creator",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "coinToken",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "stockToken",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "pool",
            "type": "address"
          },
          {
            "internalType": "uint64",
            "name": "createdAt",
            "type": "uint64"
          },
          {
            "internalType": "uint64",
            "name": "liquidityUnlockAt",
            "type": "uint64"
          },
          {
            "internalType": "uint16",
            "name": "feeBps",
            "type": "uint16"
          },
          {
            "internalType": "uint256",
            "name": "liquidityLockId",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "creatorVestingId",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "metadataHash",
            "type": "bytes32"
          }
        ],
        "internalType": "struct StockCoinLaunchpad.LaunchRecord[]",
        "name": "page",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "liquidityLocker",
    "outputs": [
      {
        "internalType": "contract LiquidityLocker",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "paused",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingOwner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pendingOwnerExpiresAt",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "poolDeployer",
    "outputs": [
      {
        "internalType": "contract StockCoinPoolDeployer",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "poolEmergencyBlocked",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "stockToken",
        "type": "address"
      }
    ],
    "name": "poolsByStock",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "",
        "type": "address[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes",
        "name": "callData",
        "type": "bytes"
      }
    ],
    "name": "scheduleAdminAction",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "actionId",
        "type": "bytes32"
      },
      {
        "internalType": "uint64",
        "name": "readyAt",
        "type": "uint64"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sequencerGracePeriod",
    "outputs": [
      {
        "internalType": "uint32",
        "name": "",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sequencerUptimeFeed",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "gate",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "enforced",
        "type": "bool"
      }
    ],
    "name": "setCompliance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newGuardian",
        "type": "address"
      }
    ],
    "name": "setGuardian",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "feed",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "gracePeriod",
        "type": "uint32"
      }
    ],
    "name": "setSequencerConfig",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "index",
        "type": "uint256"
      }
    ],
    "name": "stockAt",
    "outputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "bool",
            "name": "enabled",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "requireFreshOracleForSwaps",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "emergencyBlocked",
            "type": "bool"
          },
          {
            "internalType": "address",
            "name": "priceFeed",
            "type": "address"
          },
          {
            "internalType": "uint32",
            "name": "maxOracleAge",
            "type": "uint32"
          },
          {
            "internalType": "uint8",
            "name": "feedDecimals",
            "type": "uint8"
          },
          {
            "internalType": "bytes32",
            "name": "ticker",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "approvedCodeHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint128",
            "name": "minInitialStockValueUsd18",
            "type": "uint128"
          }
        ],
        "internalType": "struct StockCoinLaunchpad.StockConfig",
        "name": "config",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "stockConfigs",
    "outputs": [
      {
        "internalType": "bool",
        "name": "enabled",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "requireFreshOracleForSwaps",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "emergencyBlocked",
        "type": "bool"
      },
      {
        "internalType": "address",
        "name": "priceFeed",
        "type": "address"
      },
      {
        "internalType": "uint32",
        "name": "maxOracleAge",
        "type": "uint32"
      },
      {
        "internalType": "uint8",
        "name": "feedDecimals",
        "type": "uint8"
      },
      {
        "internalType": "bytes32",
        "name": "ticker",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "approvedCodeHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint128",
        "name": "minInitialStockValueUsd18",
        "type": "uint128"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "stockCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      }
    ],
    "name": "symbolHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "nextOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const poolAbi = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "factory_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "coinToken_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "stockToken_",
        "type": "address"
      },
      {
        "internalType": "uint16",
        "name": "feeBps_",
        "type": "uint16"
      },
      {
        "internalType": "string",
        "name": "lpName",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "lpSymbol",
        "type": "string"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AlreadyInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DeadlineExpired",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maximum",
        "type": "uint256"
      }
    ],
    "name": "DeadlineTooFar",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientLiquidityBurned",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientLiquidityMinted",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientOutput",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidAmount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidFee",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRecipient",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSpender",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvariantViolation",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Reentrancy",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReserveOverflow",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "minimumProvided",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "minimumRequired",
        "type": "uint256"
      }
    ],
    "name": "SlippageLimitTooLoose",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "maximum",
        "type": "uint256"
      }
    ],
    "name": "SwapTooLarge",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      },
      {
        "internalType": "bytes4",
        "name": "selector",
        "type": "bytes4"
      }
    ],
    "name": "TokenTransferFailed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "UnauthorizedFactory",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "UnsupportedTokenBehavior",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "coinAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stockAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "name": "Initialized",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "coinAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stockAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "name": "LiquidityAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "provider",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "coinAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "stockAmount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "name": "LiquidityRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "name": "Swap",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": false,
        "internalType": "uint112",
        "name": "reserveCoin",
        "type": "uint112"
      },
      {
        "indexed": false,
        "internalType": "uint112",
        "name": "reserveStock",
        "type": "uint112"
      }
    ],
    "name": "Sync",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "LOCKED_LIQUIDITY",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_DEADLINE_WINDOW",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_LIQUIDITY_SLIPPAGE_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SWAP_INPUT_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MAX_SWAP_SLIPPAGE_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MINIMUM_LIQUIDITY",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PROTOCOL_VERSION",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "coinDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stockDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "coinMin",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stockMin",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "liquidityMin",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "addLiquidity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "coinAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stockAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "coinToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "createdAt",
    "outputs": [
      {
        "internalType": "uint64",
        "name": "",
        "type": "uint64"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cumulativeCoinVolume",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "cumulativeStockVolume",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "factory",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feeBps",
    "outputs": [
      {
        "internalType": "uint16",
        "name": "",
        "type": "uint16"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolState",
    "outputs": [
      {
        "internalType": "uint112",
        "name": "reserveCoin",
        "type": "uint112"
      },
      {
        "internalType": "uint112",
        "name": "reserveStock",
        "type": "uint112"
      },
      {
        "internalType": "uint32",
        "name": "lastUpdated",
        "type": "uint32"
      },
      {
        "internalType": "uint256",
        "name": "lpSupply",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "swaps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "coinVolume",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stockVolume",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getReserves",
    "outputs": [
      {
        "internalType": "uint112",
        "name": "reserveCoin",
        "type": "uint112"
      },
      {
        "internalType": "uint112",
        "name": "reserveStock",
        "type": "uint112"
      },
      {
        "internalType": "uint32",
        "name": "lastUpdated",
        "type": "uint32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "minLiquidity",
        "type": "uint256"
      }
    ],
    "name": "initialize",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "initialized",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "coinDesired",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stockDesired",
        "type": "uint256"
      }
    ],
    "name": "previewAddLiquidity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "coinAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stockAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      }
    ],
    "name": "previewRemoveLiquidity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "coinAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stockAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "tokenIn",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      }
    ],
    "name": "quoteExactInput",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "liquidity",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "coinMin",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stockMin",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "removeLiquidity",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "coinAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "stockAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "stockToken",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "swapCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountOutMin",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "swapExactCoinForStock",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "amountIn",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amountOutMin",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "deadline",
        "type": "uint256"
      }
    ],
    "name": "swapExactStockForCoin",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "amountOut",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sync",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export const erc20Abi = [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name_",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol_",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "metadataHash_",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "issuer_",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "poolFundingReceiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "poolFundingAmount",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "creatorVestingReceiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "creatorVestingAmount",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidSpender",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "PROTOCOL_VERSION",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "issuer",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "metadataHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const
