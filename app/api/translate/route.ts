import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const { text, direction, history } = await req.json();

  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "Input too long (max 500 characters)" }, { status: 400 });
  }

  const [from, to] =
    direction === "rw-en"
      ? ["Kinyarwanda", "English"]
      : ["English", "Kinyarwanda"];

  const priorMessages: { role: "user" | "assistant"; content: string }[] = (history ?? []).map(
    (m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })
  );
  priorMessages.push({ role: "user", content: text });

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 512,
    system: `You are a Kinyarwanda language expert helping someone learn the language. Translate from ${from} to ${to}.
Return a JSON object with these fields:
- translation: the translated text
- romanization: (only if translating to Kinyarwanda) pronunciation guide using simple English phonetics
- notes: (optional) brief cultural or grammatical note if genuinely useful, max 1 sentence
Return ONLY valid JSON, no markdown fences.`,
    messages: priorMessages,
  });

  try {
    const content = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(content);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Failed to parse translation" }, { status: 500 });
  }
}
