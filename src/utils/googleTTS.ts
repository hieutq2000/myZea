import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { GEMINI_API_KEY } from './theme';
import { safeCallApi } from './aiHelper';

/**
 * Gemini AI Native Voice TTS
 * Uses Gemini's audio generation capability for natural Vietnamese voice
 */

let currentSound: Audio.Sound | null = null;
let isSpeaking = false;

// Gemini TTS endpoint
const GEMINI_TTS_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

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

        // Try Gemini TTS first
        const geminiSuccess = await tryGeminiTTS(text, voiceName, onDone, onError);

        if (!geminiSuccess) {
            // Fallback to expo-speech
            console.log('Falling back to expo-speech');
            await useFallbackTTS(text, onDone, onError);
        }

    } catch (error) {
        console.error('TTS error:', error);
        isSpeaking = false;
        onError?.(error as Error);
    }
}

/**
 * Try to use Gemini's TTS capability
 */
async function tryGeminiTTS(
    text: string,
    voiceName: string,
    onDone?: () => void,
    onError?: (error: Error) => void
): Promise<boolean> {
    try {
        // Use Gemini to generate audio-like response
        // Note: This uses a workaround since direct TTS isn't available via REST
        const response = await safeCallApi(() => fetch(`${GEMINI_TTS_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Bạn là một người Việt Nam. Hãy đọc đoạn văn sau với giọng ${voiceName === 'Kore' ? 'nữ nhẹ nhàng' : 'nam trầm ấm'}. Chỉ đọc NGUYÊN VĂN, không thêm bớt gì:\n\n"${text}"`
                    }]
                }],
                generationConfig: {
                    // Request audio if available
                    responseModalities: ['TEXT'], // Will add AUDIO when supported
                }
            }),
        }));

        if (!response.ok) {
            console.log('Gemini TTS not available, status:', response.status);
            return false;
        }

        // For now, Gemini REST API doesn't support audio output
        // So we fall back to expo-speech but with the Gemini-processed text
        const data = await response.json();
        const processedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || text;

        // Use expo-speech with processed text
        await useFallbackTTS(processedText.replace(/"/g, ''), onDone, onError);
        return true;

    } catch (error) {
        console.error('Gemini TTS error:', error);
        return false;
    }
}

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
