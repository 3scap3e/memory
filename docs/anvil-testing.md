# Database and auction testing

Memory, Parley and DevRel use the same configured `DATABASE_URL` and matching Prisma models. The ordinary `npm run dev` commands do not create databases.

Use `npm run db:studio` so Prisma Studio loads the same `.env.local` configuration as the local app. Memory auction models are present in all three apps’ schemas. Run pending migrations explicitly against the intended shared database; never run reset or db push.

## Historical test records

Earlier Memory Anvil tests were stored in `.anvil/databases/session-*`; earlier Parley sandbox tests were stored in Parley’s `.sandbox/database`. These archives have been preserved and were not automatically copied into the shared database. Anvil blockchain transactions and balances are separate from database records.

## Anvil network

The Anvil launcher now inherits the configured `DATABASE_URL`. It does not create a database, rewrite the connection, run migrations, or accept `--fresh`. Mock bidding is disabled by default. Do not run mock auctions against tables serving active Base bids.

For the deployed auctions and local owner tools, use Base network and the shared database through the ordinary development command. Owner tools remain local-only.
