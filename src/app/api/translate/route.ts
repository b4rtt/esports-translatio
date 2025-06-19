import { NextResponse } from "next/server";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAI } from "openai";

// Vercel runtime configuration for Hobby plan
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds (Hobby plan limit)

// Add timeout configuration for Vercel Hobby plan
const REQUEST_TIMEOUT = 45000; // 45 seconds per request (must fit in 60s total)
const MAX_RETRIES = 0; // No retries to save time

export async function POST(request: Request) {
  try {
    const { json, language, prompt } = await request.json();
    
    // This API now expects a single SMALL chunk, not full JSON

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

    // Simplified translation function with timeout
    async function translateChunk(chunk: Record<string, unknown>): Promise<Record<string, unknown>> {
      const chunkJson = JSON.stringify(chunk);
      const messages = buildMessages(chunkJson);
      
      console.log(`Sending chunk to OpenAI (${chunkJson.length} characters)`);
      
      try {
        const completionPromise = openai.chat.completions.create({
          model: "gpt-4o-mini", // Use faster model
          messages,
          temperature: 0.1, // Lower temperature for consistent results
        });
        
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("OpenAI request timeout after 2 minutes")), REQUEST_TIMEOUT)
        );
        
        const completion = await Promise.race([completionPromise, timeoutPromise]);

        let result = completion.choices[0]?.message?.content || "";

        // Clean up the response - remove markdown formatting
        result = result.trim();
        result = result.replace(/^```json?\s*/, '').replace(/\s*```$/, '');
        result = result.replace(/^```\s*/, '').replace(/\s*```$/, '');

        const parsed = JSON.parse(result);
        console.log(`Successfully translated chunk`);
        return parsed;
      } catch (error) {
        console.error(`Translation failed for chunk:`, error);
        throw error;
      }
    }

    // Retry wrapper
    async function translateChunkWithRetry(chunk: Record<string, unknown>): Promise<Record<string, unknown>> {
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          return await translateChunk(chunk);
        } catch (error) {
          console.error(`Attempt ${attempt + 1} failed:`, error);
          if (attempt === MAX_RETRIES) {
            throw error;
          }
          // Wait before retry
          console.log(`Retrying in ${(attempt + 1) * 3} seconds...`);
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 3000));
        }
      }
      throw new Error("All retry attempts failed");
    }

    // Parse the single chunk (frontend sends one chunk at a time)
    const chunk = JSON.parse(json);
    
    console.log(`Processing single chunk with ${Object.keys(chunk).length} keys`);

    try {
      // Translate this single chunk
      const startTime = Date.now();
      const result = await translateChunkWithRetry(chunk);
      const endTime = Date.now();
      
      console.log(`Chunk completed in ${endTime - startTime}ms`);
      
      return NextResponse.json({ result: JSON.stringify(result, null, 2) });
    } catch (error) {
      console.error("Translation error:", error);
      if (error instanceof Error && error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Translation timed out. Please try again." },
          { status: 408 }
        );
      }
      return NextResponse.json(
        { error: "AI translation failed. Please try again." },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json(
      { error: "Translation failed" }, 
      { status: 500 }
    );
  }
}
