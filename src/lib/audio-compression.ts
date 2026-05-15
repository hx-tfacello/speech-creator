/**
 * Client-side audio compression using Web Audio API
 * Reduces file size by lowering sample rate and converting to mono
 */

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function compressAudioIfNeeded(file: File): Promise<File> {
  // If file is already small enough, return as-is
  if (file.size <= MAX_FILE_SIZE) {
    console.log("File size OK:", (file.size / 1024 / 1024).toFixed(2), "MB");
    return file;
  }

  console.log(
    "File too large:",
    (file.size / 1024 / 1024).toFixed(2),
    "MB - compressing..."
  );

  try {
    // Create audio context
    const audioContext = new AudioContext();

    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();

    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    console.log("Original:", {
      channels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
      duration: audioBuffer.duration,
    });

    // Determine compression settings
    let targetSampleRate = 16000; // Start with 16kHz (good for speech)
    const targetChannels = 1; // Mono

    // Create offline context with lower sample rate and mono
    const offlineContext = new OfflineAudioContext(
      targetChannels,
      audioBuffer.duration * targetSampleRate,
      targetSampleRate
    );

    // Create buffer source
    const source = offlineContext.createBufferSource();
    source.buffer = audioBuffer;

    // Connect to destination
    source.connect(offlineContext.destination);
    source.start(0);

    // Render the audio
    const compressedBuffer = await offlineContext.startRendering();

    console.log("Compressed:", {
      channels: compressedBuffer.numberOfChannels,
      sampleRate: compressedBuffer.sampleRate,
      duration: compressedBuffer.duration,
    });

    // Convert to WAV format (simple, no encoding needed)
    const wavBlob = audioBufferToWav(compressedBuffer);

    // Check if compressed file is still too large
    if (wavBlob.size > MAX_FILE_SIZE) {
      // Try even more aggressive compression (8kHz)
      console.log("Still too large, trying 8kHz...");
      targetSampleRate = 8000;

      const offlineContext2 = new OfflineAudioContext(
        1,
        audioBuffer.duration * targetSampleRate,
        targetSampleRate
      );

      const source2 = offlineContext2.createBufferSource();
      source2.buffer = audioBuffer;
      source2.connect(offlineContext2.destination);
      source2.start(0);

      const compressedBuffer2 = await offlineContext2.startRendering();
      const wavBlob2 = audioBufferToWav(compressedBuffer2);

      const compressedFile = new File(
        [wavBlob2],
        file.name.replace(/\.[^.]+$/, "_compressed.wav"),
        { type: "audio/wav" }
      );

      console.log(
        "Final compressed size:",
        (compressedFile.size / 1024 / 1024).toFixed(2),
        "MB"
      );

      return compressedFile;
    }

    // Create new File object
    const compressedFile = new File(
      [wavBlob],
      file.name.replace(/\.[^.]+$/, "_compressed.wav"),
      { type: "audio/wav" }
    );

    console.log(
      "Compressed size:",
      (compressedFile.size / 1024 / 1024).toFixed(2),
      "MB"
    );
    console.log(
      "Reduction:",
      (((file.size - compressedFile.size) / file.size) * 100).toFixed(1),
      "%"
    );

    return compressedFile;
  } catch (error) {
    console.error("Compression failed:", error);
    // If compression fails, throw error to inform user
    throw new Error(
      "Failed to compress audio. Please try with a shorter audio file or compress it manually."
    );
  }
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;

  const data = interleave(buffer);
  const dataLength = data.length * bytesPerSample;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // Write WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write audio data
  floatTo16BitPCM(view, 44, data);

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function interleave(buffer: AudioBuffer): Float32Array {
  const numberOfChannels = buffer.numberOfChannels;
  const length = buffer.length * numberOfChannels;
  const result = new Float32Array(length);

  let offset = 0;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      result[offset++] = buffer.getChannelData(channel)[i];
    }
  }

  return result;
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function floatTo16BitPCM(
  view: DataView,
  offset: number,
  input: Float32Array
): void {
  for (let i = 0; i < input.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

