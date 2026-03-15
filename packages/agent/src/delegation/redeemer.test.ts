import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Hex } from "viem";

// --- Mock viem ---
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createWalletClient: vi.fn().mockReturnValue({
      account: { address: "0xAgentAddress" },
      chain: { id: 1, name: "mock" },
      extend: vi.fn().mockReturnValue({
        account: { address: "0xAgentAddress" },
        chain: { id: 1, name: "mock" },
        sendTransactionWithDelegation: vi.fn(),
      }),
    }),
    http: vi.fn().mockReturnValue("http-transport"),
  };
});

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn().mockReturnValue({
    address: "0xAgentAddress",
    type: "local",
  }),
}));

// --- Mock @metamask/smart-accounts-kit/actions ---
vi.mock("@metamask/smart-accounts-kit/actions", () => ({
  erc7710WalletActions: vi.fn().mockReturnValue(() => ({})),
}));

// --- Mock @metamask/smart-accounts-kit ---
vi.mock("@metamask/smart-accounts-kit", () => ({
  redeemDelegations: vi.fn(),
  getSmartAccountsEnvironment: vi.fn(),
}));

// --- Mock @metamask/smart-accounts-kit/utils ---
vi.mock("@metamask/smart-accounts-kit/utils", () => ({
  encodeDelegations: vi.fn(),
  encodePermissionContexts: vi.fn().mockReturnValue(["0xEncodedContext"]),
}));

// --- Mock config ---
vi.mock("../config.js", () => ({
  CONTRACTS: {
    DELEGATION_MANAGER: "0xDefaultDelegationManager",
  },
}));

import { createWalletClient } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";
import { encodePermissionContexts } from "@metamask/smart-accounts-kit/utils";
import {
  createRedeemClient,
  redeemDelegation,
  type RedeemParams,
} from "./redeemer.js";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("createRedeemClient", () => {
  it("creates a wallet client with the correct account and chain", () => {
    const chain = { id: 1, name: "mainnet" } as any;
    createRedeemClient("0xabc123" as `0x${string}`, chain);

    expect(privateKeyToAccount).toHaveBeenCalledWith("0xabc123");
    expect(createWalletClient).toHaveBeenCalledWith(
      expect.objectContaining({
        chain,
        transport: "http-transport",
      }),
    );
  });

  it("extends the wallet client with erc7710WalletActions", () => {
    const chain = { id: 1, name: "mainnet" } as any;
    createRedeemClient("0xabc123" as `0x${string}`, chain);

    expect(erc7710WalletActions).toHaveBeenCalled();
  });

  it("returns the extended client", () => {
    const chain = { id: 1, name: "mainnet" } as any;
    const client = createRedeemClient("0xabc123" as `0x${string}`, chain);

    expect(client).toBeDefined();
  });
});

describe("redeemDelegation", () => {
  const mockDelegation = {
    delegator: "0xDelegator",
    delegate: "0xDelegate",
    authority: "0x0",
    caveats: [],
    salt: 0n,
    signature: "0xSig",
  } as any;

  function makeClient() {
    const sendTransactionWithDelegation = vi.fn().mockResolvedValue("0xTxHash");
    return {
      account: { address: "0xAgentAddress" },
      chain: { id: 1, name: "mock" },
      sendTransactionWithDelegation,
    } as any;
  }

  it("calls encodePermissionContexts with the delegation", async () => {
    const client = makeClient();
    const params: RedeemParams = {
      delegation: mockDelegation,
      call: {
        to: "0xTargetContract" as Hex,
        data: "0xCalldata" as Hex,
        value: 100n,
      },
    };

    await redeemDelegation(client, params);

    expect(encodePermissionContexts).toHaveBeenCalledWith([[mockDelegation]]);
  });

  it("calls sendTransactionWithDelegation with correct params", async () => {
    const client = makeClient();
    const params: RedeemParams = {
      delegation: mockDelegation,
      call: {
        to: "0xTargetContract" as Hex,
        data: "0xCalldata" as Hex,
        value: 100n,
      },
    };

    await redeemDelegation(client, params);

    expect(client.sendTransactionWithDelegation).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "0xTargetContract",
        data: "0xCalldata",
        value: 100n,
        permissionsContext: "0xEncodedContext",
        delegationManager: "0xDefaultDelegationManager",
      }),
    );
  });

  it("uses default data (0x) and value (0n) when not provided", async () => {
    const client = makeClient();
    const params: RedeemParams = {
      delegation: mockDelegation,
      call: {
        to: "0xTargetContract" as Hex,
      },
    };

    await redeemDelegation(client, params);

    expect(client.sendTransactionWithDelegation).toHaveBeenCalledWith(
      expect.objectContaining({
        data: "0x",
        value: 0n,
      }),
    );
  });

  it("uses custom delegationManager when provided", async () => {
    const client = makeClient();
    const params: RedeemParams = {
      delegation: mockDelegation,
      call: {
        to: "0xTargetContract" as Hex,
      },
      delegationManager: "0xCustomDelegationManager" as Hex,
    };

    await redeemDelegation(client, params);

    expect(client.sendTransactionWithDelegation).toHaveBeenCalledWith(
      expect.objectContaining({
        delegationManager: "0xCustomDelegationManager",
      }),
    );
  });

  it("returns the transaction hash", async () => {
    const client = makeClient();
    const params: RedeemParams = {
      delegation: mockDelegation,
      call: {
        to: "0xTargetContract" as Hex,
      },
    };

    const txHash = await redeemDelegation(client, params);
    expect(txHash).toBe("0xTxHash");
  });

  it("propagates errors from sendTransactionWithDelegation", async () => {
    const client = makeClient();
    client.sendTransactionWithDelegation.mockRejectedValueOnce(
      new Error("Transaction reverted"),
    );

    const params: RedeemParams = {
      delegation: mockDelegation,
      call: {
        to: "0xTargetContract" as Hex,
      },
    };

    await expect(redeemDelegation(client, params)).rejects.toThrow(
      "Transaction reverted",
    );
  });

  it("passes chain and account from client", async () => {
    const client = makeClient();
    const params: RedeemParams = {
      delegation: mockDelegation,
      call: {
        to: "0xTargetContract" as Hex,
      },
    };

    await redeemDelegation(client, params);

    expect(client.sendTransactionWithDelegation).toHaveBeenCalledWith(
      expect.objectContaining({
        chain: client.chain,
        account: client.account,
      }),
    );
  });
});
