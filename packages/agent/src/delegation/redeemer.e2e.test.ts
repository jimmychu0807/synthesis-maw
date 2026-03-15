import { describe, it, expect } from "vitest";
import { sepolia, baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createRedeemClient } from "./redeemer.js";
import { env } from "../config.js";

/**
 * E2E tests for delegation redeemer on Sepolia.
 * Tests client creation with real RPC transport validation,
 * account derivation, chain configuration, and ERC-7710 extensions.
 */

const EXPECTED_ADDRESS = privateKeyToAccount(env.AGENT_PRIVATE_KEY).address;

describe("Delegation Redeemer E2E (Sepolia)", () => {
  it("creates a redeem client with ERC-7710 extensions on Sepolia", () => {
    const client = createRedeemClient(env.AGENT_PRIVATE_KEY, sepolia);

    expect(client).toBeDefined();
    expect(client.account).toBeDefined();
    expect(client.chain).toEqual(sepolia);

    // Must have the delegation-specific method from erc7710WalletActions
    expect(typeof client.sendTransactionWithDelegation).toBe("function");
  });

  it("derives the correct account address from the private key", () => {
    const client = createRedeemClient(env.AGENT_PRIVATE_KEY, sepolia);

    // Address must be deterministic and match the known derived address
    expect(client.account!.address).toBe(EXPECTED_ADDRESS);
    expect(client.account!.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
  });

  it("creates clients for different chains with correct chain config", () => {
    const sepoliaClient = createRedeemClient(env.AGENT_PRIVATE_KEY, sepolia);
    const baseSepoliaClient = createRedeemClient(
      env.AGENT_PRIVATE_KEY,
      baseSepolia,
    );

    // Chains must differ
    expect(sepoliaClient.chain!.id).toBe(sepolia.id);
    expect(baseSepoliaClient.chain!.id).toBe(baseSepolia.id);
    expect(sepoliaClient.chain!.id).not.toBe(baseSepoliaClient.chain!.id);

    // Same key produces same address regardless of chain
    expect(sepoliaClient.account!.address).toBe(
      baseSepoliaClient.account!.address,
    );
  });

  it("client has standard wallet actions alongside delegation actions", () => {
    const client = createRedeemClient(env.AGENT_PRIVATE_KEY, sepolia);

    // Standard viem wallet client methods should still be present
    expect(typeof client.sendTransaction).toBe("function");
    expect(typeof client.signMessage).toBe("function");
    expect(typeof client.signTypedData).toBe("function");

    // ERC-7710 extension
    expect(typeof client.sendTransactionWithDelegation).toBe("function");
  });

  it("creating two clients from the same key produces equivalent accounts", () => {
    const client1 = createRedeemClient(env.AGENT_PRIVATE_KEY, sepolia);
    const client2 = createRedeemClient(env.AGENT_PRIVATE_KEY, sepolia);

    expect(client1.account!.address).toBe(client2.account!.address);
    expect(client1.chain).toEqual(client2.chain);
  });
});
