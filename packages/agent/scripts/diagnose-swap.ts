/**
 * Deep diagnostic script for USDC → ETH swap on Sepolia.
 * Traces every byte from Trading API response through Universal Router execution.
 */
import {
  createPublicClient,
  createWalletClient,
  parseUnits,
  formatUnits,
  http,
  parseAbi,
  decodeAbiParameters,
  type Hex,
  type Address,
  keccak256,
  toBytes,
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

const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const NATIVE_ETH = "0x0000000000000000000000000000000000000000";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const UNIVERSAL_ROUTER = "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b";

const chain = sepolia;
const transport = http(process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com");

const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

// Universal Router command constants
const COMMAND_NAMES: Record<number, string> = {
  0x00: "V3_SWAP_EXACT_IN",
  0x01: "V3_SWAP_EXACT_OUT",
  0x02: "PERMIT2_TRANSFER_FROM",
  0x03: "PERMIT2_PERMIT_BATCH",
  0x04: "SWEEP",
  0x05: "TRANSFER",
  0x06: "PAY_PORTION",
  0x08: "V2_SWAP_EXACT_IN",
  0x09: "V2_SWAP_EXACT_OUT",
  0x0a: "PERMIT2_PERMIT",
  0x0b: "WRAP_ETH",
  0x0c: "UNWRAP_WETH",
  0x10: "V3_SWAP_EXACT_IN (0x10)",
};

function decodeUniversalRouterExecute(data: Hex) {
  // execute(bytes commands, bytes[] inputs, uint256 deadline)
  // selector: 0x3593564c
  const selector = data.slice(0, 10);
  if (selector !== "0x3593564c") {
    console.log("  Unknown selector:", selector);
    return;
  }

  // Decode the params
  const params = decodeAbiParameters(
    [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    ("0x" + data.slice(10)) as Hex,
  );

  const commands = params[0] as Hex;
  const inputs = params[1] as Hex[];
  const deadline = params[2] as bigint;

  console.log("\n=== UNIVERSAL ROUTER EXECUTE ===");
  console.log("Deadline:", deadline.toString(), `(${new Date(Number(deadline) * 1000).toISOString()})`);
  console.log("Current time:", Math.floor(Date.now() / 1000));
  console.log("Time until deadline:", Number(deadline) - Math.floor(Date.now() / 1000), "seconds");

  // Parse commands (each byte is a command)
  const commandBytes = commands.slice(2); // remove 0x
  console.log("\nCommands:", commands, `(${commandBytes.length / 2} commands)`);

  for (let i = 0; i < commandBytes.length; i += 2) {
    const cmdByte = parseInt(commandBytes.slice(i, i + 2), 16);
    const cmdName = COMMAND_NAMES[cmdByte] || `UNKNOWN(0x${cmdByte.toString(16)})`;
    console.log(`\n--- Command ${i / 2}: ${cmdName} (0x${cmdByte.toString(16).padStart(2, "0")}) ---`);

    const input = inputs[i / 2];
    if (!input) {
      console.log("  No input data");
      continue;
    }

    try {
      switch (cmdByte) {
        case 0x0a: { // PERMIT2_PERMIT
          // (IAllowanceTransfer.PermitSingle permitSingle, bytes signature)
          console.log("  Input length:", input.length);
          console.log("  (Permit2 permit data - opaque)");
          break;
        }
        case 0x00:
        case 0x10: { // V3_SWAP_EXACT_IN
          // (address recipient, uint256 amountIn, uint256 amountOutMinimum, bytes path, bool payerIsUser)
          const swapParams = decodeAbiParameters(
            [
              { name: "recipient", type: "address" },
              { name: "amountIn", type: "uint256" },
              { name: "amountOutMinimum", type: "uint256" },
              { name: "path", type: "bytes" },
              { name: "payerIsUser", type: "bool" },
            ],
            input,
          );
          console.log("  recipient:", swapParams[0]);
          console.log("  amountIn:", swapParams[1].toString());
          console.log("  amountOutMinimum:", swapParams[2].toString());
          console.log("  path:", swapParams[3]);
          console.log("  payerIsUser:", swapParams[4]);

          // Decode V3 path: tokenIn (20 bytes) + fee (3 bytes) + tokenOut (20 bytes)
          const pathHex = (swapParams[3] as Hex).slice(2);
          if (pathHex.length >= 86) { // 20 + 3 + 20 = 43 bytes = 86 hex chars
            const tokenIn = "0x" + pathHex.slice(0, 40);
            const fee = parseInt(pathHex.slice(40, 46), 16);
            const tokenOut = "0x" + pathHex.slice(46, 86);
            console.log(`  Path: ${tokenIn} --[${fee / 10000}%]--> ${tokenOut}`);

            // Check if tokens match expected
            if (tokenIn.toLowerCase() === USDC.toLowerCase()) console.log("    tokenIn = USDC");
            if (tokenIn.toLowerCase() === WETH.toLowerCase()) console.log("    tokenIn = WETH");
            if (tokenOut.toLowerCase() === USDC.toLowerCase()) console.log("    tokenOut = USDC");
            if (tokenOut.toLowerCase() === WETH.toLowerCase()) console.log("    tokenOut = WETH");

            // Is recipient the router itself (for UNWRAP_WETH)?
            const recipientAddr = swapParams[0] as string;
            if (recipientAddr === "0x0000000000000000000000000000000000000002") {
              console.log("  recipient = MSG_SENDER (0x02 = the Universal Router itself, for chaining)");
            } else if (recipientAddr === "0x0000000000000000000000000000000000000001") {
              console.log("  recipient = ADDRESS_THIS (0x01 = the Universal Router)");
            } else {
              console.log("  recipient = external address");
            }
          }
          break;
        }
        case 0x0c: { // UNWRAP_WETH
          // (address recipient, uint256 amountMinimum)
          const unwrapParams = decodeAbiParameters(
            [
              { name: "recipient", type: "address" },
              { name: "amountMinimum", type: "uint256" },
            ],
            input,
          );
          console.log("  recipient:", unwrapParams[0]);
          console.log("  amountMinimum:", unwrapParams[1].toString());

          // Check: is amountMinimum reasonable?
          console.log("  amountMinimum in ETH:", formatUnits(unwrapParams[1] as bigint, 18));
          break;
        }
        case 0x0b: { // WRAP_ETH
          const wrapParams = decodeAbiParameters(
            [
              { name: "recipient", type: "address" },
              { name: "amountMinimum", type: "uint256" },
            ],
            input,
          );
          console.log("  recipient:", wrapParams[0]);
          console.log("  amountMinimum:", wrapParams[1].toString());
          break;
        }
        case 0x04: { // SWEEP
          const sweepParams = decodeAbiParameters(
            [
              { name: "token", type: "address" },
              { name: "recipient", type: "address" },
              { name: "amountMinimum", type: "uint256" },
            ],
            input,
          );
          console.log("  token:", sweepParams[0]);
          console.log("  recipient:", sweepParams[1]);
          console.log("  amountMinimum:", sweepParams[2].toString());
          break;
        }
        default:
          console.log("  Input:", input.slice(0, 100) + "...");
      }
    } catch (e) {
      console.log("  Failed to decode input:", (e as Error).message?.slice(0, 100));
      console.log("  Raw input:", input.slice(0, 200) + "...");
    }
  }
}

async function checkPrerequisites() {
  console.log("=== PREREQUISITES ===");
  console.log("Agent address:", agentAddress);

  const ethBal = await publicClient.getBalance({ address: agentAddress });
  console.log("ETH balance:", formatUnits(ethBal, 18));

  const erc20Abi = parseAbi(["function balanceOf(address) view returns (uint256)"]);
  const usdcBal = await publicClient.readContract({
    address: USDC as Address,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [agentAddress],
  });
  console.log("USDC balance:", formatUnits(usdcBal, 6));

  // Check Permit2 allowance for USDC
  const allowanceAbi = parseAbi([
    "function allowance(address owner, address spender) view returns (uint256)",
  ]);
  const permit2Allowance = await publicClient.readContract({
    address: USDC as Address,
    abi: allowanceAbi,
    functionName: "allowance",
    args: [agentAddress, PERMIT2 as Address],
  });
  console.log("USDC Permit2 allowance:", permit2Allowance.toString());
  if (permit2Allowance === 0n) {
    console.log("  WARNING: No Permit2 allowance for USDC. Need to approve first.");
  }

  // Check Permit2 allowance for the Universal Router
  const permit2AllowanceAbi = parseAbi([
    "function allowance(address owner, address token, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  ]);
  try {
    const [amount, expiration, nonce] = await publicClient.readContract({
      address: PERMIT2 as Address,
      abi: permit2AllowanceAbi,
      functionName: "allowance",
      args: [agentAddress, USDC as Address, UNIVERSAL_ROUTER as Address],
    });
    console.log("Permit2 -> Router allowance:", amount.toString());
    console.log("Permit2 -> Router expiration:", expiration.toString(), expiration > 0 ? `(${new Date(Number(expiration) * 1000).toISOString()})` : "");
    console.log("Permit2 -> Router nonce:", nonce.toString());
  } catch (e) {
    console.log("Could not read Permit2 allowance:", (e as Error).message?.slice(0, 100));
  }
}

async function getQuoteAndSwap() {
  console.log("\n=== QUOTE ===");
  const quoteBody = {
    tokenInChainId: 11155111,
    tokenOutChainId: 11155111,
    tokenIn: USDC,
    tokenOut: NATIVE_ETH,
    amount: parseUnits("0.50", 6).toString(),
    type: "EXACT_INPUT",
    swapper: agentAddress,
    slippageTolerance: 5, // 5%
  };
  console.log("Request:", JSON.stringify(quoteBody, null, 2));

  const quoteRes = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify(quoteBody),
  });

  if (!quoteRes.ok) {
    console.log("Quote failed:", quoteRes.status, await quoteRes.text());
    return null;
  }

  const quote = await quoteRes.json();
  console.log("Routing:", quote.routing);
  console.log("Input:", JSON.stringify(quote.quote.input));
  console.log("Output:", JSON.stringify(quote.quote.output));
  console.log("Has permitData:", !!quote.permitData);

  if (quote.permitData) {
    console.log("\n=== PERMIT DATA ===");
    console.log("Domain:", JSON.stringify(quote.permitData.domain));
    console.log("Values:", JSON.stringify(quote.permitData.values));

    // Check the nonce in the permit
    const permitNonce = quote.permitData.values?.details?.nonce;
    console.log("Permit nonce:", permitNonce);

    // Check deadline
    const sigDeadline = quote.permitData.values?.sigDeadline;
    console.log("Sig deadline:", sigDeadline, sigDeadline ? `(${new Date(Number(sigDeadline) * 1000).toISOString()})` : "");
  }

  // Sign the permit
  console.log("\n=== SIGNING PERMIT ===");
  const typedTypes = quote.permitData.types;
  const typeKeys = Object.keys(typedTypes).filter((k: string) => k !== "EIP712Domain");
  const referencedTypes = new Set(
    Object.values(typedTypes)
      .flat()
      .map((f: { type: string }) => f.type)
      .filter((t: string) => typeKeys.includes(t)),
  );
  const primaryType = typeKeys.find((k: string) => !referencedTypes.has(k));
  console.log("Primary type:", primaryType);

  const sig = await walletClient.signTypedData({
    account,
    domain: quote.permitData.domain,
    types: typedTypes,
    primaryType: primaryType!,
    message: quote.permitData.values,
  });
  console.log("Signature:", sig.slice(0, 20) + "...");

  // Create swap
  console.log("\n=== CREATE SWAP ===");
  const swapBody: Record<string, unknown> = {
    quote: quote.quote,
    permitData: quote.permitData,
    signature: sig,
    simulateTransaction: false,
  };

  const swapRes = await fetch(`${API_BASE}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify(swapBody),
  });

  if (!swapRes.ok) {
    console.log("Swap creation failed:", swapRes.status, await swapRes.text());
    return null;
  }

  const swap = await swapRes.json();
  console.log("swap.to:", swap.swap.to);
  console.log("swap.value:", swap.swap.value);
  console.log("swap.data length:", swap.swap.data?.length);
  console.log("swap.gasFee:", swap.swap.gasFee);

  // Decode the calldata
  decodeUniversalRouterExecute(swap.swap.data as Hex);

  return { quote, swap, sig };
}

async function simulateAndSend(swapData: { quote: any; swap: any; sig: string }) {
  const { swap } = swapData;

  // Try simulation first
  console.log("\n=== SIMULATION (eth_call) ===");
  try {
    await publicClient.call({
      account: agentAddress,
      to: swap.swap.to as Address,
      data: swap.swap.data as Hex,
      value: BigInt(swap.swap.value || "0"),
    });
    console.log("Simulation SUCCEEDED");
  } catch (e: any) {
    console.log("Simulation REVERTED");
    console.log("  Short message:", e.shortMessage?.slice(0, 200));
    if (e.cause?.data) {
      console.log("  Revert data:", e.cause.data);
      // Try to decode known error selectors
      const revertSig = e.cause.data.slice(0, 10);
      const knownErrors: Record<string, string> = {
        "0x6a12f104": "InsufficientETH()",
        "0x675cae38": "InsufficientToken()",
        "0x5bf6f916": "TransactionDeadlinePassed()",
        "0x316cf0eb": "V3InvalidSwap()",
        "0x39d35496": "V3TooLittleReceived()",
        "0x2c4029e9": "ExecutionFailed(uint256,bytes)",
      };
      console.log("  Error:", knownErrors[revertSig] || `Unknown(${revertSig})`);

      if (revertSig === "0x2c4029e9") {
        // ExecutionFailed(uint256 commandIndex, bytes message)
        try {
          const decoded = decodeAbiParameters(
            [
              { name: "commandIndex", type: "uint256" },
              { name: "message", type: "bytes" },
            ],
            ("0x" + e.cause.data.slice(10)) as Hex,
          );
          console.log("  Failed command index:", decoded[0].toString());
          console.log("  Inner error:", decoded[1]);

          // Try to decode inner error
          const innerSig = (decoded[1] as Hex).slice(0, 10);
          console.log("  Inner error selector:", innerSig, knownErrors[innerSig] || "");
        } catch {
          // can't decode
        }
      }
    }
  }

  // Also try simulation with explicit gas to see if it changes anything
  console.log("\n=== SIMULATION WITH GAS ===");
  try {
    await publicClient.call({
      account: agentAddress,
      to: swap.swap.to as Address,
      data: swap.swap.data as Hex,
      value: BigInt(swap.swap.value || "0"),
      gas: 500_000n,
    });
    console.log("Simulation with gas SUCCEEDED");
  } catch (e: any) {
    console.log("Simulation with gas REVERTED (same as above, gas is not the issue)");
    if (e.cause?.data) {
      console.log("  Revert data:", e.cause.data);
    }
  }

  // Now let's try to understand WHY InsufficientETH happens
  // The UNWRAP_WETH command checks: if (address(this).balance < amountMinimum) revert InsufficientETH()
  // This means the V3 swap didn't deposit enough WETH into the router,
  // OR the router doesn't hold enough WETH after the swap to unwrap.

  // Let's check: does the V3 swap output go to the router (address(this))?
  console.log("\n=== ANALYSIS ===");
  console.log("The InsufficientETH() error comes from UNWRAP_WETH command.");
  console.log("This means the router's WETH balance after V3_SWAP_EXACT_IN is less than amountMinimum.");
  console.log("Possible causes:");
  console.log("  1. V3 swap recipient is wrong (not the router)");
  console.log("  2. The pool's actual price moved and output < amountMinimum");
  console.log("  3. Permit2 permit failed silently, so the swap couldn't pull USDC");
}

async function main() {
  await checkPrerequisites();
  const result = await getQuoteAndSwap();
  if (result) {
    await simulateAndSend(result);
  }
}

main().catch(console.error);
