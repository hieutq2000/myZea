import { useState, useEffect, useCallback, useRef } from 'react';
import Voice, {
    SpeechResultsEvent,
    SpeechErrorEvent,
    SpeechStartEvent,
    SpeechEndEvent,
} from '@react-native-voice/voice';

export interface UseSpeechRecognitionResult {
    isListening: boolean;
    transcript: string;
    partialTranscript: string;
    error: string | null;
    startListening: () => Promise<void>;
    stopListening: () => Promise<void>;
    cancelListening: () => Promise<void>;
    isAvailable: boolean;
}

/**
 * Hook for continuous speech recognition
 * Automatically transcribes user's voice to text
 */
export function useSpeechRecognition(): UseSpeechRecognitionResult {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [partialTranscript, setPartialTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isAvailable, setIsAvailable] = useState(false);

    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Check if speech recognition is available
        Voice.isAvailable().then((available) => {
            setIsAvailable(!!available);
        }).catch(() => {
            setIsAvailable(false);
        });

        // Setup event handlers
        Voice.onSpeechStart = (e: SpeechStartEvent) => {
            console.log('Speech started');
            setIsListening(true);
            setError(null);
        };

        Voice.onSpeechEnd = (e: SpeechEndEvent) => {
            console.log('Speech ended');
            setIsListening(false);
        };

        Voice.onSpeechResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                const result = e.value[0];
                setTranscript(result);
                setPartialTranscript('');
                console.log('Final transcript:', result);
            }
        };

        Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
            if (e.value && e.value.length > 0) {
                setPartialTranscript(e.value[0]);
            }
        };

        Voice.onSpeechError = (e: SpeechErrorEvent) => {
            console.error('Speech error:', e.error);
            setError(e.error?.message || 'Speech recognition error');
            setIsListening(false);
        };

        // Cleanup
        return () => {
            Voice.destroy().then(Voice.removeAllListeners);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const startListening = useCallback(async () => {
        try {
            setError(null);
            setTranscript('');
            setPartialTranscript('');

            await Voice.start('vi-VN'); // Vietnamese language
            setIsListening(true);

            // Auto-stop after 60 seconds to prevent infinite listening
            timeoutRef.current = setTimeout(() => {
                stopListening();
            }, 60000);

        } catch (e) {
            console.error('Failed to start listening:', e);
            setError('Không thể bắt đầu nhận dạng giọng nói');
            setIsListening(false);
        }
    }, []);

    const stopListening = useCallback(async () => {
        try {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            await Voice.stop();
            setIsListening(false);
        } catch (e) {
            console.error('Failed to stop listening:', e);
        }
    }, []);

    const cancelListening = useCallback(async () => {
        try {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            await Voice.cancel();
            setIsListening(false);
            setTranscript('');
            setPartialTranscript('');
        } catch (e) {
            console.error('Failed to cancel listening:', e);
        }
    }, []);

    return {
        isListening,
        transcript,
        partialTranscript,
        error,
        startListening,
        stopListening,
        cancelListening,
        isAvailable,
    };
}

/**
 * Simple function to check if speech recognition is supported
 */
export async function isSpeechRecognitionAvailable(): Promise<boolean> {
    try {
        const available = await Voice.isAvailable();
        return !!available;
    } catch {
        return false;
    }
}
