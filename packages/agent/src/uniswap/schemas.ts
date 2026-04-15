/**
 * Zod validation schemas for Uniswap Trading API responses.
 * These validate external API data before it enters the agent.
 *
 * @module @maw/agent/uniswap/schemas
 */
import { z } from "zod";
import type { Hex } from "viem";

const hexString = z.custom<Hex>(
  (val) => typeof val === "string" && val.startsWith("0x"),
  { message: "Expected a hex string starting with 0x" },
);

export const PermitDataSchema = z.object({
  domain: z.record(z.string(), z.unknown()),
  types: z.record(
    z.string(),
    z.array(
      z.object({
        name: z.string(),
        type: z.string(),
      }),
    ),
  ),
  values: z.record(z.string(), z.unknown()),
});
export type PermitData = z.infer<typeof PermitDataSchema>;

/** Calldata + metadata returned by POST /check_approval when a token → Permit2 approve is needed. */
export const ApprovalTransactionRequestSchema = z
  .object({
    to: hexString,
    from: hexString,
    data: hexString,
    value: hexString,
    chainId: z.number(),
  })
  .passthrough();

export const ApprovalResponseSchema = z
  .object({
    requestId: z.string().optional(),
    /** `null` when the wallet already has sufficient Permit2 allowance for the amount. */
    approval: z.union([ApprovalTransactionRequestSchema, z.null()]),
  })
  .passthrough();
export type ApprovalResponse = z.infer<typeof ApprovalResponseSchema>;
export type ApprovalTransactionRequest = z.infer<typeof ApprovalTransactionRequestSchema>;

export const QuoteResponseSchema = z
  .object({
    requestId: z.string(),
    quote: z
      .object({
        chainId: z.number(),
        input: z
          .object({ token: hexString, amount: z.string() })
          .passthrough(),
        output: z
          .object({ token: hexString, amount: z.string() })
          .passthrough(),
        swapper: hexString,
        slippage: z.union([
          z.object({ tolerance: z.number() }),
          z.number(),
        ]),
      })
      .passthrough(),
    routing: z.string(),
    permitData: PermitDataSchema.nullable().optional(),
  })
  .passthrough();
export type QuoteResponse = z.infer<typeof QuoteResponseSchema>;

export const SwapResponseSchema = z.object({
  swap: z.object({
    chainId: z.number().optional(),
    to: hexString,
    data: hexString,
    value: z.string(),
    gasLimit: z.string().optional(),
  }),
  requestId: z.string(),
});
export type SwapResponse = z.infer<typeof SwapResponseSchema>;
