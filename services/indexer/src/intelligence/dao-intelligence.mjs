import { getAddress, isAddress, parseAbi, toFunctionSelector, zeroAddress } from 'viem'

const DAO_PROBE_ABI = parseAbi([
  'function name() view returns (string)',
  'function version() view returns (string)',
  'function owner() view returns (address)',
  'function getOwners() view returns (address[])',
  'function getThreshold() view returns (uint256)',
  'function nonce() view returns (uint256)',
  'function votingDelay() view returns (uint256)',
  'function votingPeriod() view returns (uint256)',
  'function proposalThreshold() view returns (uint256)',
  'function quorum(uint256) view returns (uint256)',
  'function getMinDelay() view returns (uint256)',
  'function token() view returns (address)',
  'function timelock() view returns (address)'
])

const CAPABILITIES = Object.freeze({
  governor: Object.freeze([
    'propose(address[],uint256[],bytes[],string)',
    'castVote(uint256,uint8)',
    'castVoteWithReason(uint256,uint8,string)',
    'state(uint256)',
    'quorum(uint256)',
    'votingDelay()',
    'votingPeriod()',
    'proposalThreshold()',
    'queue(address[],uint256[],bytes[],bytes32)',
    'execute(address[],uint256[],bytes[],bytes32)'
  ]),
  timelock: Object.freeze([
    'schedule(address,uint256,bytes,bytes32,bytes32,uint256)',
    'scheduleBatch(address[],uint256[],bytes[],bytes32,bytes32,uint256)',
    'execute(address,uint256,bytes,bytes32,bytes32)',
    'executeBatch(address[],uint256[],bytes[],bytes32,bytes32)',
    'getMinDelay()',
    'isOperation(bytes32)',
    'cancel(bytes32)'
  ]),
  multisig: Object.freeze([
    'getOwners()',
    'getThreshold()',
    'execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)',
    'nonce()',
    'isOwner(address)'
  ]),
  votes: Object.freeze([
    'delegate(address)',
    'delegates(address)',
    'getVotes(address)',
    'getPastVotes(address,uint256)',
    'getPastTotalSupply(uint256)',
    'clock()',
    'CLOCK_MODE()'
  ]),
  accessControl: Object.freeze([
    'hasRole(bytes32,address)',
    'grantRole(bytes32,address)',
    'revokeRole(bytes32,address)',
    'renounceRole(bytes32,address)',
    'getRoleAdmin(bytes32)'
  ])
})

const SELECTOR_INDEX = new Map()
for (const [group, signatures] of Object.entries(CAPABILITIES)) {
  for (const signature of signatures) SELECTOR_INDEX.set(toFunctionSelector(signature).slice(2).toLowerCase(), { group, signature })
}

function sanitizeText(value, max = 120) {
  if (typeof value !== 'string') return null
  const cleaned = value.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return cleaned ? cleaned.slice(0, max) : null
}

function asAddress(value) {
  try { return typeof value === 'string' && isAddress(value) ? getAddress(value) : null } catch { return null }
}

function bigintString(value) {
  try { return typeof value === 'bigint' || typeof value === 'number' || /^\d+$/.test(String(value)) ? BigInt(value).toString() : null } catch { return null }
}

function confidenceFor(roles, matchCount) {
  if (roles.some((item) => item.confidence === 'high') && matchCount >= 4) return 'high'
  if (roles.length && matchCount >= 2) return 'medium'
  return roles.length ? 'low' : 'none'
}

