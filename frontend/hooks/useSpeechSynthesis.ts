import { useState } from 'react';
import { geminiService } from '../lib/geminiService';


export const useSpeechSynthesis = (initAudio: () => Promise<AudioContext | null>, decodeAudioData: any, decodeBase64: any) => {
    const [voiceEnabled, setVoiceEnabled] = useState(true);

    const speak = async (text: string) => {
        if (!voiceEnabled) return;
        try {
            const ctx = await initAudio();
            if (!ctx) return;
            const base64 = await geminiService.generateSpeech(text);
            if (base64) {
                const audioBuffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start(0);
            }
        } catch (e) {
            console.warn('TTS output blocked or failed', e);
        }
    };

    return { speak, voiceEnabled, setVoiceEnabled };
};
