import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';

/**
 * Text-to-Speech using expo-speech
 * Optimized to NOT use Gemini API to save quota
 */

let currentSound: Audio.Sound | null = null;
let isSpeaking = false;

/**
 * Generate speech using Gemini AI's native voice
 */
export async function speakWithGoogleTTS(
    text: string,
    voiceName: string = 'Kore',
    onStart?: () => void,
    onDone?: () => void,
    onError?: (error: Error) => void
): Promise<void> {
    try {
        await stopTTS();

        isSpeaking = true;
        onStart?.();

        // OPTIMIZED: Skip Gemini API call - use expo-speech directly
        // This saves significant API quota since TTS doesn't need AI processing
        await useFallbackTTS(text, onDone, onError);

    } catch (error) {
        console.error('TTS error:', error);
        isSpeaking = false;
        onError?.(error as Error);
    }
}

/**
 * DISABLED: Gemini TTS was calling API unnecessarily
 * The API response was just text that we then passed to expo-speech anyway
 * This wasted API quota without providing any benefit
 */
// async function tryGeminiTTS(...) { ... }

/**
 * Fallback TTS using expo-speech
 */
async function useFallbackTTS(
    text: string,
    onDone?: () => void,
    onError?: (error: Error) => void
): Promise<void> {
    return new Promise((resolve) => {
        Speech.speak(text, {
            language: 'vi-VN',
            pitch: 1.0,
            rate: 0.85, // Slower for more natural sound
            onStart: () => {
                isSpeaking = true;
            },
            onDone: () => {
                isSpeaking = false;
                onDone?.();
                resolve();
            },
            onError: (error) => {
                isSpeaking = false;
                onError?.(new Error(String(error)));
                resolve();
            },
            onStopped: () => {
                isSpeaking = false;
                resolve();
            },
        });
    });
}

/**
 * Stop current TTS
 */
export async function stopTTS(): Promise<void> {
    try {
        isSpeaking = false;
        await Speech.stop();

        if (currentSound) {
            await currentSound.stopAsync();
            await currentSound.unloadAsync();
            currentSound = null;
        }
    } catch (error) {
        console.error('Error stopping TTS:', error);
    }
}

/**
 * Check if TTS is currently playing
 */
export function isTTSPlaying(): boolean {
    return isSpeaking;
}
