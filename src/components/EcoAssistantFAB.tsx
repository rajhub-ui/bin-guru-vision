import { useEffect, useRef, useState } from "react";
import { Send, Mic, Volume2, VolumeX, Loader2, X, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eco-chat`;

const WELCOME: Msg = {
  role: "assistant",
  content: "🌱 Hello! I am your **Eco Assistant**. Ask me anything about waste sorting, recycling, composting or sustainable habits — I'm here to help.",
};

export function EcoAssistantFAB() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open]);

  const speak = (text: string, idx: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speakingIdx === idx) {
      setSpeakingIdx(null);
      return;
    }
    const u = new SpeechSynthesisUtterance(text.replace(/[*_`#>]/g, ""));
    u.onend = () => setSpeakingIdx(null);
    u.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(u);
  };

  const startMic = () => {
    const w = window as unknown as { webkitSpeechRecognition?: new () => unknown; SpeechRecognition?: new () => unknown };
    const SR = w.webkitSpeechRecognition || w.SpeechRecognition;
    if (!SR) return toast.error("Speech recognition not supported in this browser.");
    const r = new SR() as {
      lang: string; interimResults: boolean; start: () => void;
      onresult: (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => void;
      onerror: () => void; onend: () => void;
    };
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e) => {
      setInput(e.results[0][0].transcript);
      setListening(false);
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    setListening(true);
    r.start();
  };

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    const userMsg: Msg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    let acc = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = [...messages, userMsg];
      const resp = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: payload }),
      });
      if (!resp.ok || !resp.body) {
        const e = await resp.json().catch(() => ({}));
        throw new Error(e.error || "Chat failed");
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages((m) => {
                const cp = [...m];
                cp[cp.length - 1] = { role: "assistant", content: acc };
                return cp;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Chat error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Scoped keyframes for the ring spin + halo pulse */}
      <style>{`
        @keyframes eco-ring-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes eco-halo-pulse {
          0%, 100% { box-shadow: 0 0 24px 4px rgba(0,230,118,0.45), 0 0 48px 8px rgba(0,229,255,0.25); }
          50%      { box-shadow: 0 0 32px 6px rgba(0,230,118,0.65), 0 0 64px 12px rgba(0,229,255,0.4); }
        }
        .eco-ring-gradient {
          background: conic-gradient(from 0deg,
            #00E676 0%, #00E5FF 35%, #0084ff 65%, #00E676 100%);
          animation: eco-ring-spin 6s linear infinite;
        }
        .eco-halo { animation: eco-halo-pulse 3.2s ease-in-out infinite; }
      `}</style>

      {/* Chat window */}
      {open && (
        <div
          className="fixed z-[60] bottom-[104px] right-6 w-[min(380px,calc(100vw-2rem))] h-[min(540px,calc(100vh-160px))] rounded-2xl overflow-hidden flex flex-col animate-scale-in"
          style={{
            background: "color-mix(in oklab, hsl(var(--background)) 70%, transparent)",
            backdropFilter: "blur(20px) saturate(160%)",
            WebkitBackdropFilter: "blur(20px) saturate(160%)",
            border: "1px solid color-mix(in oklab, #00E676 25%, transparent)",
            boxShadow: "0 20px 60px -10px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.04)",
          }}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <div className="relative h-8 w-8 grid place-items-center rounded-full bg-black">
                <div className="absolute inset-0.5 rounded-full eco-ring-gradient" />
                <div className="absolute inset-[5px] rounded-full bg-black grid place-items-center">
                  <Leaf className="h-3.5 w-3.5 text-[#00E676]" />
                </div>
              </div>
              <div>
                <h3 className="font-display font-semibold text-sm leading-tight">Eco Assistant</h3>
                <p className="text-[10px] text-muted-foreground">Online · Sustainability AI</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="h-7 w-7 grid place-items-center rounded-full hover:bg-accent transition-colors"
              aria-label="Close chat"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card/80 border border-border/40"
                }`}>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                  </div>
                </div>
                {m.role === "assistant" && m.content && (
                  <Button
                    size="icon"
                    variant={speakingIdx === i ? "default" : "outline"}
                    className="h-9 w-9 shrink-0 rounded-full"
                    onClick={() => speak(m.content, i)}
                    aria-label={speakingIdx === i ? "Stop speaking" : "Listen"}
                  >
                    {speakingIdx === i ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                <Loader2 className="h-3 w-3 animate-spin" /> thinking…
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border/40 p-3 flex gap-2">
            <Button variant="outline" size="icon" onClick={startMic} disabled={listening} aria-label="Voice input">
              <Mic className={`h-4 w-4 ${listening ? "text-destructive" : ""}`} />
            </Button>
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask the Eco Assistant…"
              className="bg-background/60"
            />
            <Button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              size="icon"
              style={{ background: "linear-gradient(135deg, #00E676, #00E5FF)" }}
              className="text-black hover:opacity-90"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close Eco Assistant" : "Open Eco Assistant"}
        className="fixed z-[60] bottom-6 right-6 h-16 w-16 rounded-full grid place-items-center bg-black eco-halo transition-transform duration-200 hover:scale-105 active:scale-[0.96] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E676]"
      >
        {/* Spinning gradient ring */}
        <span className="absolute inset-0 rounded-full eco-ring-gradient" />
        {/* Inner dark disc */}
        <span className="absolute inset-[4px] rounded-full bg-black grid place-items-center">
          {open ? (
            <X className="h-5 w-5 text-[#00E676]" />
          ) : (
            <Leaf className="h-6 w-6 text-[#00E676]" />
          )}
        </span>
      </button>
    </>
  );
}
