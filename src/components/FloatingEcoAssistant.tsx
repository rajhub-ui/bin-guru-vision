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
  content: "🌱 Hello! I am your **Eco Assistant**. How can I help you today? Ask me about recycling, composting, hazardous waste, or sustainable habits.",
};

export function FloatingEcoAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, open]);

  const speak = (text: string, idx: number) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (speakingIdx === idx) { setSpeakingIdx(null); return; }
    const u = new SpeechSynthesisUtterance(text.replace(/[*_`#>]/g, ""));
    u.onend = () => setSpeakingIdx(null);
    u.onerror = () => setSpeakingIdx(null);
    setSpeakingIdx(idx);
    window.speechSynthesis.speak(u);
  };

  const startMic = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return toast.error("Speech recognition not supported.");
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e: any) => { setInput(e.results[0][0].transcript); setListening(false); };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    recogRef.current = r;
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
      const resp = await fetch(FN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
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
      {/* Chat panel */}
      {open && (
        <div
          className="fixed bottom-[104px] right-6 z-[60] w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-160px))] rounded-2xl overflow-hidden flex flex-col animate-scale-in"
          style={{
            background: "color-mix(in oklab, var(--card) 75%, transparent)",
            backdropFilter: "blur(20px) saturate(140%)",
            WebkitBackdropFilter: "blur(20px) saturate(140%)",
            border: "1px solid color-mix(in oklab, #00E676 18%, transparent)",
            boxShadow: "0 20px 60px -10px rgba(0, 230, 118, 0.25), 0 0 0 1px rgba(0,229,255,0.08)",
          }}
        >
          {/* Header */}
          <header className="flex items-center justify-between px-4 py-3 border-b border-border/40">
            <div className="flex items-center gap-2.5">
              <span className="relative grid h-8 w-8 place-items-center rounded-full bg-[#0a0f0d]">
                <span className="eco-ring-mini" />
                <Leaf className="relative z-10 h-3.5 w-3.5 text-[#00E676]" />
              </span>
              <div>
                <h3 className="font-display font-semibold text-sm leading-tight">Eco Assistant</h3>
                <p className="text-[10px] text-muted-foreground leading-tight">Always-on sustainability help</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card/80 border border-border/40"}`}>
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
                    aria-label={speakingIdx === i ? "Stop" : "Listen"}
                  >
                    {speakingIdx === i ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> thinking…
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border/40 p-2.5 flex gap-2">
            <Button variant="outline" size="icon" onClick={startMic} disabled={listening} aria-label="Voice input" className="shrink-0">
              <Mic className={`h-4 w-4 ${listening ? "text-destructive" : ""}`} />
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about recycling, hazards…"
              className="bg-background/60"
            />
            <Button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              size="icon"
              className="shrink-0 text-primary-foreground"
              style={{ background: "linear-gradient(135deg, #00E676, #00E5FF)" }}
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
        className="eco-fab fixed bottom-6 right-6 z-[60] grid h-16 w-16 place-items-center rounded-full"
      >
        <span className="eco-ring" aria-hidden />
        <span className="eco-fab-core grid h-[52px] w-[52px] place-items-center rounded-full">
          {open ? (
            <X className="h-5 w-5 text-white" />
          ) : (
            <Leaf className="h-5 w-5 text-[#00E676]" />
          )}
        </span>
      </button>
    </>
  );
}
