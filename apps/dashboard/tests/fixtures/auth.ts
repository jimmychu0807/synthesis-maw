/**
 * Playwright auth fixture. Generates a test wallet, authenticates against
 * the real agent server, and injects the session token so the dashboard
 * starts in an authenticated state with the mock wagmi connector.
 *
 * Usage:
 *   import { test, expect } from "../fixtures/auth";
 *
 *   test("something requiring auth", async ({ page, testWallet }) => {
 *     // testWallet.address  — checksummed 0x address
 *     // testWallet.token    — bearer token for API calls
 *     await page.goto("/");
 *     // sessionStorage already has veil_auth_token injected
 *   });
 *
 * @module @veil/dashboard/tests/fixtures/auth
 */
import { test as base, expect } from "@playwright/test";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const AGENT_URL = process.env.AGENT_URL ?? "http://localhost:3147";

interface AuthFixtures {
  /** Pre-authenticated test wallet: address + bearer token */
  testWallet: {
    address: `0x${string}`;
    token: string;
  };
}

export const test = base.extend<AuthFixtures>({
  testWallet: async ({ page }, use) => {
    // Generate a fresh wallet for test isolation
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    // Step 1: Fetch nonce from agent server
    const nonceRes = await fetch(
      `${AGENT_URL}/api/auth/nonce?wallet=${account.address}`,
    );
    if (!nonceRes.ok) {
      const body = await nonceRes.text().catch(() => "");
      throw new Error(
        `Nonce fetch failed: ${nonceRes.status} ${body}`,
      );
    }
    const { nonce } = (await nonceRes.json()) as { nonce: string };

    // Step 2: Sign the nonce message (same format as auth route)
    const message = `Sign this message to authenticate with Veil.\n\nNonce: ${nonce}`;
    const signature = await account.signMessage({ message });

    // Step 3: Verify signature to get bearer token
    const verifyRes = await fetch(`${AGENT_URL}/api/auth/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet: account.address, signature }),
    });
    if (!verifyRes.ok) {
      const body = await verifyRes.text().catch(() => "");
      throw new Error(
        `Auth verify failed: ${verifyRes.status} ${body}`,
      );
    }
    const { token } = (await verifyRes.json()) as { token: string };

    // Step 4: Inject auth token into sessionStorage BEFORE any page navigation.
    // addInitScript runs in every new document context (navigations, reloads)
    // so the dashboard's useAuth hook will find a valid stored token immediately.
    await page.addInitScript(
      ({ wallet, tkn }: { wallet: string; tkn: string }) => {
        sessionStorage.setItem(
          "veil_auth_token",
          JSON.stringify({ wallet: wallet.toLowerCase(), token: tkn }),
        );
      },
      { wallet: account.address, tkn: token },
    );

    await use({ address: account.address, token });
  },
});

export { expect } from "@playwright/test";
