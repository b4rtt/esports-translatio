import { NextResponse } from "next/server";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAI } from "openai";

// Add timeout configuration
const REQUEST_TIMEOUT = 30000; // 30 seconds per request
const MAX_RETRIES = 2;

export async function POST(request: Request) {
  try {
    const { json, language, prompt } = await request.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: REQUEST_TIMEOUT,
    });

    function chunkObject(obj: Record<string, unknown>, size: number) {
      const entries = Object.entries(obj);
      const chunks = [] as Record<string, unknown>[];
      for (let i = 0; i < entries.length; i += size) {
        chunks.push(Object.fromEntries(entries.slice(i, i + size)));
      }
      return chunks;
    }

    function buildMessages(jsonChunk: string): ChatCompletionMessageParam[] {
      return [
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

${jsonChunk}`,
        },
      ];
    }

    // Add retry mechanism for individual API calls
    async function translateChunkWithRetry(chunk: Record<string, unknown>, retries = MAX_RETRIES): Promise<Record<string, unknown>> {
      const chunkJson = JSON.stringify(chunk);
      const messages = buildMessages(chunkJson);
      
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const completion = await Promise.race([
            openai.chat.completions.create({
              model: "gpt-4o-mini", // Use faster model to reduce timeout risk
              messages,
              temperature: 0.1, // Lower temperature for more consistent results
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error("Request timeout")), REQUEST_TIMEOUT)
            )
          ]) as any;

          let result = completion.choices[0]?.message?.content || "";

          // Clean up the response - remove markdown formatting and extra whitespace
          result = result.trim();
          result = result.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
          result = result.replace(/^```\s*/, '').replace(/\s*```$/, '');

          const parsed = JSON.parse(result);
          return parsed;
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error);
          if (attempt === retries) {
            throw error;
          }
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
      throw new Error("All retry attempts failed");
    }

    const data = JSON.parse(json);
    
    // Reduce chunk size for better performance and lower timeout risk
    const chunks = chunkObject(data, 50);
    
    // Check if the request is too large
    if (chunks.length > 20) {
      return NextResponse.json(
        { error: "File too large. Please use a smaller JSON file (max ~1000 keys)." },
        { status: 413 }
      );
    }

    const combined: Record<string, unknown> = {};

    try {
      // Process chunks with controlled concurrency to avoid rate limits
      const CONCURRENT_REQUESTS = 3;
      
      for (let i = 0; i < chunks.length; i += CONCURRENT_REQUESTS) {
        const batch = chunks.slice(i, i + CONCURRENT_REQUESTS);
        
        const results = await Promise.all(
          batch.map(chunk => translateChunkWithRetry(chunk))
        );
        
        // Merge results
        results.forEach(result => {
          Object.assign(combined, result);
        });
        
        // Small delay between batches to avoid rate limiting
        if (i + CONCURRENT_REQUESTS < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    } catch (error) {
      console.error("Translation error:", error);
      if (error instanceof Error && error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Translation timed out. Please try with a smaller file." },
          { status: 408 }
        );
      }
      return NextResponse.json(
        { error: "AI translation failed. Please try again." },
        { status: 422 }
      );
    }

    return NextResponse.json({ result: JSON.stringify(combined, null, 2) });
  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      { error: "Translation failed" }, 
      { status: 500 }
    );
  }
}
