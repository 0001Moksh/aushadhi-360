import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceSearchOptions {
  onTranscript?: (text: string) => void;
  onError?: (error: string) => void;
  language?: string;
  autoOffDelay?: number; // Auto-off after this many ms of silence (default: 3000ms)
}

export function useVoiceSearch({
  onTranscript,
  onError,
  language = 'en-IN',
  autoOffDelay = 3000,
}: UseVoiceSearchOptions = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0); // Confidence score (0-100)
  const recognitionRef = useRef<any>(null);
  const shouldContinueRef = useRef(false);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastResultTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        const recognition = recognitionRef.current;

        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.language = language;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          console.log('Voice recognition started');
          setIsListening(true);
          setIsSpeaking(true);
        };

        recognition.onresult = (event: any) => {
          lastResultTimeRef.current = Date.now();
          
          // Clear previous timeout
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }

          let interimTranscript = '';
          let finalTranscript = '';
          let maxConfidence = 0;

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            const confidence = event.results[i][0].confidence || 0;

            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
              maxConfidence = Math.max(maxConfidence, confidence);
            } else {
              interimTranscript += transcript;
            }
          }

          const result = (finalTranscript || interimTranscript).trim();
          if (result) {
            console.log('Recognized:', result, `(${Math.round(maxConfidence * 100)}% confidence)`);
            setTranscript(result);
            setConfidence(Math.round(maxConfidence * 100));
            onTranscript?.(result);

            // Auto-off after detecting final result with delay
            if (finalTranscript.trim()) {
              silenceTimeoutRef.current = setTimeout(() => {
                if (shouldContinueRef.current) {
                  console.log('Auto-off: Silence detected after speech');
                  stopListening();
                }
              }, autoOffDelay);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.log('Recognition error:', event.error);
          
          // Silently ignore 'aborted' errors as they're normal
          if (event.error === 'aborted') {
            return;
          }
          
          // Auto-restart on 'no-speech' if should continue
          if (event.error === 'no-speech') {
            if (shouldContinueRef.current) {
              setTimeout(() => {
                if (shouldContinueRef.current && recognitionRef.current) {
                  try {
                    recognitionRef.current.start();
                  } catch (e) {
                    console.error('Failed to restart:', e);
                  }
                }
              }, 100);
            }
            return;
          }
          
          // Handle specific error types with user-friendly messages
          let errorMessage = '';
          switch (event.error) {
            case 'not-allowed':
            case 'permission-denied':
              errorMessage = 'Microphone permission denied. Please allow microphone access.';
              break;
            case 'network':
              errorMessage = 'Network error. Please check your connection.';
              break;
            case 'audio-capture':
              errorMessage = 'No microphone found. Please connect a microphone.';
              break;
            default:
              errorMessage = `Speech recognition error: ${event.error}`;
          }
          
          onError?.(errorMessage);
          setIsListening(false);
        };

        recognition.onend = () => {
          console.log('Recognition ended, shouldContinue:', shouldContinueRef.current);
          
          // Auto-restart if user still wants to listen
          if (shouldContinueRef.current) {
            setTimeout(() => {
              if (shouldContinueRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                } catch (e) {
                  console.error('Failed to restart:', e);
                  setIsListening(false);
                  setIsSpeaking(false);
                  shouldContinueRef.current = false;
                }
              }
            }, 100);
          } else {
            setIsListening(false);
            setIsSpeaking(false);
          }
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
      }
    };
  }, [language, onTranscript, onError, autoOffDelay]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        shouldContinueRef.current = true;
        lastResultTimeRef.current = Date.now();
        setTranscript('');
        setConfidence(0);
        
        // Clear any pending auto-off timeout
        if (silenceTimeoutRef.current) {
          clearTimeout(silenceTimeoutRef.current);
        }
        
        recognitionRef.current.start();
        console.log('Starting voice recognition...');
      } catch (error) {
        console.error('Start error:', error);
        onError?.('Failed to start speech recognition. Please check microphone permissions.');
      }
    }
  }, [isListening, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      shouldContinueRef.current = false;
      
      // Clear auto-off timeout
      if (silenceTimeoutRef.current) {
        clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = null;
      }
      
      recognitionRef.current.stop();
      console.log('Stopping voice recognition...');
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
  }, []);

  const isSupported = typeof window !== 'undefined' && 
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return {
    transcript,
    isListening,
    isSpeaking,
    confidence, // New: confidence score
    startListening,
    stopListening,
    resetTranscript,
    isSupported,
  };
}
