# Audio Translation App 🎙️

A Next.js application that transcribes audio files, translates them between Spanish and English, and generates new audio in the target language using AI.

## ✨ Features

- 🎵 **Universal Audio Support**: Accepts all common audio formats (MP3, WAV, M4A, OGG, etc.)
- 🗜️ **Automatic Compression**: Handles files of ANY size with intelligent client-side compression
- 🌐 **Bidirectional Translation**: Spanish ↔ English (auto-detected)
- 🎯 **Drag & Drop Interface**: Modern, intuitive UI built with shadcn/ui
- 🤖 **AI-Powered Pipeline**:
  - Transcription with Whisper-1
  - Translation & adaptation with GPT-4o-mini
  - Text-to-speech with TTS-1 (coral voice)
- ⚡ **Smart Processing**: Files >25MB compressed automatically using Web Audio API
- ⬇️ **Instant Download**: Processed audio downloads automatically

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   
   Create a `.env.local` file:
   ```bash
   OPENAI_API_KEY=your-openai-api-key-here
   ```

3. **Run the development server:**
   ```bash
   pnpm dev
   ```

4. **Open [http://localhost:3000](http://localhost:3000)**

## 📖 Full Documentation

- **[SETUP.md](./SETUP.md)** - Setup instructions and troubleshooting
- **[NARRATION-PROMPT-GUIDE.md](./NARRATION-PROMPT-GUIDE.md)** - Customize AI narration style and tone
- **[TTS-FORMATTING-PIPELINE.md](./TTS-FORMATTING-PIPELINE.md)** - Two-stage processing for optimal TTS
- **[TIMEOUT-AND-RETRY-GUIDE.md](./TIMEOUT-AND-RETRY-GUIDE.md)** - Handling long audio and timeouts
- **[COMPRESSION-SOLUTION.md](./COMPRESSION-SOLUTION.md)** - Technical details on audio compression

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **AI SDK**: Vercel AI SDK + OpenAI
- **Language**: TypeScript

## 📝 License

MIT
