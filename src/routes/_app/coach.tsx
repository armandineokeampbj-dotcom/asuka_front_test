import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/context/AuthProvider";
import { coachAPI, profileAPI } from "@/lib/api-client";
import { Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { MarkdownMessage } from "@/components/asuka/MarkdownMessage";

type Msg = { role: "user" | "assistant"; content: string };

export const Route = createFileRoute("/_app/coach")({ component: Coach });

function Coach() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      (async () => {
        try {
          const data = await profileAPI.getProfile(user.id);
          setProfile(data.profile);
        } catch (error) {
          console.error("Failed to load profile:", error);
        }
      })();
    }
  }, [user]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const starters = [t("coach_starter_1"), t("coach_starter_2"), t("coach_starter_3")];

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setBusy(true);
    try {
      const resp = await coachAPI.callCoach(newMessages, lang, profile);

      if (resp.status === 429) { 
        toast.error(lang === "fr" ? "Trop de requêtes." : "Rate limited."); 
        setBusy(false); 
        return; 
      }
      if (resp.status === 402) { 
        toast.error(lang === "fr" ? "Crédits IA épuisés." : "AI credits exhausted."); 
        setBusy(false); 
        return; 
      }

      const data = await resp.json();
      const assistantMsg: Msg = { role: "assistant", content: data.response || "No response" };
      setMessages([...newMessages, assistantMsg]);
    } catch (error) {
      toast.error("Failed to get response from coach");
      console.error("Coach error:", error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] lg:h-[calc(100vh-140px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> {t("coach_title")}</h1>
        <p className="text-sm text-muted-foreground">{t("coach_subtitle")}</p>
      </div>
      <Card className="flex-1 overflow-hidden flex flex-col border-border/50">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4">
              <div className="h-14 w-14 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <p className="text-muted-foreground max-w-md">{t("coach_subtitle")}</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                {starters.map((s) => <button key={s} onClick={() => send(s)} className="px-3 py-2 rounded-full text-xs border border-border bg-card hover:border-primary/40 transition">{s}</button>)}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-hero text-primary-foreground" : "bg-muted"}`}>
                {m.role === "user" ? (
                  <div className="whitespace-pre-wrap">{m.content || (busy && i === messages.length - 1 ? t("coach_thinking") : "")}</div>
                ) : (
                  <MarkdownMessage content={m.content || (busy && i === messages.length - 1 ? t("coach_thinking") : "")} />
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="border-t border-border/60 p-3 flex gap-2">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t("coach_placeholder")} className="flex-1 bg-transparent outline-none px-3 text-sm" />
          <Button type="submit" disabled={busy || !input.trim()} className="bg-gradient-hero border-0"><Send className="h-4 w-4" /></Button>
        </form>
      </Card>
    </div>
  );
}
