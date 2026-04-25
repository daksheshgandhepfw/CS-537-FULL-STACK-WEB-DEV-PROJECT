import { useState, useRef, useEffect } from 'react';
import { geminiService } from '../lib/geminiService';

export const useSpeechSynthesis = (initAudio: () => Promise<AudioContext | null>, decodeAudioData: any, decodeBase64: any) => {
    const [voiceEnabled, setVoiceEnabled] = useState(true);
    const lastTextRef = useRef<string>('');

    // Use an object ref to keep track of the current source without causing re-renders
    const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);

    // Audio control effects
    useEffect(() => {
        if (!voiceEnabled) {
            stop();
        } else if (voiceEnabled && lastTextRef.current && !activeSourceRef.current) {
            // If we just unmuted and have a "pending" turn text, speak it.
            speak(lastTextRef.current);
        }
    }, [voiceEnabled]);

    const stop = () => {
        if (activeSourceRef.current) {
            try {
                activeSourceRef.current.stop();
                activeSourceRef.current.disconnect();
            } catch (e) {
                // Ignore if it was already stopped
            }
            activeSourceRef.current = null;
        }
    };

    const speak = async (text: string) => {
        // Always track the latest text requested, even if muted
        lastTextRef.current = text;

        if (!voiceEnabled) return;

        // Stop any currently playing audio before starting a new one
        stop();

        try {
            const ctx = await initAudio();
            if (!ctx) return;

            const base64 = await geminiService.generateSpeech(text);
            if (base64) {
                const audioBuffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);

                activeSourceRef.current = source;

                source.start(0);
                source.onended = () => {
                    if (activeSourceRef.current === source) {
                        activeSourceRef.current = null;
                    }
                };
            }
        } catch (e) {
            console.warn('TTS output blocked or failed', e);
        }
    };

    return { speak, stop, voiceEnabled, setVoiceEnabled };
};
