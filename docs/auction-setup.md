# Memory Wars auction setup

## Rules

- Three separate auctions: `kingston-64`, `corsair-128`, `suprim-4090`.
- Wallet-signature login only. Base mainnet (chain 8453), native USDC only.
- Opening minimums: 225 USDC for Kingston, 375 USDC for Corsair, 1,025 USDC for Suprim. Every following bid must increase by at least 25 USDC.
- An outbid wallet receives its whole bid plus floor(increase / 3) in USDC's six-decimal units, minus the quoted outgoing fee. That fee is at most 0.05 USDC and cannot reduce principal.
- Fees are estimated with a buffer and disclosed before payment; they are quoted service fees covering gas, not a promise to deduct the exact eventual receipt cost. They stay outside Stagerunner's auction allocation. The owner’s treasury wallet must hold ETH to approve manual transfers.
- The owner decides when discovery conditions are met and manually starts each 24-hour countdown. No price/customer/bidder thresholds are encoded or exposed through the public API. Conditions do not prevent ordinary bidding before a countdown.
- The latest accepted bid when the owner starts the countdown sets the initial extension baseline. Sum full accepted bid amounts, not increases, in the latest 24 hours of the current extension cycle. At 10× the baseline, add 24 hours to the existing deadline. The reached target becomes the next baseline; consume the cycle's payments once. One accepted payment can earn at most one extension; excess is not carried forward.
- Example: baseline 150, cumulative target 1,500; after extension, baseline 1,500 and cumulative target 15,000.
- Bids paid before the owner starts the countdown do not count toward an extension.
- Before the first confirmed payment, the UI says STARTING MIN. Afterward, it says CURRENT BID. The public panel shows discovery copy rather than condition counters.

## Configuration

Copy the names from `.env.example` into your environment. Point `DATABASE_URL` at the same PostgreSQL database used by Parley/Run/Dev; keep its credentials private. The migration adds only `Memory*` tables and does not alter existing application tables. The three Prisma schemas now include the same Memory, Parley and DevRel models. Use `npm run db:studio` to load `.env.local` explicitly. Run `npm run db:migrate`; never run reset/db push on the shared database.

Owner tools are local-only: their source lives in ignored `.local/owner/`, and `npm run dev` loads their API routes. Production builds remove those routes and deny administrative access, even if an owner allowlist is accidentally configured. Keep a private backup of `.local/owner/`; a fresh Git clone does not contain it. Set `AUCTION_ADMIN_WALLETS` in your ignored `.env.local` to the owner's wallet address (or a comma-separated allowlist). Log in with that wallet, open the bidding dialog, and use OWNER CONTROLS to start the countdown or close the auction. A paid current bid is required. Manual closing waits for in-flight payments and outstanding refunds; it records the current paid bidder as the winner. Starting a countdown again cannot reset an existing clock. Owner actions are recorded in `MemoryAuctionAction`.

The owner assesses the discovery conditions manually, including replayers on Parley Dev and Parley Run. The auction no longer queries customer totals or requires a closing-target JSON configuration to accept bids. The shared database can still be used for the other apps without modifying their tables.

Set `BASE_TREASURY_ADDRESS` to the public receiving wallet. The same wallet can be on `AUCTION_ADMIN_WALLETS`. No server private key is required or used. Refunds use one SEND REFUND + REWARD action in ACCOUNT / ACTIVITY → MEMORY → OWNER TOOLS → REFUND QUEUE. Approve the combined transfer in the treasury wallet; confirmation retries automatically. The app verifies the native USDC transfer's sender, recipient, exact amount, success and confirmations before recording payment. Re-verifying a paid transfer does not count it twice. An outstanding refund blocks further bids on that auction until verified.

The owner can edit a starting minimum from the auction dialog before its first accepted payment, provided no quote is in flight. After the first bid, the next minimum follows that bid plus 25 USDC.

Configure WalletConnect's public project ID for mobile/QR login. Injected wallets and wallet-browser login work without it. The session cookie is HttpOnly, its database token is hashed, and SIWE nonce consumption is atomic.

The owner can use ACCOUNT / ACTIVITY → MEMORY → OWNER TOOLS → CHECK PAYMENTS & CLOCKS to reconcile submitted bid/refund transactions and close expired countdowns. Run this from the local owner session connected to the production database and Base RPC. No live scheduler or `CRON_SECRET` is needed. An expired auction finalizes when the owner runs the local check; new bidding is already paused at its deadline.

Only set `AUCTIONS_ENABLED=true` after the database, owner wallet allowlist, treasury, mobile wallet configuration, and a manual/scheduled reconciliation plan are ready. Bids stop being quoted in the final 90 seconds to leave room for confirmation; in-flight quote reservations include an additional confirmation window.

## Exceptional payments

A stale/late payment is never promoted to a bid. Its whole principal is recorded as a refund obligation with a pending refund obligation; it earns no reward. The operator sponsors its gas, sends the full principal, and verifies its transaction in the refund queue. This exceptional workflow is intentionally excluded from automatic reward-fee deductions. Unsettled refund obligations block further bids/closing on that auction.

## Verification

`npm test` covers accounting, cumulative extension thresholds, expiry, fee caps, PostgreSQL migrations, shared customer counts, duplicate payments/refunds, and transaction rollback. `npm run build -- --webpack` verifies the application. No live transfer is made by these checks.

Real provider/wallet/treasury end-to-end verification still requires configured infrastructure; do not interpret a successful local build as proof of live refund delivery.

## Design previews and local testing

In development, visit `/preview` for guest, empty account, current bid, outbid/pending refund, verified return, winner, and owner screens. These fixtures cannot create bids, sign payments, or exercise owner actions. The real top-right wallet controls use signed wallet sessions, and ACCOUNT / ACTIVITY → MEMORY shows returns for that wallet—not the new bidder who triggered them.

See [Anvil walkthrough](anvil-testing.md) for mock-token deployment, isolated PostgreSQL, A/B/C payments, and shortened countdowns.
