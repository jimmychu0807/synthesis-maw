import {
  createWalletClient,
  http,
  type Chain,
  type WalletClient,
  type Transport,
  type Account,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";
import {
  redeemDelegations,
  getSmartAccountsEnvironment,
  type Delegation,
} from "@metamask/smart-accounts-kit";
import {
  encodeDelegations,
  encodePermissionContexts,
} from "@metamask/smart-accounts-kit/utils";
import { CONTRACTS } from "../config.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A WalletClient extended with sendTransactionWithDelegation */
export type DelegationWalletClient = ReturnType<
  ReturnType<typeof erc7710WalletActions>
> &
  WalletClient;

export interface RedeemParams {
  /** The signed delegation chain (innermost first) */
  delegation: Delegation;
  /** The call to execute under delegation */
  call: {
    to: Hex;
    data?: Hex;
    value?: bigint;
  };
  /** Delegation manager contract address */
  delegationManager?: Hex;
}

// ---------------------------------------------------------------------------
// createRedeemClient — creates a viem WalletClient extended with delegation
// ---------------------------------------------------------------------------

export function createRedeemClient(
  agentPrivateKey: `0x${string}`,
  chain: Chain,
): DelegationWalletClient {
  const account = privateKeyToAccount(agentPrivateKey);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(),
  });

  // Extend with ERC-7710 delegation actions
  const extended = walletClient.extend(erc7710WalletActions());

  return extended as unknown as DelegationWalletClient;
}

// ---------------------------------------------------------------------------
// redeemDelegation — execute a transaction under a signed delegation
// ---------------------------------------------------------------------------

export async function redeemDelegation(
  client: DelegationWalletClient,
  params: RedeemParams,
): Promise<Hex> {
  const delegationManager =
    params.delegationManager ?? (CONTRACTS.DELEGATION_MANAGER as Hex);

  // Encode the delegation chain into a permissions context
  const permissionsContexts = encodePermissionContexts([[params.delegation]]);
  const permissionsContext = permissionsContexts[0]!;

  const txHash = await client.sendTransactionWithDelegation({
    to: params.call.to,
    data: params.call.data ?? "0x",
    value: params.call.value ?? 0n,
    permissionsContext,
    delegationManager,
    chain: client.chain ?? undefined,
    account: client.account!,
  });

  return txHash;
}
