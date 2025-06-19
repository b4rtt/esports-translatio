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
        content: `You are a professional translation assistant specializing in software localization and esports content. Your task is to translate JSON files while maintaining their structure and functionality.

CRITICAL RULES:
1. ONLY translate string values (text content), NEVER translate keys or structural elements
2. Preserve ALL special characters, placeholders ({{variable}}, %s, {0}, etc.), HTML tags, and formatting
3. Return ONLY valid JSON - no explanations, comments, or markdown formatting
4. Maintain exact JSON structure, nesting, and array orders
5. For technical terms, use established terminology in the target language
6. Keep proper names, brand names, and technical identifiers untranslated
7. Preserve URLs, email addresses, and file paths exactly as they are
8. For empty strings or null values, keep them as-is
9. Maintain consistent terminology throughout the translation
10. Consider cultural context for esports and gaming terminology

ESPORTS CONTEXT:
- Use established esports terminology in the target language
- Keep game-specific terms that are commonly used internationally
- Translate UI elements appropriately for the gaming audience
- Maintain professional tone suitable for sports organizations`
      },
      {
        role: "user",
        content: `Context: ${prompt}

Target Language: ${language}

Please translate the following JSON content according to the rules above:

${json}`,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // ChatGPT 4.1 (OpenAI gpt-4o model)
      messages,
    });


    let result = completion.choices[0]?.message?.content || "";

    // Clean up the response - remove markdown formatting and extra whitespace
    result = result.trim();
    result = result.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
    result = result.replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Validate that we have valid JSON
    try {
      JSON.parse(result);
    } catch (parseError) {
      console.error("Invalid JSON from AI:", result, parseError);
      return NextResponse.json(
        { error: "AI returned invalid JSON format" },
        { status: 422 }
      );
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
