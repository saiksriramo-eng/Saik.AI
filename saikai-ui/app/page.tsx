"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, Send, Terminal, Loader2, AlertCircle, MessageSquare, AlertTriangle, MicOff, Sparkles, Brain, Ear, Speech, ChevronRight, ArrowLeft, History, Layers, Siren, Download, User } from "lucide-react";
import { toast } from "sonner";
import { Space_Grotesk, Manrope } from "next/font/google";

// 🚀 PREMIUM TYPOGRAPHY INJECTION
const brandFont = Space_Grotesk({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const bodyFont = Manrope({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

// COMPREHENSIVE ASL & ISL DICTIONARY
const SIGN_DICTIONARY = {
  "Common": ["HELLO", "THANK YOU", "PLEASE", "YES", "NO", "HELP", "SORRY", "GOOD", "BAD", "OKAY"],
  "Pronouns": ["ME", "YOU", "HE", "SHE", "WE", "THEY", "MY", "YOUR", "THIS", "THAT"],
  "Questions": ["WHO", "WHAT", "WHERE", "WHEN", "WHY", "HOW", "HOW MUCH"],
  "Actions": ["WANT", "NEED", "GO", "COME", "STOP", "EAT", "DRINK", "SLEEP", "WORK", "PLAY", "HELP", "WAIT", "LOOK", "LISTEN", "MAKE"],
  "Feelings & Medical": ["HAPPY", "SAD", "ANGRY", "TIRED", "SICK", "PAIN", "HURT", "MEDICINE", "DOCTOR", "EMERGENCY", "HOSPITAL", "BATHROOM"],
  "Time": ["NOW", "LATER", "TODAY", "TOMORROW", "YESTERDAY", "MORNING", "NIGHT", "TIME", "DAY", "WEEK"],
  "People": ["FAMILY", "MOTHER", "FATHER", "FRIEND", "BABY", "TEACHER", "MAN", "WOMAN", "BOY", "GIRL"],
  "Food": ["WATER", "FOOD", "HUNGRY", "THIRSTY", "APPLE", "MILK", "BREAD", "RICE", "MEAT", "FINISHED"],
  "Places": ["HOME", "SCHOOL", "STORE", "WORK", "ROOM", "OUTSIDE", "INSIDE", "STREET"]
};

const ALL_SIGNS = Object.values(SIGN_DICTIONARY).flat();

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  const [authMode, setAuthMode] = useState("login");
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [appMode, setAppMode] = useState("Srotra");
  const [targetLang, setTargetLang] = useState("English");
  const [inputText, setInputText] = useState("");
  const [tokens, setTokens] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [signCategory, setSignCategory] = useState<string>("Common");
  const [signSearch, setSignSearch] = useState("");

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>("");

  const [criticalAlert, setCriticalAlert] = useState(false);
  const [displayedOutput, setDisplayedOutput] = useState("");

  const [serverHistory, setServerHistory] = useState<any[]>([]);
  const [sidebarFilter, setSidebarFilter] = useState<"All" | "Srotra" | "Mitram" | "Vadatibru">("All");

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const API_BASE = "http://127.0.0.1:8000";

  // 🚀 OPTIMIZED TYPEWRITER ENGINE (Prevents Browser Freezing)
  const runTypewriter = (text: string) => {
    const cleanText = (text || "").trim();
    setDisplayedOutput("");
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedOutput(cleanText.substring(0, i + 2)); // Chunks by 2 chars to halve re-renders
      i += 2;
      if (i >= cleanText.length) {
        setDisplayedOutput(cleanText);
        clearInterval(interval);
      }
    }, 25);
  };

  const getPredictions = () => {
    if (!inputText.trim()) return ["HELLO", "ME", "WANT", "HELP"];
    const currentTokens = inputText.match(/\[(.*?)\]/g) || [];
    if (currentTokens.length === 0) return ["HELLO", "ME", "WANT"];
    const lastToken = currentTokens[currentTokens.length - 1].replace(/\[|\]/g, "");

    const rules: Record<string, string[]> = {
      "ME": ["WANT", "NEED", "GO", "FEEL"],
      "WANT": ["FOOD", "WATER", "HELP", "SLEEP"],
      "NEED": ["DOCTOR", "BATHROOM", "MEDICINE", "HELP"],
      "GO": ["HOME", "SCHOOL", "HOSPITAL", "OUTSIDE"],
      "FEEL": ["HAPPY", "SAD", "SICK", "PAIN"],
      "HELLO": ["HOW", "ME", "FRIEND"],
      "HOW": ["MUCH", "YOU", "TIME"],
      "YES": ["PLEASE", "THANK YOU", "GOOD"],
      "NO": ["THANK YOU", "BAD", "SORRY"]
    };
    return rules[lastToken] || ["PLEASE", "THANK YOU", "YES"];
  };

  useEffect(() => {
    if (appMode === "Mitram") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory, appMode]);

  useEffect(() => {
    const el = document.getElementById("landing-scroll");
    if (!el) return;
    const handleScroll = () => setIsScrolled(el.scrollTop > 20);
    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isAuthenticated, showAuth]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        if (availableVoices.length > 0 && !selectedVoice) {
          const defaultVoice = availableVoices.find(v => v.name.includes("Google") || v.name.includes("Natural")) || availableVoices[0];
          setSelectedVoice(defaultVoice.name);
        }
      };
      window.speechSynthesis.onvoiceschanged = loadVoices;
      loadVoices();
    }
  }, []);

  const fetchUserHistory = async (userIdent: string) => {
    if (!userIdent) return;
    try {
      const res = await fetch(`${API_BASE}/api/history/${userIdent}`);
      const data = await res.json();
      if (res.ok && data.history) setServerHistory(data.history);
    } catch (err) { console.error("Error fetching history:", err); }
  };

  useEffect(() => {
    if (isAuthenticated && identity) fetchUserHistory(identity);
  }, [isAuthenticated, appMode]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setInputText(currentTranscript);
        };
        recognitionRef.current.onerror = () => {
          setIsListening(false);
          toast.error("Microphone access denied or interrupted.");
        };
      }
    }
  }, []);

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      toast.success("Voice capture complete.");
    } else {
      if (!recognitionRef.current) {
        toast.error("Your browser does not support Speech Recognition.");
        return;
      }
      setInputText("");
      recognitionRef.current.start();
      setIsListening(true);
      toast.info("Listening... Speak now.");
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const loadingToast = toast.loading("Verifying credentials...");
    setAuthLoading(true);

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      toast.success(authMode === "login" ? "System access granted." : "Registration successful.", { id: loadingToast });
      setIsAuthenticated(true);
      fetchUserHistory(identity);
    } catch (err: any) {
      toast.error(err.message, { id: loadingToast });
    } finally {
      setAuthLoading(false);
    }
  };

  const triggerSOS = async () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance("Emergency! I am non-verbal and need immediate assistance! Please help!");
      utterance.volume = 1;
      utterance.rate = 1.1;
      window.speechSynthesis.speak(utterance);
    }
    setCriticalAlert(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([1000, 500, 1000, 500, 1000]);
    }
    setTimeout(() => setCriticalAlert(false), 8000);
    toast.error("SOS BEACON ACTIVATED.", { duration: 5000 });
    
    try {
      await fetch(`${API_BASE}/api/parse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity: identity, text: "CRITICAL: SOS BEACON ACTIVATED BY USER.", target_lang: "English" })
      });
      fetchUserHistory(identity);
    } catch (err) { console.error(err); }
  };

  const handleExportHistory = () => {
    if (filteredHistory.length === 0) {
      toast.error("No records available to export.");
      return;
    }
    let textContent = `SaikAI Neural Record Export\nUser: ${identity}\nGenerated: ${new Date().toLocaleString()}\n\n--------------------------------------------------\n\n`;
    filteredHistory.forEach(item => {
      textContent += `[${item.app_mode.toUpperCase()}] - ${new Date(item.created_at).toLocaleString()}\nInput: ${item.user_input}\n`;
      let outputStr = item.app_mode === "Srotra" ? item.ai_output.map((t: any) => `${t.text} (Urgency: ${t.urgency})`).join(", ") : (item.app_mode === "Vadatibru" ? item.ai_output.spoken : item.ai_output.reply) || "";
      textContent += `Output: ${outputStr}\n\n`;
    });
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SaikAI_Export_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Logs exported successfully.");
  };

  const handleSmartDispatch = async () => {
    // 🚀 FIXED: Always stop the microphone safely before proceeding
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    if (!inputText.trim()) {
      setIsLoading(false);
      return;
    }

    const cachedInput = inputText;
    setInputText(""); 
    setIsLoading(true);
    setDisplayedOutput("");

    if (appMode === "Mitram") {
      const extendedMessages = [...chatHistory, { role: "user", content: cachedInput }];
      setChatHistory(extendedMessages);
      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: identity, messages: extendedMessages })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Chat failed");
        
        const responseText = data.reply || "[Error: Invalid Neural Response]";
        const finalMessages = [...extendedMessages, { role: "assistant", content: "" }];
        setChatHistory(finalMessages);
        
        // 🚀 OPTIMIZED: Chunked typing prevents the UI from locking up
        let i = 0;
        const interval = setInterval(() => {
          setChatHistory(prev => {
            const updated = [...prev];
            updated[updated.length - 1].content = responseText.substring(0, i + 2);
            return updated;
          });
          i += 2;
          if (i >= responseText.length) {
            setChatHistory(prev => {
              const updated = [...prev];
              updated[updated.length - 1].content = responseText;
              return updated;
            });
            clearInterval(interval);
          }
        }, 20);

        fetchUserHistory(identity);
      } catch (err: any) { toast.error(err.message); } 
      finally { setIsLoading(false); }
      
    } else if (appMode === "Vadatibru") {
      const talkToast = toast.loading("Synthesizing Audio Output...");
      try {
        const res = await fetch(`${API_BASE}/api/vadatibru`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: identity, text: cachedInput, target_lang: targetLang })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Sign synthesis rejected");

        const synthesisText = data.spoken || "Synthesis missing.";

        if (typeof window !== "undefined" && window.speechSynthesis) {
          const utterance = new SpeechSynthesisUtterance(synthesisText);
          const voice = voices.find(v => v.name === selectedVoice);
          if (voice) utterance.voice = voice;
          window.speechSynthesis.speak(utterance);
        }
        
        setTokens([{ text: synthesisText, urgency: 1 }]);
        runTypewriter(synthesisText);
        toast.success("Broadcast complete.", { id: talkToast });
        fetchUserHistory(identity);
      } catch (err: any) { toast.error(err.message, { id: talkToast }); } 
      finally { setIsLoading(false); }

    } else {
      const compileToast = toast.loading(`Compiling Semantic Streams in ${targetLang}...`);
      try {
        const res = await fetch(`${API_BASE}/api/parse`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identity: identity, text: cachedInput, target_lang: targetLang })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Parsing rejected");
        setTokens(data.tokens);
        toast.success("Vectors extracted.", { id: compileToast });
        
        const hasCritical = data.tokens.some((t: any) => t.urgency === 3);
        if (hasCritical) {
          setCriticalAlert(true);
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([500, 200, 500, 200, 500]);
          }
          setTimeout(() => setCriticalAlert(false), 6000);
          toast.error("⚠️ CRITICAL AUDIO DETECTED", { duration: 6000 });
        }

        fetchUserHistory(identity);
      } catch (err: any) { toast.error(err.message, { id: compileToast }); } 
      finally { setIsLoading(false); }
    }
  };

  const filteredHistory = serverHistory.filter(item => sidebarFilter === "All" ? true : item.app_mode === sidebarFilter);

  // =========================================================================
  // VIEW 1: LANDING PAGE
  // =========================================================================
  if (!isAuthenticated && !showAuth) {
    return (
      <>
      <div className={`relative bg-[#050505] text-white selection:bg-blue-500/30 ${bodyFont.className}`} id="landing-scroll">
        <style dangerouslySetInnerHTML={{__html: `
          :root { --sapphire: #4A90D9; --sapphire-dark: #1B6CA8; --sapphire-glow: rgba(74,144,217,0.25); --sapphire-subtle: rgba(74,144,217,0.12); }
          html, body { overflow: hidden; margin: 0; padding: 0; height: 100%; }
          #landing-scroll { overflow-y: auto; overflow-x: hidden; height: 100vh; scrollbar-width: thin; scrollbar-color: rgba(74,144,217,0.4) transparent; }
          #landing-scroll::-webkit-scrollbar { width: 4px; }
          #landing-scroll::-webkit-scrollbar-track { background: transparent; }
          #landing-scroll::-webkit-scrollbar-thumb { background: rgba(74,144,217,0.4); border-radius: 99px; }
          #landing-scroll::-webkit-scrollbar-thumb:hover { background: rgba(74,144,217,0.72); }
          .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .text-sapphire { color: var(--sapphire); }
          .border-sapphire { border-color: var(--sapphire); }
          .glow-sapphire { box-shadow: 0 0 30px var(--sapphire-glow); }
        `}} />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[200px] pointer-events-none" style={{background: 'radial-gradient(circle, rgba(27,108,168,0.2) 0%, rgba(74,144,217,0.08) 100%)'}} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />



        <main className="relative z-10 flex flex-col items-center px-4 pt-40 pb-32 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="mb-8 gap-2.5 px-4 py-2">
          </div>
          <h1 className="text-6xl md:text-[7rem] lg:text-[9rem] font-medium tracking-tighter leading-[0.9] mb-10 mix-blend-plus-lighter">Hear it all.<br/><span className={`text-blue-400 italic font-bold tracking-normal ${brandFont.className}`}>Say anything.</span></h1>
          <p className="text-sm md:text-lg text-zinc-400 max-w-xl mx-auto mb-14 font-light leading-relaxed tracking-wide">The most advanced semantic decoder and conversational AI, built exclusively for the deaf, hard-of-hearing, and mute.</p>
          <button onClick={() => { setAuthMode("register"); setShowAuth(true); }} className="bg-white text-black px-12 py-5 rounded-full font-bold text-sm tracking-widest uppercase hover:scale-105 transition-all" style={{boxShadow:'0 0 40px rgba(255,255,255,0.12), 0 0 0 1px rgba(74,144,217,0.1)'}}>Begin Experience ↗</button>

          <div className="mt-32 relative w-full max-w-5xl mx-auto h-[350px] perspective-[1200px]">
            <div className="absolute left-[2%] md:left-[10%] top-16 w-[280px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl -rotate-3 hover:rotate-0 hover:-translate-y-4 transition-all duration-700 z-10">
              <div className="flex items-center gap-3 mb-6"><div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30"><Ear size={14} className="text-blue-400" /></div><span className={`text-xl font-bold text-white ${brandFont.className}`}>Srotra</span></div>
              <div className="space-y-3">
                <div className="bg-white/5 border border-white/5 text-zinc-300 text-xs p-3.5 rounded-xl font-medium tracking-wide">Analyzing environmental semantics...</div>
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3.5 rounded-xl font-bold flex items-center gap-2"><AlertCircle size={14}/> CRITICAL ALARM</div>
              </div>
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[340px] bg-[#050505]/80 backdrop-blur-3xl border border-white/20 rounded-2xl p-8 shadow-[0_0_80px_rgba(59,130,246,0.15)] z-30 hover:-translate-y-6 transition-transform duration-700">
              <div className="flex items-center gap-3 mb-8"><div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30"><Sparkles size={16} className="text-indigo-400" /></div><span className={`text-2xl font-bold text-white ${brandFont.className}`}>Mitram</span></div>
              <div className="space-y-4">
                <div className="bg-white/5 border border-white/10 text-zinc-300 text-[13px] p-4 rounded-2xl rounded-tr-none ml-auto w-[85%] font-medium tracking-wide">I feel overwhelmed today.</div>
                <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[13px] p-4 rounded-2xl rounded-tl-none w-[90%] font-medium tracking-wide leading-relaxed">I am here. Let's break it down step by step. What is the biggest thing on your mind?</div>
              </div>
            </div>
            <div className="absolute right-[2%] md:right-[10%] top-16 w-[280px] bg-[#0a0a0a]/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl rotate-3 hover:rotate-0 hover:-translate-y-4 transition-all duration-700 z-20">
              <div className="flex items-center gap-3 mb-6"><div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30"><Speech size={14} className="text-emerald-400" /></div><span className={`text-xl font-bold text-white ${brandFont.className}`}>Vadatibru</span></div>
              <div className="flex flex-wrap gap-2 mb-5"><span className="bg-white/5 border border-white/10 text-[10px] px-2.5 py-1.5 rounded-lg text-zinc-300 font-bold tracking-wide">[I]</span><span className="bg-white/5 border border-white/10 text-[10px] px-2.5 py-1.5 rounded-lg text-zinc-300 font-bold tracking-wide">[NEED]</span><span className="bg-emerald-500/10 border border-emerald-500/30 text-[10px] px-2.5 py-1.5 rounded-lg text-emerald-400 font-bold tracking-wide">+ [HELP]</span></div>
              <div className={`text-sm text-zinc-400 italic font-bold tracking-wide`}>"I need help."</div>
            </div>
          </div>
        </main>

        <section id="features" className="relative z-10 px-6 md:px-16 pb-32">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
              <h2 className={`text-4xl md:text-6xl font-medium tracking-tight text-white ${brandFont.className}`}>Built for clarity.<br/><span className="text-zinc-500">Designed for everyone.</span></h2>
              <p className="text-zinc-400 text-sm max-w-sm font-light leading-relaxed tracking-wide">Three core modules work together to bridge sound, sign, and speech — in real time, with zero compromise.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0a0a0a]/60 border border-white/10 rounded-2xl p-8 hover:border-blue-500/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-6"><Ear size={18} className="text-blue-400" /></div>
                <h3 className={`text-lg font-semibold text-white mb-2 ${brandFont.className}`}>Srotra</h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-light tracking-wide">Listens to the environment, extracts semantic meaning, and flags critical alerts the instant they happen.</p>
              </div>
              <div className="bg-[#0a0a0a]/60 border border-white/10 rounded-2xl p-8 hover:border-emerald-500/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6"><Speech size={18} className="text-emerald-400" /></div>
                <h3 className={`text-lg font-semibold text-white mb-2 ${brandFont.className}`}>Vadatibru</h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-light tracking-wide">Converts structured sign sequences into natural spoken language, instantly and intelligibly.</p>
              </div>
              <div className="bg-[#0a0a0a]/60 border border-white/10 rounded-2xl p-8 hover:border-indigo-500/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6"><Sparkles size={18} className="text-indigo-400" /></div>
                <h3 className={`text-lg font-semibold text-white mb-2 ${brandFont.className}`}>Mitram</h3>
                <p className="text-zinc-500 text-sm leading-relaxed font-light tracking-wide">A patient conversational partner for daily practice, emotional check-ins, and scenario rehearsal.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="relative z-10 px-6 md:px-16 pb-24 text-center">
          <div className="max-w-3xl mx-auto border-t border-white/5 pt-20">
            <h2 className={`text-3xl md:text-5xl font-medium tracking-tight text-white mb-8 ${brandFont.className}`}>Ready to be understood?</h2>
            <button onClick={() => { setAuthMode("register"); setShowAuth(true); }} className="bg-white text-black px-10 py-4 rounded-full font-bold text-xs tracking-[0.2em] uppercase hover:bg-blue-50 hover:scale-105 transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]">Begin Experience</button>
          </div>
        </section>
      </div>
      <nav className={`fixed top-0 left-0 w-full px-8 flex justify-between items-center z-50 transition-all duration-500 border-b ${isScrolled ? "py-5 bg-[#0a0a0a]/80 backdrop-blur-2xl border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.5)]" : "py-8 bg-transparent border-transparent"}`}>
          <a href="/" className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity">
            <img src="data:image/png;base64,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" alt="SaikAI" className="w-9 h-9 rounded-xl object-cover" style={{filter:'drop-shadow(0 0 8px rgba(74,144,217,0.5))'}} />
            <span className={`font-semibold text-2xl tracking-tight text-white ${brandFont.className}`}>Saik<span className="text-sapphire">.AI</span></span>
          </a>
          <div className="hidden md:flex items-center gap-10 text-[11px] uppercase tracking-[0.25em] font-semibold text-zinc-400">
             <a href="#features" className="hover:text-white transition-colors">Platform</a>
             <a href="#works" className="hover:text-white transition-colors">Modules</a>
             <a href="#" className="hover:text-white transition-colors">Philosophy</a>
          </div>
          <button onClick={() => { setAuthMode("login"); setShowAuth(true); }} className="text-[11px] uppercase tracking-[0.25em] font-semibold text-black bg-white px-6 py-3 rounded-full hover:bg-blue-50 transition-colors">Access ↗</button>
        </nav>
      </>
    );
  }

  // =========================================================================
  // VIEW 2: AUTHENTICATION
  // =========================================================================
  if (!isAuthenticated && showAuth) {
    return (
      <div className={`relative min-h-screen bg-[#050505] text-zinc-300 flex items-center justify-center p-4 ${bodyFont.className}`}>
        <style dangerouslySetInnerHTML={{__html: `
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}} />

        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:100px_100px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
        
        <button onClick={() => setShowAuth(false)} className="absolute top-8 left-8 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-500 hover:text-white transition-colors"><ArrowLeft size={14} /> Return</button>
        
        <div className="w-full max-w-md bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-10 shadow-2xl relative z-10">
          <a href="/" className="flex flex-col items-center mb-10 cursor-pointer hover:opacity-80 transition-opacity gap-3">
            <img src="data:image/png;base64,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" alt="SaikAI" className="w-16 h-16 rounded-2xl object-cover" style={{filter:'drop-shadow(0 0 16px rgba(74,144,217,0.6))'}} />
            <h1 className={`text-4xl font-semibold text-white ${brandFont.className}`}>Saik<span className="text-sapphire">.AI</span></h1>
          </a>

          <div className="flex gap-2 mb-8 p-1.5 bg-[#050505] rounded-xl border border-white/5">
            <button onClick={() => setAuthMode("login")} className={`flex-1 py-2.5 text-[11px] uppercase tracking-[0.15em] font-bold rounded-lg transition-all ${authMode === "login" ? "bg-white/10 text-white shadow-sm" : "text-zinc-500"}`}>Login</button>
            <button onClick={() => setAuthMode("register")} className={`flex-1 py-2.5 text-[11px] uppercase tracking-[0.15em] font-bold rounded-lg transition-all ${authMode === "register" ? "bg-white/10 text-white shadow-sm" : "text-zinc-500"}`}>Register</button>
          </div>
          <form onSubmit={handleAuth} className="space-y-5">
            <input type="text" value={identity} onChange={(e) => setIdentity(e.target.value)} placeholder="Identifier (Email / Phone)" className="w-full bg-[#050505] border border-white/10 rounded-xl px-5 py-4 text-sm text-white outline-none focus:border-blue-500/50 transition-colors placeholder:text-zinc-600 font-medium tracking-wide" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Passkey" className="w-full bg-[#050505] border border-white/10 rounded-xl px-5 py-4 text-sm text-white outline-none focus:border-blue-500/50 transition-colors placeholder:text-zinc-600 font-medium tracking-wide" />
            <button type="submit" className="w-full bg-white text-black font-bold uppercase tracking-widest text-xs rounded-xl py-4 mt-4 flex justify-center items-center gap-2 hover:bg-blue-50 transition-colors">{authLoading ? <Loader2 className="animate-spin" size={16}/> : "Authenticate ↗"}</button>
          </form>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: MAIN CORE APP
  // =========================================================================
  return (
    <div className={`h-screen w-full bg-[#050505] text-zinc-300 flex overflow-hidden ${bodyFont.className}`}>
      <style dangerouslySetInnerHTML={{__html: `
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.25); }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        :root { --sapphire: #4A90D9; --sapphire-dark: #1B6CA8; --sapphire-glow: rgba(74,144,217,0.25); --sapphire-subtle: rgba(74,144,217,0.12); }
        .text-sapphire { color: var(--sapphire) !important; }
        .border-sapphire { border-color: var(--sapphire) !important; }
        .bg-sapphire { background-color: var(--sapphire-dark) !important; }
        .glow-sapphire { box-shadow: 0 0 20px var(--sapphire-glow) !important; }
        .animate-in { animation: fadeIn 0.4s ease forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}} />

      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none z-0" />
      {criticalAlert && <div className="fixed inset-0 pointer-events-none border-[8px] border-red-600 animate-[pulse_1s_ease-in-out_infinite] z-[9999] shadow-[inset_0_0_150px_rgba(220,38,38,0.3)]" />}

      <button onClick={triggerSOS} className="fixed top-6 right-6 md:top-auto md:right-auto md:bottom-8 md:left-[280px] z-50 bg-red-600/10 hover:bg-red-600 border border-red-600/30 text-white rounded-full p-4 shadow-lg transition-all flex items-center justify-center group backdrop-blur-md">
        <Siren size={20} className="group-hover:scale-110 transition-transform text-red-500 group-hover:text-white" />
      </button>

      {/* SIDEBAR */}
      <aside className="w-[260px] border-r border-white/5 bg-[#050505]/90 backdrop-blur-xl hidden md:flex flex-col h-screen shrink-0 relative z-50">
        <a href="/" className="p-6 pb-5 flex items-center gap-3 shrink-0 border-b border-white/5 cursor-pointer hover:opacity-80 transition-opacity">
          <img src="data:image/png;base64,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" alt="SaikAI" className="w-8 h-8 rounded-lg object-cover" style={{filter:'drop-shadow(0 0 6px rgba(74,144,217,0.5))'}} />
          <span className={`font-semibold text-xl text-white tracking-tight ${brandFont.className}`}>Saik<span className="text-sapphire">.AI</span></span>
        </a>
        <div className="px-6 py-6 border-b border-white/5">
          <button className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/5 text-white rounded-lg text-xs font-bold tracking-wide transition-all">
             New Help-Chat <span className="text-zinc-500">↗</span>
          </button>
        </div>
        <div className="px-4 py-3 border-b border-white/5 shrink-0">
          <div className="flex gap-1.5">
            {(["All","Srotra","Mitram","Vadatibru"] as const).map(f => (
              <button key={f} onClick={() => setSidebarFilter(f)} className={`flex-1 py-1.5 rounded-lg text-[9px] uppercase tracking-widest font-bold transition-all ${sidebarFilter === f ? "bg-white/10 text-white" : "text-zinc-600 hover:text-zinc-400"}`}>{f === "All" ? "All" : f.slice(0,3)}</button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
          <div className="px-2 text-[9px] font-bold text-zinc-600 mb-3 uppercase tracking-[0.25em]">History</div>
          {filteredHistory.length === 0 ? (
            <div className="px-2 text-xs text-zinc-600 font-medium italic tracking-wide">No recorded sessions.</div>
          ) : (
            filteredHistory.map((item) => (
              <div key={item.id} className="group flex items-start gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg cursor-pointer transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${item.app_mode === "Srotra" ? "bg-[#4A90D9]" : item.app_mode === "Vadatibru" ? "bg-emerald-500" : "bg-indigo-500"}`} />
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[12px] text-zinc-400 group-hover:text-zinc-200 truncate font-medium tracking-wide">{item.user_input || "Audio Interface"}</span>
                  <span className="text-[10px] text-zinc-600 mt-0.5 font-medium">{new Date(item.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-6 border-t border-white/5 shrink-0 bg-[#0a0a0a]/50">
          <button onClick={handleExportHistory} className="w-full py-2.5 bg-transparent hover:bg-white/5 border border-white/10 text-zinc-400 hover:text-white rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-2 tracking-wide"><Download size={14} /> Export Identity Logs</button>
          <div className="mt-6 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-white/10 border border-white/5 flex items-center justify-center text-xs text-white font-serif italic">U</div>
               <span className="text-[11px] text-zinc-400 font-bold truncate w-20 tracking-wide">{identity}</span>
             </div>
             <button onClick={() => { setIsAuthenticated(false); setShowAuth(false); }} className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white font-bold transition-colors">Exit</button>
          </div>
        </div>
      </aside>

      {/* WORKSPACE AREA */}
      <div className="flex-1 relative bg-transparent z-10 flex flex-col h-screen overflow-hidden w-full">
        
        {/* 🚀 FIXED & GLASSY WORKSPACE HEADER */}
        <header className="absolute top-0 left-0 w-full h-20 flex items-center justify-between px-8 border-b border-white/10 bg-[#0a0a0a]/70 backdrop-blur-2xl z-40 shadow-sm">
           <div className="flex gap-6">
             <button onClick={() => { setAppMode("Srotra"); setTokens([]); }} className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-all flex flex-col gap-1.5 ${appMode === "Srotra" ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}>
               Srotra {appMode === "Srotra" && <div className="w-full h-0.5 bg-blue-500 rounded-full" />}
             </button>
             <button onClick={() => { setAppMode("Vadatibru"); setTokens([]); }} className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-all flex flex-col gap-1.5 ${appMode === "Vadatibru" ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}>
               Vadatibru {appMode === "Vadatibru" && <div className="w-full h-0.5 bg-emerald-500 rounded-full" />}
             </button>
             <button onClick={() => { setAppMode("Mitram"); }} className={`text-[11px] uppercase tracking-[0.2em] font-bold transition-all flex flex-col gap-1.5 ${appMode === "Mitram" ? "text-indigo-400" : "text-zinc-600 hover:text-zinc-400"}`}>
               Mitram {appMode === "Mitram" && <div className="w-full h-0.5 bg-indigo-500 rounded-full" />}
             </button>
           </div>
           <div className="hidden sm:flex items-center gap-2">
             {appMode === "Vadatibru" && voices.length > 0 && (
               <select value={selectedVoice} onChange={(e) => setSelectedVoice(e.target.value)} className="bg-transparent border border-white/10 text-[11px] text-zinc-400 rounded-lg px-2 py-1.5 outline-none focus:border-white/30 transition-all cursor-pointer max-w-[120px] truncate" title="Select voice">
                 {voices.slice(0,10).map(v => <option key={v.name} value={v.name}>{v.name.split(' ')[0]}</option>)}
               </select>
             )}
             <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="bg-transparent border border-white/10 text-[11px] uppercase tracking-widest font-bold text-zinc-400 rounded-lg px-3 py-1.5 outline-none focus:border-white/30 transition-all cursor-pointer">
               <option value="English">EN</option><option value="Spanish">ES</option><option value="French">FR</option><option value="Hindi">HI</option><option value="Telugu">TE</option>
             </select>
           </div>
        </header>

        {/* 🚀 SCROLLABLE CONTENT */}
        <div className="w-full h-full overflow-y-auto flex flex-col pt-20 pb-48 custom-scrollbar">
           
           {tokens.length === 0 && appMode === "Srotra" && (
             <div className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-12 animate-in fade-in">
               <div className="w-16 h-16 bg-[#4A90D9]/10 rounded-full flex items-center justify-center mb-6 border border-[#4A90D9]/20" style={{boxShadow:'0 0 40px rgba(74,144,217,0.1)'}}>
                 <Ear className="text-[#4A90D9]" size={28} />
               </div>
               <h2 className={`text-3xl font-bold text-white mb-3 tracking-tight ${brandFont.className}`}>Srotra is listening.</h2>
               <p className="text-zinc-600 text-sm max-w-xs font-medium tracking-wide leading-relaxed">Speak into the mic or paste text to decode your environment's semantic stream.</p>
               <div className="mt-8 flex gap-3">
                 {["Fire alarm detected", "Someone calling my name", "Door knock"].map(ex => (
                   <button key={ex} onClick={() => setInputText(ex)} className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-white/10 transition-all font-medium tracking-wide">{ex}</button>
                 ))}
               </div>
             </div>
           )}

           {chatHistory.length === 0 && appMode === "Mitram" && (
             <div className="flex-1 flex flex-col items-center justify-center text-center px-4 mt-20 animate-in fade-in">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-8 border border-white/10 shadow-[0_0_50px_rgba(99,102,241,0.1)]">
                  <Sparkles className="text-indigo-400" size={32} />
                </div>
                <h2 className={`text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight ${brandFont.className}`}>How can I help you?</h2>
                <p className="text-zinc-500 text-sm max-w-md font-medium tracking-wide leading-relaxed">SaikAI Mitram is active. Provide input below to begin structural analysis.</p>
             </div>
           )}

           {appMode === "Srotra" && tokens.length > 0 && (
             <div className="w-full flex justify-center py-10 animate-in fade-in">
                <div className="w-full max-w-3xl flex flex-col gap-6 px-6">
                   <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                     <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20"><Ear size={18} className="text-blue-400"/></div>
                     <span className={`text-2xl font-bold text-white tracking-wide ${brandFont.className}`}>Semantic Extraction</span>
                   </div>
                   <div className="flex flex-wrap gap-3">
                      {tokens.map((t, idx) => (
                        <div key={idx} className={`flex items-center gap-2 px-4 py-2 border rounded-xl font-bold text-sm tracking-wide transition-all ${t.urgency === 3 ? "border-red-500/30 text-red-400 bg-red-500/10 shadow-[0_0_20px_rgba(220,38,38,0.2)]" : t.urgency === 2 ? "border-amber-500/30 text-amber-400 bg-amber-500/10" : "border-white/10 text-zinc-300 bg-white/5"}`}>
                          {t.text}
                        </div>
                      ))}
                   </div>
                </div>
             </div>
           )}

           {appMode === "Vadatibru" && (
             <div className="w-full flex justify-center py-10 animate-in fade-in">
               <div className="w-full max-w-3xl px-6">
                  <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 shadow-2xl flex flex-col h-[55vh] min-h-[450px]">
                     <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6 shrink-0">
                        <div className="flex items-center gap-4"><Speech className="text-emerald-400" size={24} /><h3 className={`text-2xl font-bold tracking-wide text-white ${brandFont.className}`}>ASL Lexicon</h3></div>
                        <input type="text" value={signSearch} onChange={(e) => setSignSearch(e.target.value.toUpperCase())} placeholder="Search signs..." className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-emerald-500/50 w-56 transition-all font-medium tracking-wide" />
                     </div>
                     {!signSearch && (
                        <div className="flex flex-wrap gap-2.5 mb-6 shrink-0">
                           {Object.keys(SIGN_DICTIONARY).map((cat) => (
                              <button key={cat} onClick={() => setSignCategory(cat)} className={`px-4 py-2 rounded-full text-[10px] uppercase tracking-widest font-bold transition-all ${signCategory === cat ? "bg-white text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300 bg-white/5 hover:bg-white/10"}`}>
                                {cat}
                              </button>
                           ))}
                        </div>
                     )}
                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4">
                           {(signSearch ? ALL_SIGNS.filter(s => s.includes(signSearch)) : SIGN_DICTIONARY[signCategory as keyof typeof SIGN_DICTIONARY]).map((token) => (
                              <button key={token} onClick={() => setInputText((prev) => prev ? `${prev} [${token}]` : `[${token}]`)} className="py-4 px-3 border border-white/5 bg-[#050505] hover:bg-emerald-500/10 hover:border-emerald-500/40 rounded-2xl text-[13px] font-bold tracking-wider text-zinc-300 hover:text-emerald-400 transition-all shadow-sm">
                                {token}
                              </button>
                           ))}
                        </div>
                     </div>
                  </div>
                  
                  {tokens.length > 0 && (
                     <div className="mt-6 bg-[#0a0a0a]/80 backdrop-blur-xl border border-emerald-500/20 rounded-[2rem] p-8 flex gap-6 shadow-[0_0_40px_rgba(16,185,129,0.05)]">
                        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/30"><Speech size={20} className="text-emerald-400"/></div>
                        <div className="pt-2">
                           <div className={`text-xl text-white leading-relaxed font-medium tracking-wide after:content-['|'] after:animate-pulse after:text-emerald-500 ${brandFont.className}`}>"{displayedOutput}"</div>
                        </div>
                     </div>
                  )}
               </div>
             </div>
           )}

           {appMode === "Mitram" && chatHistory.length > 0 && (
             <div className="w-full max-w-4xl mx-auto py-8 px-4 sm:px-6 space-y-8">
               {chatHistory.map((msg, idx) => (
                 <div key={idx} className={`w-full flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in fade-in`}>
                    <div className={`flex gap-4 max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                       <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${msg.role === "user" ? "bg-white/5 border-white/10 text-zinc-400 shadow-lg" : "bg-indigo-500/10 border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]"}`}>
                          {msg.role === "user" ? <User size={18} /> : <Sparkles size={18} />}
                       </div>
                       <div className={`p-5 rounded-2xl text-[15px] leading-[1.8] font-medium tracking-wide whitespace-pre-wrap shadow-lg ${msg.role === "user" ? "bg-white/10 text-white rounded-tr-none border border-white/10" : "bg-[#0a0a0a]/80 backdrop-blur-md text-zinc-300 rounded-tl-none border border-white/5"}`}>
                          {msg.content}
                       </div>
                    </div>
                 </div>
               ))}
               {isLoading && (
                 <div className="w-full flex justify-start animate-in fade-in">
                    <div className="flex gap-4 max-w-[85%] md:max-w-[75%]">
                       <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.15)]"><Sparkles size={18} className="text-indigo-400 animate-pulse"/></div>
                       <div className="p-5 rounded-2xl bg-[#0a0a0a]/80 backdrop-blur-md text-zinc-300 rounded-tl-none border border-white/5 flex items-center gap-2 shadow-lg">
                          <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                       </div>
                    </div>
                 </div>
               )}
             </div>
           )}
           <div ref={chatEndRef} />
        </div>

        {/* INPUT */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-[#050505] via-[#050505]/90 to-transparent pt-16 pb-8 px-6 z-20 pointer-events-none">
          <div className="w-full max-w-3xl mx-auto pointer-events-auto flex flex-col gap-4">
             <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                {appMode === "Mitram" && ["Summarize", "I feel overwhelmed", "Practice scenario"].map(qr => (
                   <button key={qr} onClick={() => setInputText(qr)} className="px-5 py-2.5 bg-[#0a0a0a]/80 backdrop-blur-md hover:bg-white/10 border border-white/10 rounded-full text-[11px] uppercase tracking-widest font-bold text-zinc-400 hover:text-white whitespace-nowrap transition-all shadow-lg">{qr}</button>
                ))}
                {appMode === "Vadatibru" && getPredictions().map(pred => (
                   <button key={pred} onClick={() => setInputText(prev => prev ? `${prev} [${pred}]` : `[${pred}]`)} className="px-5 py-2.5 bg-[#0a0a0a]/80 backdrop-blur-md hover:bg-emerald-500/20 border border-emerald-500/20 rounded-full text-[11px] uppercase tracking-widest font-bold text-emerald-500 whitespace-nowrap transition-all shadow-lg">+ [{pred}]</button>
                ))}
             </div>

             <div className={`relative bg-[#0a0a0a]/80 backdrop-blur-2xl border rounded-2xl flex flex-col transition-all duration-500 ${isListening ? "border-blue-500/50 bg-[#0a0a0a]" : "border-white/10 focus-within:border-white/30"}`}>
                {isListening && (
                  <>
                    <div className="absolute -inset-0 rounded-2xl border border-blue-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-50 pointer-events-none" />
                    <div className="absolute -inset-0 rounded-2xl border border-blue-400 animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite] opacity-30 pointer-events-none" style={{ animationDelay: '0.5s' }} />
                  </>
                )}

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isListening ? "Listening to environment..." : `Message SaikAI ${appMode}...`}
                  className="w-full bg-transparent p-5 min-h-[70px] max-h-[200px] resize-none outline-none text-white text-[15px] font-medium tracking-wide leading-relaxed placeholder:text-zinc-600 custom-scrollbar relative z-10"
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSmartDispatch(); } }}
                />
                
                <div className="flex justify-between items-center px-4 pb-4 relative z-10">
                   <button onClick={toggleListen} className={`p-2.5 rounded-xl transition-all ${isListening ? "bg-red-500/20 text-red-500 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white border border-white/5"}`}>
                     {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                   </button>
                   <button onClick={handleSmartDispatch} disabled={isLoading || (!inputText.trim() && !isListening)} className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-zinc-200 disabled:opacity-20 disabled:bg-white/10 disabled:text-zinc-500 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                     {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Transmit ↗"}
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}