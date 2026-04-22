import { useRef } from 'react';

export const useAudioContext = () => {
    const audioContextRef = useRef<AudioContext | null>(null);

    const initAudio = async () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }
        return audioContextRef.current;
    };

    const decodeAudioData = async (data: Uint8Array, ctx: AudioContext): Promise<AudioBuffer> => {
        return await ctx.decodeAudioData(data.buffer);
    }

    const decodeBase64 = (base64: string) => {
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    return { initAudio, audioContextRef, decodeAudioData, decodeBase64 };
};
