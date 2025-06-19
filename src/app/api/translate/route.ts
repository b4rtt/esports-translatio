import { NextResponse } from "next/server";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAI } from "openai";

export async function POST(request: Request) {
  try {
    const { json, language, prompt } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You are a translation assistant. Translate the provided JSON values into the target language and return only valid JSON.",
      },
      {
        role: "user",
        content: `${prompt}\nTarget language: ${language}\nJSON:\n${json}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // ChatGPT 4.1 (OpenAI gpt-4o model)
      messages,
    });

    let result = completion.choices[0]?.message?.content || "";

    try {
      const parsed = JSON.parse(result);
      if (
        parsed &&
        typeof parsed === "object" &&
        "GeneralTranslations" in parsed &&
        Object.keys(parsed).length === 1
      ) {
        result = JSON.stringify(parsed["GeneralTranslations"], null, 2);
      } else {
        result = JSON.stringify(parsed, null, 2);
      }
    } catch {
      // keep result as is if parsing fails
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
