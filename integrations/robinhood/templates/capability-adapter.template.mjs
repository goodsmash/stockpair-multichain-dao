/**
 * Robinhood-native read-only capability adapter template.
 * Do not add a signer, private key, approval, sponsorship secret, or broadcast method.
 */
export function createCapabilityAdapter({ client, registry, config }) {
  if (!client || !registry || !config) throw new Error('client, registry and config are required')
  return Object.freeze({
    descriptor() {
      return {
        id: 'replace-with-stable-id',
        version: '1.0.0',
        readOnly: true,
        unsigned: true,
        userSignatureRequiredForExecution: true,
        sourceAuthority: 'official Robinhood or upstream protocol documentation',
        reviewedAt: 'YYYY-MM-DD'
      }
    },
    async inspect(input = {}) {
      // 1. Runtime-validate bounded input.
      // 2. Read direct-chain evidence through the injected client.
      // 3. Preserve source addresses, blocks and timestamps.
      // 4. Return blockers when any required evidence is missing.
      // 5. Never return an execution authorization.
      return { input, eligibleForReview: false, blockers: ['adapter is a template'] }
    }
  })
}