export function analyzeDaoBytecode(bytecode) {
  const code = typeof bytecode === 'string' && /^0x[0-9a-fA-F]*$/.test(bytecode) ? bytecode.slice(2).toLowerCase() : ''
  const grouped = new Map()
  for (const [selector, evidence] of SELECTOR_INDEX) {
    if (!code.includes(selector)) continue
    const rows = grouped.get(evidence.group) ?? []
    rows.push({ selector: `0x${selector}`, signature: evidence.signature })
    grouped.set(evidence.group, rows)
  }

  const roles = []
  const governor = grouped.get('governor') ?? []
  const timelock = grouped.get('timelock') ?? []
  const multisig = grouped.get('multisig') ?? []
  const votes = grouped.get('votes') ?? []
  const accessControl = grouped.get('accessControl') ?? []

  const signatures = (rows) => new Set(rows.map((item) => item.signature))
  const governorSet = signatures(governor)
  const timelockSet = signatures(timelock)
  const multisigSet = signatures(multisig)

  if (governor.length >= 3 || (governorSet.has('propose(address[],uint256[],bytes[],string)') && [...governorSet].some((item) => item.startsWith('castVote')))) {
    roles.push({ role: 'governor', confidence: governor.length >= 5 ? 'high' : 'medium', matches: governor.length })
  }
  if (timelock.length >= 3 || (timelockSet.has('getMinDelay()') && [...timelockSet].some((item) => item.startsWith('execute')))) {
    roles.push({ role: 'timelock', confidence: timelock.length >= 5 ? 'high' : 'medium', matches: timelock.length })
  }
  if (multisigSet.has('getOwners()') && multisigSet.has('getThreshold()')) {
    roles.push({ role: 'multisig-treasury', confidence: multisigSet.has('execTransaction(address,uint256,bytes,uint8,uint256,uint256,uint256,address,address,bytes)') ? 'high' : 'medium', matches: multisig.length })
  }
  if (votes.length >= 2) roles.push({ role: 'governance-token-or-votes-module', confidence: votes.length >= 4 ? 'high' : 'medium', matches: votes.length })
  if (accessControl.length >= 2 && roles.length) roles.push({ role: 'role-managed-governance-component', confidence: accessControl.length >= 4 ? 'high' : 'medium', matches: accessControl.length })

  const matchCount = [...grouped.values()].reduce((sum, rows) => sum + rows.length, 0)
  const score = Math.min(100, roles.reduce((sum, item) => sum + (item.confidence === 'high' ? 28 : item.confidence === 'medium' ? 18 : 8), 0) + Math.min(20, matchCount * 2))
  return {
    candidate: roles.length > 0,
    confidence: confidenceFor(roles, matchCount),
    score,
    roles,
    matches: Object.fromEntries([...grouped.entries()]),
    limitation: 'Selector fingerprints identify governance-like capabilities, not project identity, current control, legal ownership or beneficial ownership. Proxies and custom governance implementations require implementation-level review.'
  }
}

async function safeRead(client, address, functionName, args = []) {
  try { return await client.readContract({ address, abi: DAO_PROBE_ABI, functionName, args }) } catch { return undefined }
}

export async function probeDaoContract(client, addressInput, profile, blockNumber = null) {
  if (!profile?.candidate || !isAddress(addressInput)) return null
  const address = getAddress(addressInput)
  const wants = new Set(profile.roles.map((item) => item.role))
  const calls = [
    ['name', safeRead(client, address, 'name')],
    ['version', safeRead(client, address, 'version')],
    ['owner', safeRead(client, address, 'owner')],
    ['token', safeRead(client, address, 'token')],
    ['timelock', safeRead(client, address, 'timelock')]
  ]
  if (wants.has('multisig-treasury')) calls.push(
    ['owners', safeRead(client, address, 'getOwners')],
    ['threshold', safeRead(client, address, 'getThreshold')],
    ['nonce', safeRead(client, address, 'nonce')]
  )
  if (wants.has('governor')) calls.push(
    ['votingDelay', safeRead(client, address, 'votingDelay')],
    ['votingPeriod', safeRead(client, address, 'votingPeriod')],
    ['proposalThreshold', safeRead(client, address, 'proposalThreshold')],
    ['quorum', blockNumber === null ? Promise.resolve(undefined) : safeRead(client, address, 'quorum', [blockNumber > 0n ? blockNumber - 1n : 0n])]
  )
  if (wants.has('timelock')) calls.push(['minDelay', safeRead(client, address, 'getMinDelay')])

  const resolved = await Promise.all(calls.map(async ([key, promise]) => [key, await promise]))
  const values = Object.fromEntries(resolved)
  const owners = Array.isArray(values.owners) ? values.owners.map(asAddress).filter(Boolean).slice(0, 100) : []
  return {
    name: sanitizeText(values.name, 120),
    version: sanitizeText(values.version, 80),
    owner: asAddress(values.owner),
    token: asAddress(values.token),
    timelock: asAddress(values.timelock),
    owners,
    threshold: bigintString(values.threshold),
    nonce: bigintString(values.nonce),
    votingDelay: bigintString(values.votingDelay),
    votingPeriod: bigintString(values.votingPeriod),
    proposalThreshold: bigintString(values.proposalThreshold),
    quorum: bigintString(values.quorum),
    minDelay: bigintString(values.minDelay),
    controlRenounced: asAddress(values.owner)?.toLowerCase() === zeroAddress,
    observedAtBlock: blockNumber === null ? null : blockNumber.toString()
  }
}

