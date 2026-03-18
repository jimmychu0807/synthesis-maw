/**
 * Proof-of-fix: USDC → ETH swap with V3 routing succeeds on-chain.
 *
 * Root cause: Trading API routes USDC→ETH through V4 pools on Sepolia,
 * but V4_SWAP command (0x10) reverts on the Sepolia Universal Router.
 * Fix: pass protocols=["V3"] to force V3 routing.
 *
 * This script:
 * 1. Gets a V3-only quote for USDC → ETH
 * 2. Signs Permit2 data
 * 3. Sends the swap tx with explicit gas
 * 4. Waits for receipt and confirms SUCCESS (not just mined)
 */
import {
  createPublicClient,
  createWalletClient,
  parseUnits,
  formatEther,
  http,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), "../..", ".env") });

const AGENT_KEY = process.env.AGENT_PRIVATE_KEY as `0x${string}`;
const UNISWAP_API_KEY = process.env.UNISWAP_API_KEY as string;
const API_BASE = "https://trade-api.gateway.uniswap.org/v1";

const account = privateKeyToAccount(AGENT_KEY);
const agentAddress = account.address;

const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const NATIVE_ETH = "0x0000000000000000000000000000000000000000";

const chain = sepolia;
const transport = http(
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
);

const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

async function main() {
  console.log("Agent:", agentAddress);
  const ethBefore = await publicClient.getBalance({ address: agentAddress });
  console.log("ETH before:", formatEther(ethBefore));

  // 1. Get V3-only quote
  console.log("\n1. Getting V3-only USDC→ETH quote...");
  const quoteRes = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify({
      tokenInChainId: 11155111,
      tokenOutChainId: 11155111,
      tokenIn: USDC,
      tokenOut: NATIVE_ETH,
      amount: parseUnits("0.50", 6).toString(), // $0.50 USDC
      type: "EXACT_INPUT",
      swapper: agentAddress,
      slippageTolerance: 5,
      protocols: ["V3"], // THE FIX: force V3 routing
    }),
  });

  if (!quoteRes.ok) {
    console.log("FAIL: Quote failed:", quoteRes.status, await quoteRes.text());
    process.exit(1);
  }

  const quote = await quoteRes.json();
  const routeType = quote.quote.route?.[0]?.[0]?.type || "unknown";
  console.log("   Route type:", routeType);
  console.log("   Output:", formatEther(BigInt(quote.quote.output.amount)), "ETH");
  console.log("   Has permitData:", !!quote.permitData);

  if (routeType !== "v3-pool") {
    console.log("WARNING: Expected v3-pool but got", routeType);
  }

  // 2. Sign permit if present
  let signature: Hex | undefined;
  if (quote.permitData) {
    console.log("\n2. Signing Permit2 data...");
    const typedTypes = quote.permitData.types;
    const typeKeys = Object.keys(typedTypes).filter((k: string) => k !== "EIP712Domain");
    const referencedTypes = new Set(
      Object.values(typedTypes)
        .flat()
        .map((f: { type: string }) => f.type)
        .filter((t: string) => typeKeys.includes(t)),
    );
    const primaryType = typeKeys.find((k: string) => !referencedTypes.has(k));

    signature = await walletClient.signTypedData({
      account,
      domain: quote.permitData.domain,
      types: typedTypes,
      primaryType: primaryType!,
      message: quote.permitData.values,
    });
    console.log("   Signed:", signature.slice(0, 20) + "...");
  } else {
    console.log("\n2. No permitData (already approved)");
  }

  // 3. Create swap
  console.log("\n3. Creating swap...");
  const swapRes = await fetch(`${API_BASE}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify({
      quote: quote.quote,
      ...(quote.permitData ? { permitData: quote.permitData, signature } : {}),
      simulateTransaction: false,
    }),
  });

  if (!swapRes.ok) {
    console.log("FAIL: Swap creation failed:", swapRes.status, await swapRes.text());
    process.exit(1);
  }

  const swap = await swapRes.json();
  console.log("   Swap to:", swap.swap.to);
  console.log("   Swap value:", swap.swap.value || "0");

  // 4. Send transaction
  console.log("\n4. Sending transaction (gas: 500k)...");
  const txHash = await walletClient.sendTransaction({
    to: swap.swap.to as Address,
    data: swap.swap.data as Hex,
    value: BigInt(swap.swap.value || "0"),
    chain,
    account,
    gas: 500_000n,
  });
  console.log("   Tx hash:", txHash);

  // 5. Wait for receipt
  console.log("\n5. Waiting for receipt...");
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("   Status:", receipt.status);
  console.log("   Gas used:", receipt.gasUsed.toString());
  console.log("   Block:", receipt.blockNumber.toString());

  const ethAfter = await publicClient.getBalance({ address: agentAddress });
  console.log("\n   ETH before:", formatEther(ethBefore));
  console.log("   ETH after: ", formatEther(ethAfter));

  if (receipt.status === "success") {
    console.log("\n=== PROOF OF FIX: USDC→ETH swap SUCCEEDED on-chain with V3 routing ===");
    process.exit(0);
  } else {
    console.log("\n=== SWAP REVERTED ON-CHAIN — further investigation needed ===");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Script failed:", e);
  process.exit(1);
});
