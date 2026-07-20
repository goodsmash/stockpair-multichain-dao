/**
 * Read-only launch-source adapter template.
 *
 * Security requirements:
 * - Pin chain ID, source address and runtime hash in configuration.
 * - Decode only reviewed event signatures.
 * - Preserve block hash, transaction hash, log index and finality state.
 * - Emit normalized evidence; do not return an executable transaction.
 * - Rewind orphaned records after reorg detection.
 */
export function createSourceAdapter(config) {
  if (!Number.isSafeInteger(config.chainId) || config.chainId < 1) throw new Error('chainId required')
  if (!/^0x[0-9a-fA-F]{40}$/.test(config.address)) throw new Error('canonical source address required')
  if (!/^0x[0-9a-fA-F]{64}$/.test(config.runtimeHash)) throw new Error('reviewed runtime hash required')

  return Object.freeze({
    id: config.id,
    chainId: config.chainId,
    address: config.address.toLowerCase(),
    runtimeHash: config.runtimeHash.toLowerCase(),
    async verifySource(client) {
      const code = await client.getCode({ address: config.address })
      // Compute and compare keccak256(code) in the concrete adapter.
      if (!code || code === '0x') throw new Error('source has no runtime code')
      return { verified: true, evidence: ['runtime code present; concrete adapter must compare hash'] }
    },
    decodeLog(log) {
      // Decode only the reviewed event set. Return null for unknown logs.
      void log
      return null
    },
    normalize(decoded, context) {
      // Return a normalized, read-only launch observation with canonical evidence.
      return {
        sourceId: config.id,
        chainId: config.chainId,
        provisional: context.confirmations < context.requiredConfirmations,
        evidence: {
          blockNumber: context.blockNumber,
          blockHash: context.blockHash,
          transactionHash: context.transactionHash,
          logIndex: context.logIndex
        },
        decoded
      }
    }
  })
}
