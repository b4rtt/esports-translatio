import { NextResponse } from "next/server";
import { type ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { OpenAI } from "openai";

// Add timeout configuration
const REQUEST_TIMEOUT = 120000; // 2 minutes per request (120 seconds)
const MAX_RETRIES = 1; // Keep retries minimal to save time

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

    function chunkObject(obj: Record<string, unknown>, maxSize: number) {
      const entries = Object.entries(obj);
      const chunks = [] as Record<string, unknown>[];
      
      // Create smaller chunks based on content size, not just key count
      let currentChunk: Array<[string, unknown]> = [];
      let currentChunkSize = 0;
      
      for (const [key, value] of entries) {
        const entrySize = JSON.stringify([key, value]).length;
        
        // If adding this entry would exceed maxSize, start a new chunk
        if (currentChunk.length > 0 && (currentChunkSize + entrySize > maxSize * 100 || currentChunk.length >= 10)) {
          chunks.push(Object.fromEntries(currentChunk));
          currentChunk = [];
          currentChunkSize = 0;
        }
        
        currentChunk.push([key, value]);
        currentChunkSize += entrySize;
      }
      
      // Add remaining entries as the last chunk
      if (currentChunk.length > 0) {
        chunks.push(Object.fromEntries(currentChunk));
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

    // Simplified translation function with timeout
    async function translateChunk(chunk: Record<string, unknown>): Promise<Record<string, unknown>> {
      const chunkJson = JSON.stringify(chunk);
      const messages = buildMessages(chunkJson);
      
      console.log(`Sending chunk to OpenAI (${chunkJson.length} characters)`);
      
      try {
        const completion = await Promise.race([
          openai.chat.completions.create({
            model: "gpt-4o-mini", // Use faster model
            messages,
            temperature: 0.1, // Lower temperature for consistent results
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error("OpenAI request timeout after 2 minutes")), REQUEST_TIMEOUT)
          )
        ]) as any;

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

    const data = JSON.parse(json);
    
    // Create smaller, content-aware chunks
    const chunks = chunkObject(data, 10); // Much smaller chunks based on content size
    
    console.log(`Processing ${chunks.length} chunks for translation`);
    
    // Check if the request is too large
    if (chunks.length > 50) {
      return NextResponse.json(
        { error: "File too large. Please use a smaller JSON file or reduce content length." },
        { status: 413 }
      );
    }

    const combined: Record<string, unknown> = {};

    try {
      // Process chunks sequentially for maximum stability
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);
        
        try {
          const result = await translateChunkWithRetry(chunk);
          
          // Merge results
          Object.assign(combined, result);
          
          // Small delay between chunks to avoid rate limiting
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
          }
          
        } catch (chunkError) {
          console.error(`Failed to process chunk ${i + 1}:`, chunkError);
          throw new Error(`Translation failed on chunk ${i + 1}/${chunks.length}`);
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
