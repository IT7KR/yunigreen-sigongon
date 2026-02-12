"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@sigongon/ui";

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  placeholder?: string;
  className?: string;
}

export function VoiceInput({
  onTranscript,
  placeholder = "음성 입력",
  className,
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSupported =
    typeof window !== "undefined" &&
    Boolean(
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition,
    );

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.lang = "ko-KR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsRecording(true);
      setError(null);
      setInterimText("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        setInterimText(interim);
      }

      if (final) {
        onTranscript(final);
        setInterimText("");
        setIsRecording(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      setInterimText("");

      switch (event.error) {
        case "no-speech":
          setError("음성이 감지되지 않았습니다");
          break;
        case "audio-capture":
          setError("마이크에 접근할 수 없습니다");
          break;
        case "not-allowed":
          setError("마이크 권한이 거부되었습니다");
          break;
        default:
          setError("음성 인식 오류가 발생했습니다");
      }
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText("");
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const toggleRecording = () => {
    if (!recognitionRef.current) return;

    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setError(null);
      recognitionRef.current.start();
    }
  };

  if (!isSupported) {
    return (
      <div className={className}>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled
          title="음성 입력을 지원하지 않는 브라우저입니다"
        >
          <MicOff className="h-4 w-4" />
        </Button>
        <p className="mt-1 text-xs text-red-500">
          음성 입력을 지원하지 않는 브라우저입니다
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      <Button
        type="button"
        variant={isRecording ? "destructive" : "secondary"}
        size="sm"
        onClick={toggleRecording}
        title={isRecording ? "녹음 중지" : placeholder}
      >
        {isRecording ? (
          <>
            <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-white" />
            <MicOff className="h-4 w-4" />
          </>
        ) : (
          <Mic className="h-4 w-4" />
        )}
      </Button>

      {interimText && (
        <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
          {interimText}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
