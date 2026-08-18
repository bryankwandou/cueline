export type CueStatus = "queued" | "running" | "done" | "failed";

export interface Cue {
  id: string;
  body: string;
  status: CueStatus;
  reply?: string;
  error?: string;
  tokensIn?: number;
  tokensOut?: number;
  finishedAt?: number;
}

export type RunMode = "execute" | "reminder";

export interface RunResponse {
  text: string;
  usage: { input: number; output: number };
}

/** Haiku pricing, USD per million tokens. Used for the live cost estimate. */
export const PRICE_IN = 1.0;
export const PRICE_OUT = 5.0;

export function estimateCost(input: number, output: number): number {
  return (input / 1_000_000) * PRICE_IN + (output / 1_000_000) * PRICE_OUT;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}
