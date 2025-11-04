# Timeout & Retry System Guide ⏱️

## Overview

This document explains the timeout and retry system implemented to handle long audio files and transient API errors.

## The Problem

When processing long audio files (e.g., 20+ minutes), several timeout issues can occur:

1. **Whisper API Timeouts**: Transcription can take 10-15 minutes for long audio
2. **Next.js Route Timeouts**: Default timeouts are too short for long processes
3. **OpenAI Client Timeouts**: Default HTTP client timeouts
4. **Transient Network Errors**: Temporary connection issues

### Error Example

```
Error: Request timed out.
POST /api/process-audio 500 in 15.3min
```

This occurs when an API call exceeds the timeout limit and fails without retrying.

## The Solution: Multi-Layer Timeout & Retry System

### Layer 1: OpenAI Client Configuration

```typescript
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 10 * 60 * 1000, // 10 minutes (600 seconds)
  maxRetries: 3,            // Automatic retries on failure
});
```

**What it does:**
- Sets timeout to **10 minutes** (600,000ms) for each API call
- Automatically retries up to **3 times** on transient errors
- Built-in exponential backoff between retries

**Benefits:**
- Handles network hiccups automatically
- Gives Whisper enough time for long audio
- No code changes needed in function calls

### Layer 2: Next.js Route Configuration

```typescript
export const maxDuration = 900; // 15 minutes in seconds
```

**What it does:**
- Allows the API route to run for up to **15 minutes**
- Prevents Next.js/Vercel from killing the process prematurely
- Required for Vercel deployments with long-running operations

**Benefits:**
- Prevents early termination
- Works in both development and production
- Compatible with Vercel's serverless functions

### Layer 3: Custom Retry Logic with Exponential Backoff

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000,
  operationName = "operation"
): Promise<T>
```

**What it does:**
- Wraps any async operation with retry logic
- Implements exponential backoff (1s → 2s → 4s)
- Only retries on transient errors (timeouts, connection resets, rate limits)
- Logs retry attempts for debugging

**Retry logic:**
```
Attempt 1: Execute → Fail → Wait 1s
Attempt 2: Execute → Fail → Wait 2s  
Attempt 3: Execute → Fail → Wait 4s
Attempt 4: Execute → Success ✅ (or final failure)
```

**Transient errors detected:**
- `timeout`
- `ECONNRESET` (connection reset)
- `ETIMEDOUT` (connection timeout)
- `rate limit` (API rate limit)

**Benefits:**
- Handles temporary network issues
- Custom logging per operation
- Prevents cascading failures
- Smart error detection

## Implementation Details

### Whisper Transcription (Most Critical)

```typescript
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
  3,      // 3 retries
  2000,   // 2 second initial delay
  "Whisper transcription"
);
```

**Why it's critical:**
- Transcription is the slowest operation (can take 10+ minutes)
- Most likely to timeout with long audio
- No intermediate progress available
- Complete re-execution on retry

### Translation & TTS Formatting

```typescript
const translationResult = await retryWithBackoff(
  async () => { /* ... generateText ... */ },
  3,      // 3 retries
  1000,   // 1 second initial delay
  "Translation"
);
```

**Why it's important:**
- Text generation is fast but can hit rate limits
- Prevents loss of transcription work
- Relatively cheap to retry

### Audio Generation (TTS)

```typescript
const audioBuffer = await retryWithBackoff(
  async () => { /* ... TTS generation ... */ },
  2,      // 2 retries (fewer because faster)
  1000,   // 1 second initial delay
  "TTS audio generation"
);
```

**Why fewer retries:**
- TTS is fast (~10-30 seconds)
- Less prone to timeouts
- Can be chunked if needed

## Timeout Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                  Next.js Route Timeout                       │
│                   maxDuration: 15 min                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │         OpenAI Client Timeout: 10 min                  │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  Retry Logic with Exponential Backoff            │  │ │
│  │  │                                                   │  │ │
│  │  │  Attempt 1  →  Attempt 2  →  Attempt 3          │  │ │
│  │  │  (wait 1s)     (wait 2s)     (wait 4s)          │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Timing Examples

### Successful Processing (No Retries)

```
Audio: 20-minute file, 24 MB

Step 1: Whisper transcription       → 8m 32s ✅
Step 2: Language detection          → 0.1s ✅
Step 3: Translation & adaptation    → 4.2s ✅
Step 4: TTS formatting              → 3.1s ✅
Step 5: Audio generation (chunked)  → 22.3s ✅

Total: ~9 minutes
```

### With One Retry (Network Hiccup)

```
Audio: 20-minute file, 24 MB

Step 1: Whisper transcription
   Attempt 1 → timeout after 10min ❌
   Wait 2s...
   Attempt 2 → 8m 45s ✅
   
Step 2-5: Normal ✅

Total: ~19 minutes (still under 15min route limit)
```

### Exceeding All Limits

```
Audio: 40-minute file, 48 MB

Step 1: Whisper transcription
   Attempt 1 → timeout after 10min ❌
   Wait 2s...
   Attempt 2 → timeout after 10min ❌
   Wait 4s...
   Attempt 3 → timeout after 10min ❌
   
FAIL: "Request timed out. The audio file may be too long."
Status: 504 (Gateway Timeout)
```

## Error Messages

The system provides helpful error messages based on error type:

### Timeout Error (504)
```json
{
  "error": "Request timed out. The audio file may be too long. Try a shorter audio file or split it into smaller segments."
}
```

### Rate Limit Error (429)
```json
{
  "error": "API rate limit exceeded. Please wait a moment and try again."
}
```

### Invalid Format Error (400)
```json
{
  "error": "Invalid audio file format. Please upload a valid audio file (MP3, WAV, M4A, OGG, etc.)"
}
```

### Generic Error (500)
```json
{
  "error": "Failed to process audio: [specific error message]"
}
```

## Console Logging

### Normal Processing

```bash
============================================================
🎬 Starting audio processing pipeline...
============================================================

