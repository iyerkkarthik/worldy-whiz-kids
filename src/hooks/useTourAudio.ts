import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseTourAudioOptions {
  isMuted: boolean;
  speed?: number;
  volume?: number;
}

export const useTourAudio = ({ isMuted, speed = 1, volume = 1 }: UseTourAudioOptions) => {
  const [isNarrating, setIsNarrating] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true); // ElevenLabs is always supported
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioQueueRef = useRef<Array<{ text: string; onComplete?: () => void }>>([]);
  const isProcessingRef = useRef(false);
  const audioCacheRef = useRef<Map<string, string>>(new Map());

  const generateAudio = async (text: string): Promise<string> => {
    // Check cache first
    const cacheKey = `${text}_${speed}`;
    const cachedAudio = audioCacheRef.current.get(cacheKey);
    if (cachedAudio) {
      return cachedAudio;
    }

    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: {
          text,
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8,
            style: 0.0,
            use_speaker_boost: true
          }
        }
      });

      if (error) {
        console.error('Error generating audio:', error);
        throw new Error(error.message || 'Failed to generate audio');
      }

      if (!data?.audioContent) {
        throw new Error('No audio content received');
      }

      // Create audio URL from base64
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), c => c.charCodeAt(0))],
        { type: 'audio/mpeg' }
      );
      const audioUrl = URL.createObjectURL(audioBlob);

      // Cache the audio URL
      audioCacheRef.current.set(cacheKey, audioUrl);

      return audioUrl;
    } catch (error) {
      console.error('Error generating audio with ElevenLabs:', error);
      throw error;
    }
  };

  const processQueue = useCallback(async () => {
    if (isProcessingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;
    setIsNarrating(true);

    while (audioQueueRef.current.length > 0) {
      const { text, onComplete } = audioQueueRef.current.shift()!;

      if (isMuted) {
        // If muted, just call onComplete immediately
        onComplete?.();
        continue;
      }

      try {
        await new Promise<void>(async (resolve, reject) => {
          try {
            // Generate audio using ElevenLabs
            const audioUrl = await generateAudio(text);
            
            // Create and configure audio element
            const audio = new Audio(audioUrl);
            currentAudioRef.current = audio;
            
            // Configure audio settings
            audio.volume = volume;
            audio.playbackRate = speed;
            
            audio.onended = () => {
              currentAudioRef.current = null;
              onComplete?.();
              resolve();
            };

            audio.onerror = (error) => {
              console.error('Audio playback error:', error);
              currentAudioRef.current = null;
              onComplete?.();
              resolve();
            };

            // Start playback
            await audio.play();
          } catch (error) {
            console.error('Error processing audio:', error);
            onComplete?.();
            resolve();
          }
        });

        // Small delay between narrations for natural flow
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error('Error in audio queue processing:', error);
        // Continue with next item in queue
      }
    }

    setIsNarrating(false);
    isProcessingRef.current = false;
  }, [isMuted, speed, volume, generateAudio]);

  const queueNarration = useCallback((text: string, onComplete?: () => void) => {
    audioQueueRef.current.push({ text, onComplete });
    processQueue();
  }, [processQueue]);

  const startNarration = useCallback((text: string, onComplete?: () => void) => {
    // Clear existing queue and start fresh
    audioQueueRef.current = [];
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    queueNarration(text, onComplete);
  }, [queueNarration]);

  const stopNarration = useCallback(() => {
    audioQueueRef.current = [];
    isProcessingRef.current = false;
    setIsNarrating(false);
    
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, []);

  const pauseNarration = useCallback(() => {
    if (currentAudioRef.current && !currentAudioRef.current.paused) {
      currentAudioRef.current.pause();
    }
  }, []);

  const resumeNarration = useCallback(() => {
    if (currentAudioRef.current && currentAudioRef.current.paused) {
      currentAudioRef.current.play();
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