function finiteTime(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return null
  return number > 10_000_000_000 ? number : number * 1000
}

export function assessDaoDormancy(input = {}) {
  const nowMs = finiteTime(input.nowMs) ?? Date.now()
  const deployedAtMs = finiteTime(input.deployedAt)
  const lastActivityAtMs = finiteTime(input.lastActivityAt) ?? deployedAtMs
  const minAgeDays = Math.max(1, Number(input.minAgeDays ?? 30))
  const inactiveDaysThreshold = Math.max(1, Number(input.inactiveDays ?? 180))
  const lowBalanceWei = BigInt(String(input.lowBalanceWei ?? '1000000000000000'))
  const balanceWei = BigInt(String(input.nativeBalanceWei ?? '0'))
  const observedCallCount = Math.max(0, Number(input.observedCallCount ?? 0))
  const hasLiveLiquidity = input.hasLiveLiquidity === true
  const ageDays = deployedAtMs === null ? null : Math.max(0, (nowMs - deployedAtMs) / 86_400_000)
  const inactiveForDays = lastActivityAtMs === null ? null : Math.max(0, (nowMs - lastActivityAtMs) / 86_400_000)

  const signals = []
  let score = 0
  if (ageDays === null) signals.push({ code: 'AGE_UNKNOWN', weight: 0, detail: 'Deployment timestamp is unavailable in the indexed evidence.' })
  else if (ageDays >= minAgeDays) { score += 20; signals.push({ code: 'MATURE_CONTRACT', weight: 20, detail: `Contract age is approximately ${ageDays.toFixed(1)} days.` }) }
  else signals.push({ code: 'NEW_CONTRACT', weight: -20, detail: `Contract is newer than the ${minAgeDays}-day dormancy evaluation floor.` })

  if (inactiveForDays === null) signals.push({ code: 'ACTIVITY_UNKNOWN', weight: 0, detail: 'No reliable last-activity timestamp is available.' })
  else if (inactiveForDays >= inactiveDaysThreshold) { score += 45; signals.push({ code: 'LONG_INACTIVITY', weight: 45, detail: `No indexed call activity for approximately ${inactiveForDays.toFixed(1)} days.` }) }
  else if (inactiveForDays >= inactiveDaysThreshold / 2) { score += 22; signals.push({ code: 'REDUCED_ACTIVITY', weight: 22, detail: `No indexed call activity for approximately ${inactiveForDays.toFixed(1)} days.` }) }
  else { score -= 20; signals.push({ code: 'RECENT_ACTIVITY', weight: -20, detail: `Indexed activity occurred approximately ${inactiveForDays.toFixed(1)} days ago.` }) }

  if (observedCallCount === 0) { score += 10; signals.push({ code: 'NO_POST_DEPLOYMENT_CALLS', weight: 10, detail: 'No post-deployment calls were observed within configured index coverage.' }) }
  if (balanceWei <= lowBalanceWei) { score += 15; signals.push({ code: 'LOW_NATIVE_TREASURY', weight: 15, detail: 'Current native balance is at or below the configured low-balance threshold.' }) }
  else { score -= 5; signals.push({ code: 'NATIVE_TREASURY_PRESENT', weight: -5, detail: 'The contract currently holds native currency above the low-balance threshold.' }) }
  if (hasLiveLiquidity) { score -= 15; signals.push({ code: 'LIVE_MARKET_EVIDENCE', weight: -15, detail: 'A currently live observed pool references this contract.' }) }

  score = Math.max(0, Math.min(100, Math.round(score)))
  const evidenceComplete = ageDays !== null && inactiveForDays !== null
  const status = !evidenceComplete ? 'unknown' : ageDays < minAgeDays ? 'too-new' : score >= 70 ? 'dormant-candidate' : score >= 45 ? 'watch' : 'active-evidence'
  return {
    score,
    status,
    confidence: evidenceComplete ? (observedCallCount >= 5 ? 'high' : 'medium') : 'low',
    ageDays: ageDays === null ? null : Number(ageDays.toFixed(2)),
    inactiveForDays: inactiveForDays === null ? null : Number(inactiveForDays.toFixed(2)),
    observedCallCount,
    nativeBalanceWei: balanceWei.toString(),
    signals,
    limitation: 'Dormancy is an evidence-based heuristic. It does not establish abandonment, ownership, recoverability, legal status, lost keys or permission to take control of assets or governance.'
  }
}
