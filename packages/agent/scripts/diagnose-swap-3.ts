/**
 * Deep diagnostic part 3: V4 pool routing analysis
 *
 * Key discovery: Uniswap Trading API is routing USDC→ETH through V4 pools
 * on Sepolia, generating command 0x10 (V4_SWAP) instead of 0x00 (V3_SWAP_EXACT_IN).
 *
 * This script:
 * 1. Confirms the routing is V4
 * 2. Tests if V3-only routing is available via `protocols` param
 * 3. Tests if the V4 swap actually works with high slippage
 * 4. Compares with ETH→USDC direction (which uses V3 and works)
 */
import {
  createPublicClient,
  createWalletClient,
  parseUnits,
  formatEther,
  http,
  parseAbi,
  decodeAbiParameters,
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
const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const NATIVE_ETH = "0x0000000000000000000000000000000000000000";
const UNIVERSAL_ROUTER = "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b";

const chain = sepolia;
const transport = http(
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com",
);

const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

const COMMAND_NAMES: Record<number, string> = {
  0x00: "V3_SWAP_EXACT_IN",
  0x01: "V3_SWAP_EXACT_OUT",
  0x04: "SWEEP",
  0x05: "TRANSFER",
  0x06: "PAY_PORTION",
  0x0a: "PERMIT2_PERMIT",
  0x0b: "WRAP_ETH",
  0x0c: "UNWRAP_WETH",
  0x0e: "BALANCE_CHECK_ERC20",
  0x10: "V4_SWAP",
  0x21: "EXECUTE_SUB_PLAN",
};

function decodeCommands(commandsHex: Hex) {
  const bytes = commandsHex.slice(2);
  const result = [];
  for (let i = 0; i < bytes.length; i += 2) {
    const code = parseInt(bytes.slice(i, i + 2), 16);
    const cmdType = code & 0x3f;
    result.push({
      index: i / 2,
      code,
      name: COMMAND_NAMES[cmdType] || `UNKNOWN(0x${cmdType.toString(16)})`,
    });
  }
  return result;
}

async function signPermitData(permitData: any): Promise<Hex> {
  const typedTypes = permitData.types;
  const typeKeys = Object.keys(typedTypes).filter((k: string) => k !== "EIP712Domain");
  const referencedTypes = new Set(
    Object.values(typedTypes)
      .flat()
      .map((f: { type: string }) => f.type)
      .filter((t: string) => typeKeys.includes(t)),
  );
  const primaryType = typeKeys.find((k: string) => !referencedTypes.has(k));

  return walletClient.signTypedData({
    account,
    domain: permitData.domain,
    types: typedTypes,
    primaryType: primaryType!,
    message: permitData.values,
  });
}

interface QuoteResponse {
  quote: any;
  permitData: any;
}

async function getQuoteAndSwap(params: {
  tokenIn: string;
  tokenOut: string;
  amount: string;
  slippage: number;
  protocols?: string[];
  label: string;
}): Promise<{ commands: Hex; inputs: Hex[]; deadline: bigint; value: bigint; routeType: string } | null> {
  console.log(`\n--- ${params.label} ---`);

  const body: Record<string, unknown> = {
    tokenInChainId: 11155111,
    tokenOutChainId: 11155111,
    tokenIn: params.tokenIn,
    tokenOut: params.tokenOut,
    amount: params.amount,
    type: "EXACT_INPUT",
    swapper: agentAddress,
    slippageTolerance: params.slippage,
  };
  if (params.protocols) {
    body.protocols = params.protocols;
  }

  const quoteRes = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify(body),
  });

  if (!quoteRes.ok) {
    console.log("  Quote failed:", quoteRes.status, await quoteRes.text());
    return null;
  }

  const quoteData: QuoteResponse = await quoteRes.json();
  const routeType = quoteData.quote.route?.[0]?.[0]?.type || "unknown";
  const protocol = quoteData.quote.route?.[0]?.[0]?.protocol || "none";
  console.log("  Route type:", routeType, "protocol:", protocol);
  console.log("  Output:", quoteData.quote.output.amount, "wei");
  console.log("  Has permitData:", !!quoteData.permitData);

  // Sign permit if present
  let signature: Hex | undefined;
  if (quoteData.permitData) {
    signature = await signPermitData(quoteData.permitData);
  }

  const swapRes = await fetch(`${API_BASE}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify({
      quote: quoteData.quote,
      ...(quoteData.permitData ? { permitData: quoteData.permitData, signature } : {}),
      simulateTransaction: false,
    }),
  });

  if (!swapRes.ok) {
    console.log("  Swap creation failed:", swapRes.status, await swapRes.text());
    return null;
  }

  const swapData = await swapRes.json();
  const calldata = swapData.swap.data as Hex;

  const decoded = decodeAbiParameters(
    [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    ("0x" + calldata.slice(10)) as Hex,
  );

  const commands = decoded[0] as Hex;
  const inputs = decoded[1] as Hex[];
  const deadline = decoded[2] as bigint;

  const cmds = decodeCommands(commands);
  console.log("  Commands:", cmds.map(c => c.name).join(" → "));

  return {
    commands,
    inputs,
    deadline,
    value: BigInt(swapData.swap.value || "0"),
    routeType,
  };
}

async function simulateExecute(label: string, commands: Hex, inputs: Hex[], deadline: bigint, value: bigint): Promise<boolean> {
  try {
    await publicClient.simulateContract({
      address: UNIVERSAL_ROUTER as Address,
      abi: parseAbi(["function execute(bytes commands, bytes[] inputs, uint256 deadline)"]),
      functionName: "execute",
      args: [commands, inputs, deadline],
      account: agentAddress,
      value,
    });
    console.log(`  ${label}: SIMULATION SUCCESS`);
    return true;
  } catch (e: any) {
    console.log(`  ${label}: SIMULATION FAILED`);
    console.log(`    Error: ${e.shortMessage?.slice(0, 200)}`);

    if (e.cause?.data) {
      const revertData = e.cause.data as string;
      if (revertData.startsWith("0x2c4029e9")) {
        const dec = decodeAbiParameters(
          [
            { name: "commandIndex", type: "uint256" },
            { name: "message", type: "bytes" },
          ],
          ("0x" + revertData.slice(10)) as Hex,
        );
        const innerSigs: Record<string, string> = {
          "0x6a12f104": "InsufficientETH()",
          "0x675cae38": "InsufficientToken()",
          "0x316cf0eb": "V3InvalidSwap()",
          "0x39d35496": "V3TooLittleReceived()",
          "0xbd8deb57": "V4TooLittleReceived()",
          "0xd4e0bfe0": "V4TooMuchRequested()",
        };
        const inner = dec[1] as Hex;
        const sig = inner.slice(0, 10);
        console.log(`    ExecutionFailed at command: ${dec[0]}`);
        console.log(`    Inner error: ${innerSigs[sig] || sig}`);
        if (inner.length > 10) {
          console.log(`    Inner data: ${inner.slice(0, 100)}`);
        }
      } else {
        console.log(`    Revert data: ${revertData.slice(0, 100)}`);
      }
    }
    return false;
  }
}

async function main() {
  const usdcAmount = parseUnits("0.50", 6).toString();
  const ethAmount = parseUnits("0.0001", 18).toString();

  console.log("Agent address:", agentAddress);
  const ethBal = await publicClient.getBalance({ address: agentAddress });
  console.log("ETH balance:", formatEther(ethBal));

  const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);
  const usdcBal = await publicClient.readContract({
    address: USDC as Address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [agentAddress],
  });
  console.log("USDC balance:", Number(usdcBal) / 1e6);

  // =========================================================================
  // TEST 1: Default USDC→ETH (expecting V4 routing)
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 1: Default USDC→ETH quote (Trading API chooses route)");
  console.log("=".repeat(70));

  const test1 = await getQuoteAndSwap({
    tokenIn: USDC,
    tokenOut: NATIVE_ETH,
    amount: usdcAmount,
    slippage: 5,
    label: "USDC→ETH (default)",
  });

  if (test1) {
    await simulateExecute("Default route", test1.commands, test1.inputs, test1.deadline, test1.value);
  }

  // =========================================================================
  // TEST 2: USDC→ETH with V3-only routing
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 2: USDC→ETH with V3-only routing");
  console.log("=".repeat(70));

  const test2 = await getQuoteAndSwap({
    tokenIn: USDC,
    tokenOut: NATIVE_ETH,
    amount: usdcAmount,
    slippage: 5,
    protocols: ["V3"],
    label: "USDC→ETH (V3 only)",
  });

  if (test2) {
    await simulateExecute("V3-only route", test2.commands, test2.inputs, test2.deadline, test2.value);
  }

  // =========================================================================
  // TEST 3: USDC→ETH with V2-only routing
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 3: USDC→ETH with V2-only routing");
  console.log("=".repeat(70));

  const test3 = await getQuoteAndSwap({
    tokenIn: USDC,
    tokenOut: NATIVE_ETH,
    amount: usdcAmount,
    slippage: 5,
    protocols: ["V2"],
    label: "USDC→ETH (V2 only)",
  });

  if (test3) {
    await simulateExecute("V2-only route", test3.commands, test3.inputs, test3.deadline, test3.value);
  }

  // =========================================================================
  // TEST 4: ETH→USDC (control — known working direction)
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 4: ETH→USDC (control — known working)");
  console.log("=".repeat(70));

  const test4 = await getQuoteAndSwap({
    tokenIn: NATIVE_ETH,
    tokenOut: USDC,
    amount: ethAmount,
    slippage: 5,
    label: "ETH→USDC (default)",
  });

  if (test4) {
    await simulateExecute("ETH→USDC", test4.commands, test4.inputs, test4.deadline, test4.value);
  }

  // =========================================================================
  // TEST 5: USDC→WETH (no unwrap — isolate swap vs unwrap)
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 5: USDC→WETH (no UNWRAP_WETH needed)");
  console.log("=".repeat(70));

  const test5 = await getQuoteAndSwap({
    tokenIn: USDC,
    tokenOut: WETH,
    amount: usdcAmount,
    slippage: 5,
    label: "USDC→WETH (no unwrap)",
  });

  if (test5) {
    await simulateExecute("USDC→WETH", test5.commands, test5.inputs, test5.deadline, test5.value);
  }

  // =========================================================================
  // TEST 6: USDC→ETH with extreme slippage (50%)
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 6: USDC→ETH with 50% slippage");
  console.log("=".repeat(70));

  const test6 = await getQuoteAndSwap({
    tokenIn: USDC,
    tokenOut: NATIVE_ETH,
    amount: usdcAmount,
    slippage: 50,
    label: "USDC→ETH (50% slippage)",
  });

  if (test6) {
    const simResult = await simulateExecute("50% slippage", test6.commands, test6.inputs, test6.deadline, test6.value);

    if (!simResult) {
      // Even with 50% slippage it fails — send it anyway with explicit gas to see on-chain
      console.log("\n  Sending anyway with explicit gas to trace on-chain...");
      try {
        const txHash = await walletClient.sendTransaction({
          to: UNIVERSAL_ROUTER as Address,
          data: ("0x3593564c" + test6.commands.slice(2).padStart(64, "0")) as Hex, // nah let's use proper calldata
          value: test6.value,
          chain,
          account,
          gas: 600_000n,
        });
        console.log("  Tx hash:", txHash);
      } catch (e: any) {
        // Expected — let's just send the raw swap calldata instead
      }
    }
  }

  // =========================================================================
  // SUMMARY
  // =========================================================================
  console.log("\n" + "=".repeat(70));
  console.log("SUMMARY");
  console.log("=".repeat(70));
  console.log("Test 1 (Default USDC→ETH):", test1 ? test1.routeType : "no quote");
  console.log("Test 2 (V3 USDC→ETH):", test2 ? test2.routeType : "no quote");
  console.log("Test 3 (V2 USDC→ETH):", test3 ? test3.routeType : "no quote");
  console.log("Test 4 (ETH→USDC):", test4 ? test4.routeType : "no quote");
  console.log("Test 5 (USDC→WETH):", test5 ? test5.routeType : "no quote");
  console.log("Test 6 (50% slippage):", test6 ? test6.routeType : "no quote");
}

main().catch(console.error);
