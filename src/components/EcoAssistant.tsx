import { useEffect, useRef, useState } from "react";
import { Send, Mic, Volume2, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eco-chat`;

export function EcoAssistant({
  context,
  title = "Ask the eco assistant",
  subtitle = "Get instant help about your detection.",
}: {
  context?: string;
  title?: string;
  subtitle?: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! Ask me anything about this detection — bin choice, recycling tips, hazards." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const recogRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const speak = (text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(u);
  };

  const startMic = () => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return toast.error("Speech recognition not supported in this browser.");
    const r = new SR();
    r.lang = "en-US";
    r.interimResults = false;
    r.onresult = (e: any) => {
      setInput(e.results[0][0].transcript);
      setListening(false);
    };
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
    const ctxMsg: Msg | null = context
      ? { role: "user", content: `Context from current detection:\n${context}` }
      : null;
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);
    let acc = "";
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = ctxMsg ? [ctxMsg, ...messages, userMsg] : [...messages, userMsg];
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

  const quick = [
    "Which bin should this go in?",
    "Is this hazardous?",
    "How can I recycle it?",
  ];

  return (
    <section className="glass rounded-2xl p-5 mt-8 soft-shadow">
      <header className="flex items-center gap-2 mb-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--gradient-primary)] text-primary-foreground">
          <Sparkles className="h-4 w-4" />
        </div>
        <div>
          <h3 className="font-display font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </header>

      <div ref={scrollRef} className="max-h-72 overflow-y-auto space-y-2 pr-1 mb-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border"}`}>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
              </div>
              {m.role === "assistant" && m.content && (
                <button
                  onClick={() => speak(m.content)}
                  className="mt-1 text-xs opacity-60 hover:opacity-100 inline-flex items-center gap-1"
                >
                  <Volume2 className="h-3 w-3" /> replay
                </button>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" /> thinking…
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-2">
        {quick.map((q) => (
          <button
            key={q}
            onClick={() => send(q)}
            disabled={loading}
            className="text-xs px-3 py-1 rounded-full border bg-background hover:bg-accent transition-colors disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={startMic} disabled={listening} aria-label="Voice input">
          <Mic className={`h-4 w-4 ${listening ? "text-destructive" : ""}`} />
        </Button>
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about disposal, recycling, hazards…"
        />
        <Button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          style={{ background: "var(--gradient-primary)" }}
          className="text-primary-foreground"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </section>
  );
}
