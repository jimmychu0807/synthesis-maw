/**
 * Deep diagnostic part 2: decode command 0x10, trace the exact revert point,
 * and check if the Permit2 permit itself is the problem.
 */
import {
  createPublicClient,
  createWalletClient,
  parseUnits,
  formatUnits,
  http,
  parseAbi,
  decodeAbiParameters,
  encodeFunctionData,
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

const WETH = "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14";
const USDC = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";
const NATIVE_ETH = "0x0000000000000000000000000000000000000000";
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const UNIVERSAL_ROUTER = "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b";

const chain = sepolia;
const transport = http(process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com");

const publicClient = createPublicClient({ chain, transport });
const walletClient = createWalletClient({ account, chain, transport });

async function main() {
  // Step 1: Get a fresh quote and swap
  console.log("=== Getting fresh quote + swap ===");
  const quoteRes = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify({
      tokenInChainId: 11155111,
      tokenOutChainId: 11155111,
      tokenIn: USDC,
      tokenOut: NATIVE_ETH,
      amount: parseUnits("0.50", 6).toString(),
      type: "EXACT_INPUT",
      swapper: agentAddress,
      slippageTolerance: 5,
    }),
  });

  if (!quoteRes.ok) {
    console.log("Quote failed:", quoteRes.status, await quoteRes.text());
    return;
  }

  const quote = await quoteRes.json();
  console.log("Quote output:", quote.quote.output.amount, "wei ETH");
  console.log("Permit nonce:", quote.permitData?.values?.details?.nonce);

  // Sign permit
  const typedTypes = quote.permitData.types;
  const typeKeys = Object.keys(typedTypes).filter((k: string) => k !== "EIP712Domain");
  const referencedTypes = new Set(
    Object.values(typedTypes)
      .flat()
      .map((f: { type: string }) => f.type)
      .filter((t: string) => typeKeys.includes(t)),
  );
  const primaryType = typeKeys.find((k: string) => !referencedTypes.has(k));

  const sig = await walletClient.signTypedData({
    account,
    domain: quote.permitData.domain,
    types: typedTypes,
    primaryType: primaryType!,
    message: quote.permitData.values,
  });

  const swapRes = await fetch(`${API_BASE}/swap`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify({
      quote: quote.quote,
      permitData: quote.permitData,
      signature: sig,
      simulateTransaction: false,
    }),
  });

  if (!swapRes.ok) {
    console.log("Swap creation failed:", swapRes.status, await swapRes.text());
    return;
  }

  const swap = await swapRes.json();
  const calldata = swap.swap.data as Hex;
  const callvalue = BigInt(swap.swap.value || "0");

  console.log("Swap calldata length:", calldata.length);
  console.log("Swap value:", callvalue.toString());

  // Step 2: Decode the execute() calldata more carefully
  console.log("\n=== DECODING EXECUTE CALLDATA ===");
  const params = decodeAbiParameters(
    [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    ("0x" + calldata.slice(10)) as Hex,
  );

  const commands = params[0] as Hex;
  const inputs = params[1] as Hex[];
  const deadline = params[2] as bigint;

  const commandBytes = commands.slice(2);
  console.log("Commands:", commands);
  console.log("Deadline:", deadline.toString());

  // Command 0x10 is actually V3_SWAP_EXACT_IN in the second command map (0x10 = 16)
  // In Universal Router V2, commands 0x00-0x07 are one set, 0x08-0x0f another, 0x10-0x17 another
  // 0x10 = V3_SWAP_EXACT_IN (same as 0x00 but in a different command block)
  // Wait - let me check. The command encoding for UR:
  // Bits 0-4: command type
  // Bit 5: unused
  // Bit 6: if set, "allow revert" (don't revert the whole tx if this command fails)
  // Bit 7: unused
  // So 0x10 = 0b00010000, which is command type 0x10 = 16
  // But Uniswap Universal Router defines:
  //   0x00 = V3_SWAP_EXACT_IN
  //   0x10 = UNWRAP_WETH (in some versions)
  // Actually NO - let me look at this differently. Command map depends on the UR version.

  // Let me just try to decode command 1 (0x10) as V3_SWAP_EXACT_IN with sub-plan
  console.log("\n=== COMMAND 1 (0x10) RAW ANALYSIS ===");
  const cmd1Input = inputs[1]!;
  console.log("Input hex (first 500 chars):", cmd1Input.slice(0, 500));

  // It might be a multi-hop V3 path. Let's try decoding differently.
  // V3_SWAP_EXACT_IN: (address recipient, uint256 amountIn, uint256 amountOutMinimum, bytes path, bool payerIsUser)
  // But 0x10 might encode the params differently. Let me try raw offset decoding.

  // Actually, looking at the hex more carefully: the input starts with:
  // 0x0000...0040 = offset to first dynamic param
  // 0x0000...0080 = offset to second dynamic param
  // These look like sub-commands (it's a nested execute pattern).

  // Let me try: maybe 0x10 = execute_sub_plan?
  // In UniversalRouter.sol, command 0x10 depends on the version.
  // For Uniswap UniversalRouter deployed on Sepolia (0x3A9D...), let me check the contract.

  // Step 3: Let's try to trace which command reverts by simulating each command individually
  console.log("\n=== TRACING REVERT POINT ===");

  // First, just try the full simulation and capture the trace
  try {
    await publicClient.simulateContract({
      address: UNIVERSAL_ROUTER as Address,
      abi: parseAbi(["function execute(bytes commands, bytes[] inputs, uint256 deadline)"]),
      functionName: "execute",
      args: [commands, inputs, deadline],
      account: agentAddress,
      value: callvalue,
    });
    console.log("Full simulation SUCCEEDED (unexpected)");
  } catch (e: any) {
    console.log("Full simulation REVERTED");
    // Walk the error chain for revert data
    let current = e;
    let depth = 0;
    while (current && depth < 5) {
      if (current.data) {
        console.log(`  Error data at depth ${depth}:`, typeof current.data === "string" ? current.data.slice(0, 200) : JSON.stringify(current.data)?.slice(0, 200));
      }
      if (current.cause?.data) {
        console.log(`  Cause data at depth ${depth}:`, typeof current.cause.data === "string" ? current.cause.data.slice(0, 200) : JSON.stringify(current.cause.data)?.slice(0, 200));
      }
      current = current.cause;
      depth++;
    }
  }

  // Step 4: Check if Permit2 permit would succeed on its own
  console.log("\n=== TESTING PERMIT2 PERMIT STANDALONE ===");
  const permit2Abi = parseAbi([
    "function permit(address owner, ((address token, uint160 amount, uint48 expiration, uint48 nonce) details, address spender, uint256 sigDeadline) permitSingle, bytes signature)",
  ]);

  try {
    await publicClient.simulateContract({
      address: PERMIT2 as Address,
      abi: permit2Abi,
      functionName: "permit",
      args: [
        agentAddress,
        {
          details: {
            token: quote.permitData.values.details.token as Address,
            amount: BigInt(quote.permitData.values.details.amount),
            expiration: Number(quote.permitData.values.details.expiration),
            nonce: Number(quote.permitData.values.details.nonce),
          },
          spender: quote.permitData.values.spender as Address,
          sigDeadline: BigInt(quote.permitData.values.sigDeadline),
        },
        sig as Hex,
      ],
      account: agentAddress, // Anyone can call permit() — but it verifies the signature
    });
    console.log("Permit2 permit simulation SUCCEEDED");
  } catch (e: any) {
    console.log("Permit2 permit simulation FAILED");
    console.log("  Error:", e.shortMessage?.slice(0, 300));
    if (e.cause?.data) {
      console.log("  Revert data:", e.cause.data);
    }
  }

  // Step 5: Try sending with permit2.permit() first, then a separate execute()
  console.log("\n=== STRATEGY: SPLIT PERMIT + EXECUTE ===");
  console.log("If Permit2 permit succeeds standalone, we can call it first,");
  console.log("then call execute() with only the V3_SWAP + UNWRAP_WETH commands.");
  console.log("This would confirm whether the issue is in the PERMIT2_PERMIT command");
  console.log("or in the V3_SWAP/UNWRAP_WETH commands.");

  // Step 6: Check if maybe the issue is that 0x10 is actually not V3_SWAP_EXACT_IN
  // Let's compare with a working ETH→USDC swap (which uses 0x0b WRAP_ETH + 0x00 V3_SWAP)
  console.log("\n=== COMPARING WITH ETH→USDC DIRECTION ===");
  const ethQuoteRes = await fetch(`${API_BASE}/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
    body: JSON.stringify({
      tokenInChainId: 11155111,
      tokenOutChainId: 11155111,
      tokenIn: NATIVE_ETH,
      tokenOut: USDC,
      amount: parseUnits("0.0001", 18).toString(),
      type: "EXACT_INPUT",
      swapper: agentAddress,
      slippageTolerance: 5,
    }),
  });

  if (ethQuoteRes.ok) {
    const ethQuote = await ethQuoteRes.json();
    const ethSwapRes = await fetch(`${API_BASE}/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": UNISWAP_API_KEY },
      body: JSON.stringify({
        quote: ethQuote.quote,
        simulateTransaction: false,
      }),
    });

    if (ethSwapRes.ok) {
      const ethSwap = await ethSwapRes.json();
      const ethCalldata = ethSwap.swap.data as Hex;
      const ethParams = decodeAbiParameters(
        [
          { name: "commands", type: "bytes" },
          { name: "inputs", type: "bytes[]" },
          { name: "deadline", type: "uint256" },
        ],
        ("0x" + ethCalldata.slice(10)) as Hex,
      );
      console.log("ETH→USDC commands:", ethParams[0]);
      console.log("ETH→USDC value:", ethSwap.swap.value);

      // Try simulating ETH→USDC
      try {
        await publicClient.simulateContract({
          address: UNIVERSAL_ROUTER as Address,
          abi: parseAbi(["function execute(bytes commands, bytes[] inputs, uint256 deadline)"]),
          functionName: "execute",
          args: [ethParams[0] as Hex, ethParams[1] as Hex[], ethParams[2] as bigint],
          account: agentAddress,
          value: BigInt(ethSwap.swap.value || "0"),
        });
        console.log("ETH→USDC simulation SUCCEEDED");
      } catch (e: any) {
        console.log("ETH→USDC simulation FAILED:", e.shortMessage?.slice(0, 200));
      }
    } else {
      console.log("ETH→USDC swap creation failed:", ethSwapRes.status);
    }
  } else {
    console.log("ETH→USDC quote not available");
  }

  // Step 7: Actually send the permit first, then reconstruct execute without permit command
  console.log("\n=== ACTUALLY TESTING: Send Permit2 first, then execute swap ===");
  try {
    // Call permit2.permit() directly
    const permitTx = await walletClient.writeContract({
      address: PERMIT2 as Address,
      abi: permit2Abi,
      functionName: "permit",
      args: [
        agentAddress,
        {
          details: {
            token: quote.permitData.values.details.token as Address,
            amount: BigInt(quote.permitData.values.details.amount),
            expiration: Number(quote.permitData.values.details.expiration),
            nonce: Number(quote.permitData.values.details.nonce),
          },
          spender: quote.permitData.values.spender as Address,
          sigDeadline: BigInt(quote.permitData.values.sigDeadline),
        },
        sig as Hex,
      ],
      chain,
      account,
    });
    console.log("Permit2 TX sent:", permitTx);
    const permitReceipt = await publicClient.waitForTransactionReceipt({ hash: permitTx });
    console.log("Permit2 TX status:", permitReceipt.status);

    if (permitReceipt.status === "success") {
      // Now reconstruct execute() with just commands 1 and 2 (V3_SWAP + UNWRAP_WETH)
      // Remove the PERMIT2_PERMIT command (0x0a) and its input
      const newCommands = ("0x" + commandBytes.slice(2)) as Hex; // skip first command byte
      const newInputs = inputs.slice(1); // skip first input

      console.log("New commands (without permit):", newCommands);

      try {
        await publicClient.simulateContract({
          address: UNIVERSAL_ROUTER as Address,
          abi: parseAbi(["function execute(bytes commands, bytes[] inputs, uint256 deadline)"]),
          functionName: "execute",
          args: [newCommands, newInputs, deadline],
          account: agentAddress,
          value: callvalue,
        });
        console.log("Execute without permit simulation SUCCEEDED!");
      } catch (e: any) {
        console.log("Execute without permit simulation FAILED:", e.shortMessage?.slice(0, 300));
        if (e.cause?.data) {
          const revertData = e.cause.data as string;
          console.log("  Revert data:", revertData.slice(0, 200));
          // Decode ExecutionFailed if present
          if (revertData.startsWith("0x2c4029e9")) {
            const decoded = decodeAbiParameters(
              [
                { name: "commandIndex", type: "uint256" },
                { name: "message", type: "bytes" },
              ],
              ("0x" + revertData.slice(10)) as Hex,
            );
            console.log("  ExecutionFailed at command:", decoded[0].toString());
            const innerData = decoded[1] as Hex;
            console.log("  Inner revert:", innerData.slice(0, 100));

            const knownErrors: Record<string, string> = {
              "0x6a12f104": "InsufficientETH()",
              "0x675cae38": "InsufficientToken()",
              "0x316cf0eb": "V3InvalidSwap()",
              "0x39d35496": "V3TooLittleReceived()",
            };
            const innerSig = innerData.slice(0, 10);
            if (knownErrors[innerSig]) {
              console.log("  Inner error:", knownErrors[innerSig]);
            }
          }
        }
      }
    }
  } catch (e: any) {
    console.log("Permit2 TX failed:", e.shortMessage?.slice(0, 200));
  }
}

main().catch(console.error);
