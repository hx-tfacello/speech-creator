# Audio Translation App - Setup Guide

## Prerequisites

- Node.js 18+ installed
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure environment variables:**
   
   Create a `.env.local` file in the root directory:
   ```bash
   OPENAI_API_KEY=your-openai-api-key-here
   ```
   
   Replace `your-openai-api-key-here` with your actual OpenAI API key.

## Running the App

1. **Start the development server:**
   ```bash
   pnpm dev
   ```
   
2. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Drag and drop an audio file (or click to browse)
2. Supported formats: MP3, WAV, M4A, OGG, and more
3. **No file size limits!** Files >25MB are automatically compressed
4. Click "Process & Download"
5. The app will:
   - **Compress** audio if larger than 25MB (client-side, using Web Audio API)
   - Transcribe your audio (Spanish or English)
   - Translate it to the opposite language
   - Adapt the text for natural narration
   - Generate new audio with TTS
   - Automatically download the result

### Automatic Compression

- **Large files (>25MB)** are automatically compressed in your browser before upload
- Uses **Web Audio API** to reduce sample rate (16kHz for speech) and convert to mono
- **No quality loss for speech**: 16kHz is optimal for voice/speech processing
- **Fast & efficient**: Compression happens client-side (no server resources used)
- **Progress indicator**: Shows "Compressing audio..." during compression
- If compression isn't enough, sample rate is reduced to 8kHz (still excellent for speech)
- **Preserves original audio**: Original file remains untouched on your device

## Translation Directions

- **Spanish → English**: Audio in Spanish gets translated to English
- **English → Spanish**: Audio in English gets translated to Spanish

The app automatically detects the source language using Whisper.

## Models Used

- **Transcription**: Whisper-1
- **Translation/Adaptation**: GPT-4o-mini with customizable narration prompts
- **Text-to-Speech**: TTS-1 with "coral" voice

## Customizing Narration Style

The app uses an **AI system prompt** to adapt translations for narration. You can customize the tone, formality, and style:

### Quick Style Change

Edit `src/lib/narration-prompts.ts` and change the default export:

```typescript
// Choose from:
export const DEFAULT_NARRATION_PROMPT = FRIENDLY_EDUCATIONAL_PROMPT;  // Current
// export const DEFAULT_NARRATION_PROMPT = TECHNICAL_PROFESSIONAL_PROMPT;
// export const DEFAULT_NARRATION_PROMPT = CONVERSATIONAL_CASUAL_PROMPT;
// export const DEFAULT_NARRATION_PROMPT = AUTHORITATIVE_EXPERT_PROMPT;
// export const DEFAULT_NARRATION_PROMPT = ENERGETIC_MOTIVATIONAL_PROMPT;
// export const DEFAULT_NARRATION_PROMPT = STORYTELLING_NARRATIVE_PROMPT;
```

### Available Styles

1. **Friendly Educational** *(default)*: Warm, professional, mentor-like
2. **Technical Professional**: Clear, direct, for developers
3. **Conversational Casual**: Relaxed, natural, podcast-style
4. **Authoritative Expert**: Formal, academic, scholarly
5. **Energetic Motivational**: Dynamic, encouraging, inspiring
6. **Storytelling Narrative**: Engaging, descriptive, story-driven

### Fine-tuning

For detailed customization, see **[NARRATION-PROMPT-GUIDE.md](./NARRATION-PROMPT-GUIDE.md)**

### After Changes

Restart the dev server:
```bash
pnpm dev
```

## Troubleshooting

### Common Issues

- **OpenAI API Key**: Make sure your API key is valid and has credits
- **Compression Fails**: Ensure browser supports Web Audio API (all modern browsers do)
- **Browser Console**: Check for detailed error messages in the browser console
- **Audio Format**: Ensure the audio file is in a supported format (MP3, WAV, M4A, OGG)
- **Server Logs**: Check terminal logs for detailed processing information
- **Network**: Ensure stable internet connection for API calls
- **Request Timeout**: Long audio (20+ min) may timeout - see "Request Timeout" section below

### Troubleshooting Steps

1. **Verify API Key**: Check that `.env.local` contains a valid OpenAI API key
2. **Modern Browser**: Use Chrome, Firefox, Edge, or Safari (latest versions)
3. **Clear Cache**: `rm -rf .next && pnpm dev`
4. **Reinstall**: `rm -rf node_modules pnpm-lock.yaml && pnpm install`

### Request Timeout Issues

**Symptoms:**
```
Error: Request timed out.
POST /api/process-audio 500 in 15.3min
```

**Why it happens:**
- Audio file is very long (20-30+ minutes)
- Whisper transcription takes longer than timeout limit
- Network is slow or unstable

**The system automatically:**
- ✅ Retries failed requests up to 3 times
- ✅ Uses exponential backoff (2s → 4s → 8s)
- ✅ Provides 10-minute timeout per request
- ✅ Allows 15 minutes total processing time

**Solutions:**

1. **Wait for automatic retry**: Watch terminal logs:
   ```bash
   ⚠️ Whisper transcription failed (attempt 1/3). Retrying in 2000ms...
   ```

2. **Split very long audio**: For audio > 30 minutes:
   - Process each segment separately
   - Combine results manually

3. **Monitor progress**: Terminal shows detailed timing:
   ```bash
   📝 Transcribing audio with Whisper...
      ⏳ This may take several minutes for long audio files...
      ✅ Transcription completed in 512.3s
   ```

**For detailed timeout configuration, see [TIMEOUT-AND-RETRY-GUIDE.md](./TIMEOUT-AND-RETRY-GUIDE.md)**

## Technical Details

### Compression Technology

**How it works:**
1. **Web Audio API** reads the original audio file in the browser
2. Decodes to raw audio buffer (supports all formats: MP3, WAV, M4A, OGG, etc.)
3. Creates an **OfflineAudioContext** with optimized settings:
   - **16kHz sample rate** (down from 44.1kHz or 48kHz)
   - **Mono channel** (down from stereo if applicable)
4. If still >25MB, applies more aggressive compression (8kHz)
5. Converts to WAV format (simple, lossless for 16-bit PCM)
6. Result: typically **60-80% size reduction** with no perceptible quality loss for speech

**Why it works for speech:**
- Human speech frequencies: 80Hz - 8kHz
- 16kHz sample rate captures up to 8kHz (Nyquist theorem) - perfect for speech
- Music typically needs 44.1kHz, but speech/podcasts/narration don't
- OpenAI Whisper is optimized for speech, not music

### Processing Times (approximate)
- **Compression** (client-side): 2-10 seconds (depending on file size)
- **5-minute audio**: 20-30 seconds
- **10-minute audio**: 30-60 seconds
- **20-minute audio**: 1-2 minutes
- **Large files (>25MB)**: Add 5-15 seconds for compression

Times depend on audio length, text complexity, API response times, and network speed.

### Pipeline Steps
1. **Compress** (if needed): Client-side compression using Web Audio API (~5-10s for large files)
2. **Upload**: Compressed file sent to API route (< 25MB)
3. **Transcribe**: Whisper-1 transcribes audio to text (~10-30s)
4. **Translate**: GPT-4o-mini translates and adapts text for narration (~5-10s)
5. **Format for TTS**: GPT-4o-mini formats text for optimal pronunciation and pacing (~3-5s)
6. **Generate Audio**: TTS-1 creates audio from formatted text (~10-20s)
7. **Download**: Browser downloads the final MP3

