import { NextRequest, NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import OpenAI from "openai";
import { 
  DEFAULT_NARRATION_PROMPT, 
  getNarrationPrompt,
  getTTSFormattingPrompt 
} from "@/lib/narration-prompts";

// Configure OpenAI client with extended timeout for long audio files
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 10 * 60 * 1000, // 10 minutes timeout
  maxRetries: 3, // Retry up to 3 times on failure
});

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB (Whisper API limit)

// Set max duration for this API route to 15 minutes (for Vercel/Next.js)
export const maxDuration = 900; // 15 minutes in seconds

/**
 * Retry helper with exponential backoff
 * Useful for transient errors like timeouts or rate limits
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  operationName = "operation"
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      const isLastRetry = i === retries - 1;
      const isRetryableError = 
        error instanceof Error && 
        (error.message.includes("timeout") || 
         error.message.includes("ECONNRESET") ||
         error.message.includes("ETIMEDOUT") ||
         error.message.includes("rate limit"));

      if (isLastRetry || !isRetryableError) {
        throw error;
      }

      const waitTime = delay * Math.pow(2, i); // Exponential backoff
      console.log(`⚠️ ${operationName} failed (attempt ${i + 1}/${retries}). Retrying in ${waitTime}ms...`);
      console.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  throw new Error(`Failed after ${retries} retries`);
}

export async function POST(req: NextRequest) {
  try {
    console.log("\n" + "=".repeat(60));
    console.log("🎬 Starting audio processing pipeline...");
    console.log("=".repeat(60) + "\n");
    
    // Parse the form data
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json(
        { error: "No audio file provided" },
        { status: 400 }
      );
    }

    console.log("📁 Input file:", audioFile.name);
    console.log("📊 Size:", (audioFile.size / 1024 / 1024).toFixed(2), "MB");
    console.log("🎵 Type:", audioFile.type || "unknown");
    console.log("");

    // Check file size limit
    if (audioFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { 
          error: `File too large (${(audioFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 25MB. Please use a shorter audio file or compress it.` 
        },
        { status: 413 }
      );
    }

    // Step 1: Transcribe audio with Whisper (with retry logic)
    console.log("📝 Transcribing audio with Whisper...");
    console.log(`   File: ${audioFile.name} (${(audioFile.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log("   ⏳ This may take several minutes for long audio files...");
    
    const transcription = await retryWithBackoff(
      async () => {
        const startTime = Date.now();
        const result = await openaiClient.audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ✅ Transcription completed in ${duration}s`);
        return result;
      },
      3, // 3 retries
      2000, // 2 second initial delay
      "Whisper transcription"
    );

    const transcribedText = transcription.text;
    console.log("📄 Transcribed text preview:", transcribedText.substring(0, 200));
    console.log(`   Total length: ${transcribedText.length} characters`);

    // Step 2: Detect language from transcribed text
    const spanishPatterns = /\b(el|la|los|las|un|una|de|que|en|es|por|para|con|su|al|lo|como|más|pero|le|ha|me|si|sin|sobre|este|ya|entre|cuando|todo|esta|ser|son|también|fue|muy|hasta|desde|está|mi|porque|qué|han|ni|nos|yo|tiene|hay|vez|puede|todos|así|sido|bien|nada|hacer|cada|día|otro|va|sí|dijo|cómo|aquí|menos|algo|estado|hecho|mucho|mismo)\b/i;
    
    const isSpanish = spanishPatterns.test(transcribedText.substring(0, 500));
    console.log("🌐 Detected language:", isSpanish ? "Spanish 🇪🇸" : "English 🇺🇸");

    // Step 3: Translate and adapt text with GPT-4o-mini
    // To customize narration style, edit src/lib/narration-prompts.ts or change DEFAULT_NARRATION_PROMPT
    const targetLanguage = isSpanish ? "English" : "Spanish";
    const translationPrompt = getNarrationPrompt(
      DEFAULT_NARRATION_PROMPT,
      targetLanguage as "English" | "Spanish",
      transcribedText
    );

    console.log(`🔄 Translating to ${targetLanguage} and adapting for narration...`);
    const translationResult = await retryWithBackoff(
      async () => {
        const startTime = Date.now();
        const result = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: translationPrompt,
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ✅ Translation completed in ${duration}s`);
        return result;
      },
      3,
      1000,
      "Translation"
    );

    const translatedText = translationResult.text;
    console.log("📝 Translated text preview:", translatedText.substring(0, 200));
    console.log(`   Length: ${translatedText.length} characters`);

    // Step 4: Format text for TTS (pronunciation, pacing, pauses)
    console.log("✨ Formatting text for optimal TTS pronunciation...");
    const ttsFormattingPrompt = getTTSFormattingPrompt(
      translatedText,
      targetLanguage as "English" | "Spanish"
    );

    const ttsFormattedResult = await retryWithBackoff(
      async () => {
        const startTime = Date.now();
        const result = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: ttsFormattingPrompt,
        });
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`   ✅ TTS formatting completed in ${duration}s`);
        return result;
      },
      3,
      1000,
      "TTS formatting"
    );

    const ttsFormattedText = ttsFormattedResult.text;
    console.log("🎙️ TTS-formatted text preview:", ttsFormattedText.substring(0, 200));
    console.log(`   Length: Original ${translatedText.length} → Formatted ${ttsFormattedText.length} chars`);

    // Step 5: Generate audio with TTS-1 using "coral" voice
    console.log("🎵 Generating audio with TTS-1 (coral voice)...");
    
    const maxTTSLength = 4096;
    let finalAudioBuffer: Buffer;

    if (ttsFormattedText.length > maxTTSLength) {
      // Split text into chunks for TTS
      const chunks: string[] = [];
      const sentences = ttsFormattedText.match(/[^.!?]+[.!?]+/g) || [ttsFormattedText];
      console.log(`   ⚠️ Text exceeds ${maxTTSLength} chars, splitting into chunks...`);
      let currentChunk = "";

      for (const sentence of sentences) {
        if ((currentChunk + sentence).length > maxTTSLength && currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
      if (currentChunk) chunks.push(currentChunk.trim());

      // Generate audio for each text chunk with retry
      console.log(`   📦 Generating ${chunks.length} audio chunks in parallel...`);
      const audioBuffers = await Promise.all(
        chunks.map(async (chunk, index) => {
          return await retryWithBackoff(
            async () => {
              console.log(`   🎤 Processing chunk ${index + 1}/${chunks.length} (${chunk.length} chars)...`);
              const response = await openaiClient.audio.speech.create({
                model: "tts-1",
                voice: "coral",
                input: chunk,
              });
              return Buffer.from(await response.arrayBuffer());
            },
            2, // 2 retries for TTS
            1000,
            `TTS chunk ${index + 1}/${chunks.length}`
          );
        })
      );

      finalAudioBuffer = Buffer.concat(audioBuffers);
      console.log(`   ✅ Combined ${chunks.length} audio chunks successfully`);
    } else {
      const audioBuffer = await retryWithBackoff(
        async () => {
          const startTime = Date.now();
          const response = await openaiClient.audio.speech.create({
            model: "tts-1",
            voice: "coral",
            input: ttsFormattedText,
          });
          const duration = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`   ✅ Audio generation completed in ${duration}s`);
          return Buffer.from(await response.arrayBuffer());
        },
        2,
        1000,
        "TTS audio generation"
      );
      finalAudioBuffer = audioBuffer;
    }

    // Step 6: Return audio file for download
    const audioSizeMB = (finalAudioBuffer.length / 1024 / 1024).toFixed(2);
    console.log(`\n🎉 Success! Generated audio: ${audioSizeMB} MB`);
    console.log("📥 Sending audio to client for download...\n");
    
    return new NextResponse(new Uint8Array(finalAudioBuffer), {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="translated-audio.mp3"`,
      },
    });
  } catch (error) {
    console.error("\n❌ Error processing audio:");
    console.error("   ", error);
    
    // Provide more helpful error messages
    let errorMessage = "Failed to process audio";
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT")) {
        errorMessage = "Request timed out. The audio file may be too long. Try a shorter audio file or split it into smaller segments.";
        statusCode = 504;
      } else if (error.message.includes("rate limit")) {
        errorMessage = "API rate limit exceeded. Please wait a moment and try again.";
        statusCode = 429;
      } else if (error.message.includes("Invalid file format")) {
        errorMessage = "Invalid audio file format. Please upload a valid audio file (MP3, WAV, M4A, OGG, etc.)";
        statusCode = 400;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  }
}

