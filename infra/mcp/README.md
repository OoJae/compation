# Injective MCP Server (execution path: `EXECUTOR=mcp`)

Compation can execute via the **Injective MCP Server** as an alternative to the
in-process `sdk-ts` path. The server is cloned from source (it is **not** an npm
package) and is **gitignored** under `infra/mcp/server/`.

## Rebuild

```bash
cd infra/mcp
git clone --depth 1 https://github.com/InjectiveLabs/mcp-server.git server
cd server && npm install && npm run build
```

## Run / connect (stdio)

Entry point: `infra/mcp/server/dist/mcp/server.js`. Configure with:

```jsonc
{
  "command": "node",
  "args": ["<repo>/infra/mcp/server/dist/mcp/server.js"],
  "env": { "INJECTIVE_NETWORK": "mainnet" }   // or "testnet"
}
```

- **~37 tools**: `market_list`, `market_price`, `account_balances`,
  `account_positions`, `trade_open`/`trade_close` (+ EIP-712 variants),
  `trade_limit_*`, `subaccount_deposit`/`withdraw`, `transfer_send`, bridging,
  `evm_broadcast`, CCTP/USDC, RFQ, frontend guidance.
- **Keys**: AES-256-GCM + scrypt at rest in `~/.injective-agent/keys/` (0600).
  The model sees only addresses + tx hashes — never raw keys.
- Note: `market_price` takes a symbol (e.g. `"NVDA"`, `"INJ"`, `"H100"`).

For Compation the **default execution path is `sdk`** (deterministic, in-process);
the MCP path is the flag-selectable sponsor-narrative integration.
