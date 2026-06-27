/**
 * Generate a dedicated Compation agent wallet and store it locally.
 *
 * - Idempotent: refuses to overwrite an existing INJECTIVE_PRIVATE_KEY unless
 *   `--force` (so a funded wallet is never clobbered by accident).
 * - Writes the secret to .env and .wallet-backup.txt (both gitignored, 0600).
 * - Prints ONLY the public addresses — never the private key or mnemonic — so
 *   the secret stays out of logs and terminal history.
 *
 * Run: pnpm --filter @compation/agent wallet:gen [-- --force]
 */
import { PrivateKey } from '@injectivelabs/sdk-ts';
import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { resolve } from 'node:path';
import { REPO_ROOT } from './_shared.js';

const ENV_PATH = resolve(REPO_ROOT, '.env');
const EXAMPLE_PATH = resolve(REPO_ROOT, '.env.example');
const BACKUP_PATH = resolve(REPO_ROOT, '.wallet-backup.txt');
const force = process.argv.includes('--force');

function readBase(): string {
  if (existsSync(ENV_PATH)) return readFileSync(ENV_PATH, 'utf8');
  if (existsSync(EXAMPLE_PATH)) return readFileSync(EXAMPLE_PATH, 'utf8');
  return '';
}

function upsert(content: string, key: string, value: string): string {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(content)) return content.replace(re, line);
  const prefix = content === '' || content.endsWith('\n') ? content : content + '\n';
  return prefix + line + '\n';
}

function existingKey(content: string): string | null {
  const m = content.match(/^INJECTIVE_PRIVATE_KEY=(.*)$/m);
  if (!m) return null;
  // Strip any inline `# comment` (the .env.example template carries them) so a
  // blank-but-commented placeholder doesn't read as a real key.
  const val = m[1]!.replace(/\s+#.*$/, '').trim();
  return val ? val : null;
}

function main(): void {
  let env = readBase();
  if (existingKey(env) && !force) {
    console.error(
      '✋ .env already has INJECTIVE_PRIVATE_KEY. Refusing to overwrite a possibly-funded wallet.\n' +
        '   Re-run with `-- --force` to replace it (this abandons the current wallet).',
    );
    process.exit(1);
  }

  const { privateKey, mnemonic } = PrivateKey.generate();
  const inj = privateKey.toAddress().toAccountAddress();
  const eth = privateKey.toAddress().getEthereumAddress();
  const hex = privateKey.toPrivateKeyHex();

  env = upsert(env, 'INJECTIVE_PRIVATE_KEY', hex);
  env = upsert(env, 'INJECTIVE_WALLET_ADDRESS', inj);
  env = upsert(env, 'INJECTIVE_WALLET_ETH_ADDRESS', eth);
  writeFileSync(ENV_PATH, env, { mode: 0o600 });
  chmodSync(ENV_PATH, 0o600);

  const backup =
    [
      'COMPATION AGENT WALLET — SECRET. Do NOT commit. Back up elsewhere, then delete this file.',
      `created: ${new Date().toISOString()}`,
      `inj_address: ${inj}`,
      `eth_address: ${eth}`,
      `private_key_hex: ${hex}`,
      `mnemonic: ${mnemonic}`,
    ].join('\n') + '\n';
  writeFileSync(BACKUP_PATH, backup, { mode: 0o600 });
  chmodSync(BACKUP_PATH, 0o600);

  console.log('✅ New Compation agent wallet generated (secret NOT printed).');
  console.log(`   inj: ${inj}`);
  console.log(`   eth: ${eth}`);
  console.log('   key + mnemonic saved to .env and .wallet-backup.txt (gitignored, 0600).');
  console.log('   → Back up .wallet-backup.txt somewhere safe, then delete it.');
  console.log('');
  console.log('   FUND TESTNET: paste the inj address at https://testnet.faucet.injective.network/');
  console.log('   Then check: pnpm --filter @compation/agent wallet:status');
}

main();
