import { useState, useEffect, useRef } from 'react';

export const useSpeechRecognition = (onTranscript: (transcript: string) => void) => {
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const rec = new SpeechRecognition();
            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';
            rec.onresult = (e: any) => {
                let transcript = '';
                for (let i = e.resultIndex; i < e.results.length; ++i) {
                    if (e.results[i].isFinal) transcript += e.results[i][0].transcript;
                }
                if (transcript) onTranscript(transcript);
            };
            rec.onend = () => setIsRecording(false);
            rec.onerror = () => setIsRecording(false);
            recognitionRef.current = rec;
        }
    }, [onTranscript]);

    const toggleRecording = (initAudio: () => Promise<AudioContext | null>) => {
        if (!recognitionRef.current) return;
        initAudio().then(() => {
            if (isRecording) {
                recognitionRef.current.stop();
            } else {
                try {
                    recognitionRef.current.start();
                    setIsRecording(true);
                } catch (e) {
                    console.error("Mic access denied or error", e);
                }
            }
        })

    };

    const stopRecording = () => {
        if (isRecording && recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }

    return { isRecording, toggleRecording, stopRecording };
};
