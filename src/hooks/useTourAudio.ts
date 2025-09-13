import { useState, useRef, useCallback, useEffect } from 'react';

interface UseTourAudioOptions {
  isMuted: boolean;
  speed?: number;
  volume?: number;
}

export const useTourAudio = ({ isMuted, speed = 1, volume = 1 }: UseTourAudioOptions) => {
  const [isNarrating, setIsNarrating] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioQueueRef = useRef<Array<{ text: string; onComplete?: () => void }>>([]);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      setIsSpeechSupported(true);
    }
  }, []);

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsNarrating(true);

    while (audioQueueRef.current.length > 0) {
      const { text, onComplete } = audioQueueRef.current.shift()!;

      if (isMuted || !synthRef.current) {
        // If muted, just call onComplete immediately
        onComplete?.();
        continue;
      }

      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        currentUtteranceRef.current = utterance;

        // Configure voice settings
        utterance.rate = speed;
        utterance.volume = volume;
        utterance.pitch = 1;

        // Try to use a pleasant voice
        const voices = synthRef.current!.getVoices();
        const preferredVoice = voices.find(voice => 
          voice.name.includes('Google') || 
          voice.name.includes('Microsoft') ||
          voice.default
        );
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        utterance.onend = () => {
          currentUtteranceRef.current = null;
          onComplete?.();
          resolve();
        };

        utterance.onerror = (error) => {
          console.error('Speech synthesis error:', error);
          currentUtteranceRef.current = null;
          onComplete?.();
          resolve();
        };

        synthRef.current!.speak(utterance);
      });

      // Small delay between narrations for natural flow
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsNarrating(false);
    isProcessingRef.current = false;
  }, [isMuted, speed, volume]);

  const queueNarration = useCallback((text: string, onComplete?: () => void) => {
    audioQueueRef.current.push({ text, onComplete });
    processQueue();
  }, [processQueue]);

  const startNarration = useCallback((text: string, onComplete?: () => void) => {
    // Clear existing queue and start fresh
    audioQueueRef.current = [];
    if (currentUtteranceRef.current && synthRef.current) {
      synthRef.current.cancel();
    }
    queueNarration(text, onComplete);
  }, [queueNarration]);

  const stopNarration = useCallback(() => {
    audioQueueRef.current = [];
    isProcessingRef.current = false;
    setIsNarrating(false);
    
    if (currentUtteranceRef.current && synthRef.current) {
      synthRef.current.cancel();
      currentUtteranceRef.current = null;
    }
  }, []);

  const pauseNarration = useCallback(() => {
    if (synthRef.current && synthRef.current.speaking) {
      synthRef.current.pause();
    }
  }, []);

  const resumeNarration = useCallback(() => {
    if (synthRef.current && synthRef.current.paused) {
      synthRef.current.resume();
    }
  }, []);

  return {
    isNarrating,
    isSpeechSupported,
    startNarration,
    stopNarration,
    pauseNarration,
    resumeNarration,
    queueNarration,
  };
};