import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Forwards one cue to the Claude API and returns the reply.
 *
 * The caller's key arrives on the request, is used for exactly this call,
 * and is never logged, cached, or written to disk. There is no database
 * behind this route on purpose — a key we do not store is a key that
 * cannot leak from here.
 */
export async function POST(req: Request) {
  let payload: { apiKey?: string; prompt?: string; system?: string };

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Body was not valid JSON." }, { status: 400 });
  }

  const apiKey = payload.apiKey?.trim();
  const prompt = payload.prompt?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "No API key attached to this request." },
      { status: 400 },
    );
  }
  if (!prompt) {
    return NextResponse.json({ error: "The cue was empty." }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    // Haiku 4.5, no thinking. The point of this product is a cheap,
    // predictable morning brief — not deep reasoning. Note that Haiku 4.5
    // does not accept `output_config.effort`, so it is deliberately absent.
    const message = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      system:
        payload.system?.trim() ||
        "Answer directly and completely. Skip preamble and closing offers of further help. The reader is catching up on their day and will not reply.",
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("\n")
      .trim();

    return NextResponse.json({
      text: text || "(the model returned no text)",
      usage: {
        input: message.usage.input_tokens,
        output: message.usage.output_tokens,
      },
    });
  } catch (err) {
    const status =
      err instanceof Anthropic.APIError && err.status ? err.status : 500;

    const message =
      err instanceof Anthropic.AuthenticationError
        ? "That key was rejected. Check it in the Anthropic Console."
        : err instanceof Anthropic.RateLimitError
          ? "Rate limited by the API. The cue stays queued — fire it again shortly."
          : err instanceof Anthropic.APIError
            ? err.message
            : "The request did not reach the API.";

    return NextResponse.json({ error: message }, { status });
  }
}
