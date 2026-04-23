import React, { useState, useEffect, useRef } from "react";
import { db } from "../lib/db";
import type { InterviewSession, InterviewTurn } from "aimock-common";
import { geminiService } from "../lib/geminiService";
import { useAudioContext } from "../hooks/useAudioContext";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";

export const Interview: React.FC<{ id: string }> = ({ id }) => {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [input, setInput] = useState("");
  const [isAITyping, setIsAITyping] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [hintLoading, setHintLoading] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const startupRef = useRef(false);

  const { initAudio, decodeAudioData, decodeBase64 } = useAudioContext();
  const { speak, stop, voiceEnabled, setVoiceEnabled } = useSpeechSynthesis(
    initAudio,
    decodeAudioData,
    decodeBase64,
  );
  const { isRecording, toggleRecording, stopRecording } = useSpeechRecognition(
    (transcript) => {
      setInput((prev) => prev + (prev ? " " : "") + transcript);
    },
  );

  // --- Effects ---

  useEffect(() => {
    const fetchSession = async () => {
      const currentSession = await db.getSessionById(id);
      if (!currentSession) return;

      // Auto-heal sessions stuck in 'planned' state from previous DB ID errors
      if (
        currentSession.turns.length > 0 &&
        currentSession.status === "planned"
      ) {
        currentSession.status = "active";
        db.saveSession(currentSession).catch(console.error);
      }

      setSession(currentSession);
      setTimeLeft(currentSession.duration * 60);

      if (currentSession.turns.length === 0 && !startupRef.current) {
        startupRef.current = true;
        startInterview(currentSession);
      }
    };
    fetchSession();
  }, [id]);

  useEffect(() => {
    if (session?.status !== "active") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.status]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session?.turns, isAITyping]);

  // --- Handlers ---

  const generateTurnId = () => Math.random().toString(36).substring(2, 11);

  const startInterview = async (currentSession: InterviewSession) => {
    setIsAITyping(true);
    try {
      const conductorRes = await geminiService.getNextQuestion(currentSession);
      const firstTurn: InterviewTurn = {
        id: generateTurnId(),
        role: "ai",
        text: conductorRes.question,
        timestamp: Date.now(),
      };

      await speak(conductorRes.question);

      const updated = {
        ...currentSession,
        turns: [firstTurn],
        status: "active" as const,
      };
      setSession(updated);

      await db.saveSession({ ...currentSession, status: "active" });
      await db.addTurn(currentSession.id, firstTurn);
    } catch (err) {
      console.error("Failed to start interview:", err);
    } finally {
      setIsAITyping(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !session || isAITyping) return;
    if (isRecording) stopRecording();
    await initAudio();

    const userTurn: InterviewTurn = {
      id: generateTurnId(),
      role: "user",
      text: input.trim(),
      timestamp: Date.now(),
    };

    const updatedWithUser = { ...session, turns: [...session.turns, userTurn] };
    setSession(updatedWithUser);
    setInput("");
    setIsAITyping(true);

    try {
      const lastAIQuestion = session.turns
        .filter((t) => t.role === "ai")
        .slice(-1)[0]?.text;
      const evaluation = await geminiService.evaluateTurn(
        lastAIQuestion,
        userTurn.text,
      );

      const userTurnWithEval = { ...userTurn, evaluation };
      await db.addTurn(session.id, userTurnWithEval);

      const conductorRes = await geminiService.getNextQuestion(updatedWithUser);
      const aiTurn: InterviewTurn = {
        id: generateTurnId(),
        role: "ai",
        text: conductorRes.question,
        timestamp: Date.now(),
      };

      await speak(conductorRes.question);

      setSession((prev) =>
        prev ? { ...prev, turns: [...prev.turns, aiTurn] } : null,
      );
      await db.addTurn(session.id, aiTurn);
    } catch (err) {
      console.error("Failed to process user turn:", err);
    } finally {
      setIsAITyping(false);
    }
  };

  const handleHint = async () => {
    if (!session || isAITyping || hintLoading) return;
    await initAudio();
    setHintLoading(true);

    try {
      const lastAIQuestion = session.turns
        .filter((t) => t.role === "ai")
        .slice(-1)[0]?.text;
      const conversationContext = session.turns
        .map((t) => `${t.role}: ${t.text}`)
        .join("\n");
      const hint = await geminiService.getHint(
        lastAIQuestion,
        conversationContext,
      );

      const hintTurn: InterviewTurn = {
        id: generateTurnId(),
        role: "ai",
        text: `💡 Hint: ${hint}`,
        timestamp: Date.now(),
      };

      await speak(hint);

      setSession((prev) =>
        prev ? { ...prev, turns: [...prev.turns, hintTurn] } : null,
      );
      await db.addTurn(session.id, hintTurn);
    } catch (err) {
      console.error("Failed to get hint:", err);
    } finally {
      setHintLoading(false);
    }
  };

  const endInterview = async (currentSession: InterviewSession) => {
    setIsAITyping(true);
    try {
      // Stop any ongoing audio
      stop();

      const finalUpdate = { ...currentSession, status: "completed" as const };
      const reportData = await geminiService.generateFinalReport(finalUpdate);

      await db.saveReport({ sessionId: id, ...reportData });
      await db.saveSession(finalUpdate);

      window.location.hash = `#/report/${id}`;
    } catch (err) {
      console.error("Failed to end interview:", err);
      alert("Failed to generate report.");
    } finally {
      setIsAITyping(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!session)
    return <div className="p-20 text-center">Loading session...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
            <i className="fa-solid fa-user-tie"></i>
          </div>
          <div>
            <h2 className="font-bold text-sm">Interviewer: AI Expert</h2>
            <p className="text-xs text-slate-400">
              {session.companyName} Pack Loaded
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${timeLeft < 300 ? "bg-red-500/10 border-red-500/50 text-red-400" : "bg-slate-800 border-slate-700 text-slate-300"}`}
          >
            <i className="fa-regular fa-clock"></i>
            <span className="font-mono font-bold text-sm">
              {formatTime(timeLeft)}
            </span>
          </div>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${voiceEnabled ? "bg-indigo-600/20 text-indigo-400" : "bg-slate-800 text-slate-500"}`}
          >
            <i
              className={`fa-solid ${voiceEnabled ? "fa-volume-high" : "fa-volume-xmark"}`}
            ></i>
          </button>
          <button
            onClick={handleHint}
            disabled={hintLoading || isAITyping}
            className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center hover:bg-amber-500/20 transition-colors disabled:opacity-50"
          >
            {hintLoading ? (
              <i className="fa-solid fa-circle-notch fa-spin"></i>
            ) : (
              <i className="fa-solid fa-lightbulb"></i>
            )}
          </button>
          <button
            onClick={() => endInterview(session)}
            className="text-xs bg-red-500/10 text-red-400 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20"
          >
            End Interview
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-slate-50/50">
        {session.turns.map((turn) => (
          <div
            key={turn.id}
            className={`flex ${turn.role === "ai" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${turn.role === "ai" ? (turn.text.startsWith("💡") ? "bg-amber-50 text-amber-900 border border-amber-100 italic" : "bg-white text-slate-800 border border-slate-100 rounded-tl-none") : "bg-indigo-600 text-white rounded-tr-none"}`}
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
                {turn.text}
              </p>
            </div>
          </div>
        ))}
        {isAITyping && (
          <div className="flex justify-start">
            <div className="bg-white px-5 py-4 shadow-sm rounded-2xl flex space-x-1.5 items-center h-[52px]">
              <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              ></div>
              <div
                className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              ></div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2 max-w-3xl mx-auto items-end">
          <button
            onClick={() => toggleRecording(initAudio)}
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRecording ? "bg-red-500 text-white animate-pulse" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
          >
            <i
              className={`fa-solid ${isRecording ? "fa-microphone-slash" : "fa-microphone"}`}
            ></i>
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" &&
              !e.shiftKey &&
              (e.preventDefault(), handleSend())
            }
            placeholder={isRecording ? "Listening..." : "Type or speak..."}
            className="flex-1 p-3 border border-slate-200 rounded-xl outline-none resize-none overflow-y-auto max-h-40"
            style={{ height: "48px" }}
            ref={(el) => {
              if (el) {
                el.style.height = "48px";
                el.style.height = el.scrollHeight + "px";
              }
            }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "48px";
              t.style.height = t.scrollHeight + "px";
            }}
            rows={1}
          />
          <button
            disabled={!input.trim() || isAITyping}
            onClick={handleSend}
            className="bg-indigo-600 text-white w-12 h-12 rounded-xl shadow-lg flex items-center justify-center disabled:opacity-50"
          >
            <i className="fa-solid fa-paper-plane"></i>
          </button>
        </div>
      </div>
    </div>
  );
};