"use client";

import { useState, useRef, DragEvent } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { compressAudioIfNeeded } from "@/lib/audio-compression";

export default function AudioUploadClient() {
  const [file, setFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);
    setSuccess(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type.startsWith("audio/")) {
        setOriginalFile(droppedFile);
        setFile(droppedFile);
      } else {
        setError("Please upload a valid audio file.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccess(false);
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith("audio/")) {
        setOriginalFile(selectedFile);
        setFile(selectedFile);
      } else {
        setError("Please upload a valid audio file.");
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please select an audio file first.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    setSuccess(false);

    try {
      // Step 1: Compress audio if needed (client-side)
      setIsCompressing(true);
      const processedFile = await compressAudioIfNeeded(file);
      setIsCompressing(false);

      // Step 2: Send to API
      const formData = new FormData();
      formData.append("audio", processedFile);

      const response = await fetch("/api/process-audio", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process audio");
      }

      // Step 3: Download result
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const originalName = originalFile?.name || file.name;
      a.download = `translated-${originalName.replace(/\.[^/.]+$/, "")}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setSuccess(true);
      setFile(null);
      setOriginalFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsProcessing(false);
      setIsCompressing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Audio Translation</CardTitle>
          <CardDescription>
            Upload an audio file in Spanish or English. It will be transcribed, translated, and converted back to speech.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Drag and Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`
              border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all
              ${isDragging 
                ? "border-primary bg-primary/5 scale-[1.02]" 
                : "border-slate-300 dark:border-slate-700 hover:border-primary/50"
              }
              ${file ? "bg-primary/5" : ""}
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <div className="flex flex-col items-center gap-4">
              {file ? (
                <>
                  <CheckCircle2 className="w-12 h-12 text-primary" />
                  <div>
                    <p className="text-lg font-semibold">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <Upload className="w-12 h-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-semibold">
                      Drop your audio file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse (MP3, WAV, M4A, OGG, etc.)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">Audio processed and downloaded successfully!</p>
            </div>
          )}

          {/* Info Message for Large Files */}
          {file && file.size > 25 * 1024 * 1024 && (
            <div className="flex items-start gap-2 p-4 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Info className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold mb-1">Large file detected</p>
                <p>
                  Your file is {(file.size / 1024 / 1024).toFixed(1)}MB. It will be automatically compressed before processing to ensure compatibility with the API.
                </p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!file || isProcessing}
            className="w-full"
            size="lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isCompressing ? "Compressing audio..." : "Processing..."}
              </>
            ) : (
              "Process & Download"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

