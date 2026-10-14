# Wallet screens and Anvil tests

## Review the design first

On your ordinary development server, open `http://localhost:3000/preview`.

Choose GUEST, EMPTY, CURRENT, OUTBID, REFUNDED, WINNER, or OWNER. For connected states, click MY BIDS at the top right. This shows the same account-panel components used by real sessions, with clearly labeled fixtures. The owner state also previews the refund queue. Payment and administrative actions are disabled in preview.

## Start a disposable local auction

Use Anvil chain 31337. The live app continues to use Base chain 8453 and native USDC; this launcher uses a separate mock token, database, session cookie, pending-payment namespace and Next build directory. It does not reset your existing Anvil chain or write to the shared database.

Terminal 1:

```sh
RUST_LOG=error anvil --silent --chain-id 31337 --port 8545 --block-time 1 --mixed-mining
```

If Anvil already runs elsewhere, set `ANVIL_RPC_URL` for the setup command instead of starting another node. Keep the RPC on localhost. Regular interval mining keeps the test clock current while you interact with the UI.

Terminal 2, in this project:

```sh
npm run anvil:setup
npm run dev:anvil -- --fresh
```

For an existing node on a different port:

```sh
ANVIL_RPC_URL=http://127.0.0.1:8547 npm run anvil:setup
npm run dev:anvil -- --fresh
```

Setup deploys MockUSDC and mints 10,000 mock USDC to each bidder. It prints the token and public account addresses. The app opens at `http://localhost:3102`; a local PostgreSQL-compatible database starts automatically on 127.0.0.1:54329. No PostgreSQL installation, server private key, or live payment credential is needed.

`--fresh` creates a new local database directory without deleting previous test sessions. Stop the local app before launching a new session. Re-run setup if the Anvil node was restarted, because deployed contracts and balances are lost with the node.

## Wallet setup

Use a separate, disposable wallet/browser profile for these public test accounts. Anvil's standard default test mnemonic is:

```text
 test test test test test test test test test test test junk
```

These accounts are publicly known and must never hold real funds. Nothing needs to be imported into the web application's server.

Choose:

- Account 0: owner and receiving/refund wallet.
- Account 1: bidder A.
- Account 2: bidder B.
- Account 3: bidder C.

The app adds/switches to Memory Anvil when connecting. To configure it manually: chain ID 31337, RPC `http://127.0.0.1:8545` (or your chosen local port), currency ETH. Import the mock token address printed by setup with symbol mUSDC and six decimals.

Disconnect the app before switching participants, then CONNECT WALLET and sign in again. Changing the active wallet also invalidates the previous app identity; one wallet's activity must not be shown as another wallet's.

## Manual A → B → C walkthrough

Use the 64GB auction:

1. As A, pay **225 mock USDC**. MY BIDS should show CURRENT BID, no received rewards, and no return pending.
2. Disconnect A. Connect B and pay **255 mock USDC**. A is now OUTBID. Its return is **225 principal + 10 reward − 0.01 test fee = 234.99 mock USDC**.
3. Connect account 0. Open MY BIDS → REFUND QUEUE. Approve SEND REFUND IN WALLET, then verify the transfer. You can instead send the exact amount to the displayed recipient externally and paste the transaction hash. The next bid remains blocked until this return is verified.
4. As A, check MY BIDS: TOTAL RETURNED **234.99**, REWARDS RECEIVED **9.99**. This is received money, not merely a promised reward.
5. Connect C and pay **315 mock USDC**. Owner returns **255 + 20 − 0.01 = 274.99 mock USDC** to B. B's received reward is **19.99**.
6. As owner, open the auction's $ dialog and START 24-HOUR COUNTDOWN. By default, a 24-hour period is represented by **60 test seconds**. The app clearly labels this test mode.
7. Open MY BIDS → OWNER TOOLS → ANVIL: ADVANCE 61 SECONDS. This mines a local block and reconciles the expired auction. With refunds settled, C becomes the winner.
8. Connect C and inspect MY BIDS: WON and the Kingston item in YOU WON. Stagerunner's recorded auction pool is **285 mock USDC**. Network-fee reserves are separate from that pool.

You can also manually CLOSE AUCTION from the owner dialog, without starting a countdown. Closing requires a paid current bid and no outstanding returns/in-flight payment window. Fulfillment/delivery of the won item remains manual.

## Cumulative extension walkthrough

Use a fresh local database. For a less rushed manual test:

```sh
ANVIL_COUNTDOWN_SECONDS=600 npm run dev:anvil -- --fresh
```

- A pays 225; owner starts the clock.
- B pays 255; this first post-start bid establishes baseline **255**, target **2,550**. Verify A's return.
- C pays 315; cumulative total is **570**. Verify B's return.
- A bids again at **1,980**. The cumulative **255 + 315 + 1,980 = 2,550** reaches the target. The existing deadline gains another full test-day period; it is not reset from the current time.
- The next baseline is **2,550**, so the next cumulative target is **25,500**. Used payments are consumed once. Verify C's **869.99** return.

## Automated end-to-end checks

With a fresh local app running, terminal 3:

```sh
npm run test:anvil
```

This uses Anvil's unlocked test accounts to sign in, send A/B/C payments, approve and verify manual returns, check wallet activity, advance the local clock, and verify the winner. It never uses or stores a server private key.

For the extension scenario, stop the test app and start a fresh session, then:

```sh
npm run dev:anvil -- --fresh
# In another terminal:
npm run test:anvil -- --extension
```

The runner refuses remote RPC/application URLs, a non-31337 chain, a non-test app, or an already-started Kingston auction. It never resets a shared database or the chain.