📁 Input file: tutorial.mp3
📊 Size: 24.12 MB
🎵 Type: audio/mpeg

📝 Transcribing audio with Whisper...
   File: tutorial.mp3 (24.12 MB)
   ⏳ This may take several minutes for long audio files...
   ✅ Transcription completed in 512.3s

📄 Transcribed text preview: Hoy vamos a aprender sobre...
   Total length: 8543 characters

🌐 Detected language: Spanish 🇪🇸

🔄 Translating to English and adapting for narration...
   ✅ Translation completed in 4.2s

📝 Translated text preview: Today we're going to learn about...
   Length: 8321 characters

✨ Formatting text for optimal TTS pronunciation...
   ✅ TTS formatting completed in 3.1s

🎙️ TTS-formatted text preview: Today, we're going to learn...
   Length: Original 8321 → Formatted 8489 chars

🎵 Generating audio with TTS-1 (coral voice)...
   ⚠️ Text exceeds 4096 chars, splitting into chunks...
   📦 Generating 3 audio chunks in parallel...
   🎤 Processing chunk 1/3 (4012 chars)...
   🎤 Processing chunk 2/3 (3987 chars)...
   🎤 Processing chunk 3/3 (490 chars)...
   ✅ Combined 3 audio chunks successfully

🎉 Success! Generated audio: 18.34 MB
📥 Sending audio to client for download...
```

### With Retry

```bash
📝 Transcribing audio with Whisper...
   File: long-tutorial.mp3 (24.89 MB)
   ⏳ This may take several minutes for long audio files...
   
⚠️ Whisper transcription failed (attempt 1/3). Retrying in 2000ms...
Error: Request timed out.

   ✅ Transcription completed in 523.7s
```

## Best Practices

### For Users

1. **Keep audio under 25 MB**: Compression happens automatically, but smaller is faster
2. **Split very long audio**: Files > 30 minutes should be split into parts
3. **Wait patiently**: First transcription attempt can take 10+ minutes
4. **Check logs**: Terminal shows detailed progress

### For Developers

1. **Always wrap critical operations**: Use `retryWithBackoff` for API calls
2. **Set appropriate retry counts**: More retries for slow operations, fewer for fast ones
3. **Log timing information**: Helps identify bottlenecks
4. **Provide helpful error messages**: Guide users on what went wrong

## Configuration

### Adjusting Timeouts

**For longer audio files (30+ minutes), increase OpenAI client timeout:**

```typescript
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 20 * 60 * 1000, // 20 minutes
  maxRetries: 3,
});
```

**And increase Next.js route timeout:**

```typescript
export const maxDuration = 1800; // 30 minutes
```

⚠️ **Note**: Vercel serverless functions have a hard limit of **10 minutes** on hobby/pro plans, and **15 minutes** on enterprise. Adjust accordingly.

### Adjusting Retry Behavior

**More aggressive retries:**

```typescript
await retryWithBackoff(
  fn,
  5,      // 5 retries instead of 3
  500,    // Start with 500ms delay
  "operation"
);
```

**Less aggressive (for fast operations):**

```typescript
await retryWithBackoff(
  fn,
  1,      // Only 1 retry
  1000,   // 1 second delay
  "operation"
);
```

## Troubleshooting

### "Request timed out" after implementing fixes

**Possible causes:**
1. Audio is too long (> 30 minutes)
2. API is experiencing issues
3. Network is very slow

**Solutions:**
1. Split audio into smaller segments
2. Try again later
3. Check OpenAI status page

### Retries happening frequently

**Possible causes:**
1. Rate limit being hit
2. Network instability
3. OpenAI API degraded performance

**Solutions:**
1. Add delay between requests
2. Check network connection
3. Monitor OpenAI status

### Route timeout before completion

**Possible causes:**
1. `maxDuration` too short
2. Running on Vercel with hard limits
3. Multiple retries eating up time

**Solutions:**
1. Increase `maxDuration`
2. Upgrade Vercel plan (if applicable)
3. Reduce audio length

## Performance Metrics

### Whisper Transcription Times

| Audio Length | File Size | Typical Time | Max Time (with retries) |
|--------------|-----------|--------------|-------------------------|
| 5 minutes    | 5 MB      | 45-90s       | 3-5 min                 |
| 10 minutes   | 10 MB     | 90-180s      | 5-8 min                 |
| 20 minutes   | 20 MB     | 180-600s     | 10-15 min               |
| 30 minutes   | 25 MB     | 600-900s     | 15-20 min               |

### Translation & TTS Times

| Text Length | Translation | TTS Formatting | Audio Generation |
|-------------|-------------|----------------|------------------|
| 1000 chars  | 2-4s        | 1-2s           | 5-10s            |
| 5000 chars  | 3-6s        | 2-4s           | 10-20s           |
| 10000 chars | 4-8s        | 3-5s           | 20-40s (chunked) |

## Future Improvements

Potential enhancements:

1. **Progress streaming**: Send progress updates to client during processing
2. **Chunked transcription**: Split audio before sending to Whisper
3. **Caching**: Cache transcriptions to avoid re-processing
4. **Queue system**: Handle multiple uploads with job queue
5. **Adaptive timeout**: Calculate timeout based on file size
6. **Circuit breaker**: Temporarily stop retries if API is down

---

**Document Version**: 1.0  
**Last Updated**: October 30, 2025  
**Related Files**:
- `src/app/api/process-audio/route.ts` - Implementation
- `SETUP.md` - User guide

