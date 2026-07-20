# Robinhood cross-chain messaging and canonical bridge

## L1 to L2

Use the Arbitrum SDK and the reviewed custom-network registration. A retryable ticket is submitted through the Delayed Inbox. Estimate gas immediately before signing. Monitor the child execution and retain a manual redemption path for failed L2 execution within the ticket lifetime.

When an Ethereum contract sends the message, the L2 `msg.sender` is the aliased L1 address. Access control must compare against the SDK-derived aliased sender rather than the original address.

## L2 to L1

Initiate through the ArbSys precompile (`0x0000000000000000000000000000000000000064`), then wait for the challenge period and execute the message through the L1 Outbox. L2 initiation is not completion. The v0.8 plan reports the workflow as unsigned and user-signature-required.

## Asset bridging

Canonical deposits normally complete after the retryable is executed. Canonical withdrawals require the challenge period plus a separate L1 claim. L1 and L2 token addresses differ; resolve them through the reviewed gateway routers. Third-party fast bridges are outside the canonical plan and carry separate liquidity and trust assumptions.

## Agent rule

An agent may prepare and explain a plan. It must not estimate once and reuse stale retryable parameters, hide aliasing, call initiation “complete,” or retain a signer. Exact messages must be simulated on both parent and child providers where possible.
