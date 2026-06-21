import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";
import { useAuth } from "@/context/AuthProvider";
import { coachAPI, profileAPI } from "@/lib/api-client";
import { Sparkles, Send, Copy, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MarkdownMessage } from "@/components/asuka/MarkdownMessage";

type Msg = { role: "user" | "assistant"; content: string };

// ── Persistence helpers ──────────────────────────────────────────────────────
const COACH_STORAGE_KEY = (userId: string) => `asuka_coach_history_${userId}`;
const COACH_TTL_MS = 24 * 60 * 60 * 1000;

type StoredConversation = { messages: Msg[]; savedAt: number };

const loadConversation = (userId: string): Msg[] => {
  try {
    const raw = localStorage.getItem(COACH_STORAGE_KEY(userId));
    if (!raw) return [];
    const stored: StoredConversation = JSON.parse(raw);
    if (Date.now() - stored.savedAt > COACH_TTL_MS) {
      localStorage.removeItem(COACH_STORAGE_KEY(userId));
      return [];
    }
    return stored.messages || [];
  } catch {
    return [];
  }
};

const saveConversation = (userId: string, messages: Msg[]) => {
  try {
    const stored: StoredConversation = { messages, savedAt: Date.now() };
    localStorage.setItem(COACH_STORAGE_KEY(userId), JSON.stringify(stored));
  } catch { /* localStorage full or unavailable */ }
};

const clearConversation = (userId: string) => {
  localStorage.removeItem(COACH_STORAGE_KEY(userId));
};

// ── Language detection ───────────────────────────────────────────────────────
const detectMessageLang = (text: string, fallback: string): string => {
  if (/[؀-ۿ]/.test(text)) return "ar";
  const lower = text.toLowerCase();
  const words = lower.split(/\s+/);
  const count = (list: string[]) => words.filter((w) => list.includes(w)).length;
  const scores: Record<string, number> = {
    en: count(["the", "is", "are", "what", "how", "can", "you", "help", "i", "my", "want", "need", "please", "tell", "me", "have", "do", "not", "would", "could"]),
    fr: count(["je", "tu", "il", "nous", "vous", "les", "des", "une", "mon", "ma", "mes", "est", "sont", "avec", "pour", "dans", "qui", "que", "sur", "pas"]),
    es: count(["el", "la", "los", "las", "una", "que", "con", "por", "para", "como", "pero", "hay", "soy", "quiero"]),
    pt: count(["eu", "você", "ele", "ela", "uma", "com", "por", "para", "como", "não", "são", "tenho", "quero"]),
    sw: count(["ni", "na", "ya", "wa", "kwa", "katika", "la", "hii", "hiyo", "jinsi", "nini", "vipi", "naweza", "tafadhali"]),
  };
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : fallback;
};

export const Route = createFileRoute("/_app/coach")({ component: Coach });

function Coach() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; limit: number; resetAt?: string } | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState<{ resetAt?: string } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!user) return;
    const history = loadConversation(user.id);
    if (history.length > 0) setMessages(history);
    (async () => {
      try {
        const data = await profileAPI.getProfile(user.id);
        setProfile(data.profile);
      } catch {}
    })();
  }, [user]);

  useEffect(() => {
    if (!user || messages.length === 0 || busy) return;
    saveConversation(user.id, messages);
  }, [messages, user, busy]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 128) + "px";
  };

  const copyMessage = (idx: number, content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const starters = [t("coach_starter_1"), t("coach_starter_2"), t("coach_starter_3")];

  const send = async (text: string, useStreaming: boolean = true) => {
    if (!text.trim() || busy || quotaExhausted !== null) return;
    const userMsg: Msg = { role: "user", content: text };
    const detectedLang = detectMessageLang(text, lang);
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setBusy(true);

    try {
      if (useStreaming) {
        await handleStreamingResponse(newMessages, detectedLang);
      } else {
        await handleSimpleResponse(newMessages, detectedLang);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      setMessages(newMessages.slice(0, -1));
      if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
        toast.error(t("coach_error_network"));
      } else {
        toast.error(t("coach_error_unexpected"));
      }
    } finally {
      setBusy(false);
      setStreaming(false);
    }
  };

  const handleStreamingResponse = async (newMessages: Msg[], detectedLang?: string) => {
    try {
      setStreaming(true);
      const resp = await coachAPI.streamCoach(newMessages, detectedLang || lang, profile);

      if (!resp.ok) {
        let errorMessage = t("coach_error_default");
        let errorData: any = {};
        try { errorData = await resp.json(); } catch {}

        switch (resp.status) {
          case 400: errorMessage = errorData.error || t("coach_error_invalid"); break;
          case 401: errorMessage = t("coach_error_auth"); break;
          case 403:
            setQuotaExhausted({ resetAt: errorData.resetAt });
            setMessages(newMessages.slice(0, -1));
            setStreaming(false);
            return;
          case 404: errorMessage = t("coach_error_notfound"); break;
          case 429: errorMessage = t("coach_error_ratelimit"); break;
          case 502: errorMessage = t("coach_error_overload"); break;
          case 500:
          case 503: errorMessage = t("coach_error_unavailable"); break;
          default: errorMessage = errorData.error || errorMessage;
        }
        setMessages(newMessages.slice(0, -1));
        setStreaming(false);
        toast.error(errorMessage);
        return;
      }

      if (!resp.body) {
        toast.error(t("coach_error_nobody"));
        setMessages(newMessages.slice(0, -1));
        setStreaming(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";
      let assistantMsg: Msg = { role: "assistant", content: "" };
      let messageAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          try {
            const parsed = JSON.parse(data);
            if (parsed.content && parsed.type === "stream") {
              fullResponse += parsed.content;
              assistantMsg.content = fullResponse;
              if (!messageAdded) {
                setStreaming(false);
                setMessages([...newMessages, assistantMsg]);
                messageAdded = true;
              } else {
                setMessages((prev) => [
                  ...prev.slice(0, -1),
                  { ...assistantMsg, content: fullResponse },
                ]);
              }
            } else if (parsed.status === "complete") {
              if (parsed.quota) {
                setQuota({
                  remaining: parsed.quota.remaining ?? 0,
                  limit: parsed.quota.limit ?? 15,
                  resetAt: parsed.quota.resetAt,
                });
              }
            } else if (parsed.status === "error") {
              toast.error(parsed.error || t("coach_error_stream"));
            }
          } catch { /* skip non-JSON */ }
        }
      }

      if (!messageAdded) {
        toast.error(t("coach_error_empty"));
        setMessages(newMessages.slice(0, -1));
      }
    } catch (error) {
      setStreaming(false);
      throw error;
    }
  };

  const handleSimpleResponse = async (newMessages: Msg[], detectedLang?: string) => {
    try {
      const resp = await coachAPI.callCoach(newMessages, detectedLang || lang, profile);

      if (!resp.ok) {
        let errorMessage = t("coach_error_default");
        let errorData: any = {};
        try { errorData = await resp.json(); } catch {}

        switch (resp.status) {
          case 400: errorMessage = errorData.error || t("coach_error_invalid"); break;
          case 401: errorMessage = t("coach_error_auth"); break;
          case 403:
            setQuotaExhausted({ resetAt: errorData.resetAt });
            setMessages(newMessages.slice(0, -1));
            return;
          case 404: errorMessage = t("coach_error_notfound"); break;
          case 429: errorMessage = t("coach_error_ratelimit"); break;
          case 502: errorMessage = t("coach_error_overload"); break;
          case 500:
          case 503: errorMessage = t("coach_error_unavailable"); break;
          default: errorMessage = errorData.error || errorMessage;
        }
        setMessages(newMessages.slice(0, -1));
        toast.error(errorMessage);
        return;
      }

      const data = await resp.json();
      if (!data.response) {
        setMessages(newMessages.slice(0, -1));
        toast.error(t("coach_error_empty"));
        return;
      }

      setMessages([...newMessages, { role: "assistant", content: data.response }]);
      if (data.quota) {
        setQuota({
          remaining: data.quota.remaining ?? 0,
          limit: data.quota.limit ?? 15,
          resetAt: data.quota.resetAt,
        });
      }
    } catch (error) {
      throw error;
    }
  };

  const lastMsg = messages[messages.length - 1];
  const showTyping = busy && !(lastMsg?.role === "assistant" && lastMsg.content.length > 0);
  const inputDisabled = !!quotaExhausted || quota?.remaining === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] md:h-[calc(100vh-140px)] lg:h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-hero flex items-center justify-center shadow-glow">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{t("coach_title")}</h1>
            <p className="text-xs text-muted-foreground">{t("coach_subtitle")}</p>
          </div>
        </div>
        {messages.length > 0 && user && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-destructive gap-1.5"
            onClick={() => {
              clearConversation(user.id);
              setMessages([]);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("coach_clear")}
          </Button>
        )}
      </div>

      {/* Main chat container */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm">

        {/* Messages scroll area */}
        <div className="flex-1 overflow-y-auto">
          {quotaExhausted !== null ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-8">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">🔋</div>
              <div>
                <h3 className="font-semibold text-lg">{t("coach_quota_exhausted_title")}</h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  {t("coach_quota_exhausted_desc")}
                </p>
                {quotaExhausted.resetAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {t("coach_quota_reset").replace("{date}", new Date(quotaExhausted.resetAt).toLocaleString(
                      lang === "fr" ? "fr-FR" : "en-US",
                      { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "long" }
                    ))}
                  </p>
                )}
              </div>
              <Button variant="outline" onClick={() => { setQuotaExhausted(null); setMessages([]); }}>
                {t("coach_see_conversation")}
              </Button>
            </div>
          ) : messages.length === 0 ? (
            /* Welcome / empty state */
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow mb-5">
                <Sparkles className="h-8 w-8 text-primary-foreground" />
              </div>
              <h2 className="text-2xl font-bold mb-2">{t("coach_title")}</h2>
              <p className="text-muted-foreground max-w-md mb-8 text-sm">{t("coach_subtitle")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl w-full">
                {starters.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="text-left p-4 rounded-xl border border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm text-foreground/80 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation messages */
            <div className="py-6 space-y-6">
              {messages.map((m, i) =>
                m.role === "user" ? (
                  /* User message — right-aligned */
                  <div key={i} className="flex justify-end px-4 sm:px-8">
                    <div className="max-w-[75%] lg:max-w-[60%]">
                      <div className="text-[10px] text-muted-foreground text-right mb-1 pr-1 uppercase tracking-wide font-medium">
                        {t("prof_you") || "You"}
                      </div>
                      <div className="bg-primary/10 border border-primary/15 rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
                        {m.content}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Assistant message — full-width with avatar */
                  <div key={i} className="px-4 sm:px-8 group">
                    <div className="flex gap-3">
                      <div className="h-8 w-8 rounded-lg bg-gradient-hero flex-shrink-0 flex items-center justify-center mt-0.5 shadow-sm">
                        <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-semibold text-primary mb-2 uppercase tracking-wide">
                          ASUKA COACH
                        </div>
                        <div className="text-sm leading-relaxed">
                          <MarkdownMessage
                            content={m.content || (busy && i === messages.length - 1 ? t("coach_thinking") : "")}
                          />
                        </div>
                        {/* Copy button */}
                        {m.content && (
                          <div className="mt-3 flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
                            <button
                              onClick={() => copyMessage(i, m.content)}
                              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-md hover:bg-muted/60"
                            >
                              {copiedIdx === i ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-green-500" />
                                  <span className="text-green-500">{t("coach_copied")}</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  <span>{t("coach_copy")}</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              )}

              {/* Typing indicator */}
              {showTyping && (
                <div className="px-4 sm:px-8">
                  <div className="flex gap-3">
                    <div className="h-8 w-8 rounded-lg bg-gradient-hero flex-shrink-0 flex items-center justify-center shadow-sm">
                      <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    <div className="flex items-center gap-1.5 py-2">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* Quota banner */}
        {quota !== null && (
          <div className={`px-4 sm:px-8 py-1.5 text-[11px] flex flex-wrap items-center justify-between gap-1 border-t border-border/40 ${quota.remaining <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
            <span>{t("coach_limit_today").replace("{remaining}", String(quota.remaining))}</span>
            {quota.remaining <= 3 && (
              <span className="font-medium">{t("coach_quota_warning")}</span>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-border/40 bg-background/60 backdrop-blur-sm p-3 sm:p-4">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="relative flex items-end gap-2 bg-muted/40 border border-border/60 rounded-2xl focus-within:border-primary/40 focus-within:shadow-sm transition-all px-1"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder={t("coach_placeholder")}
              disabled={inputDisabled}
              rows={1}
              className="flex-1 bg-transparent resize-none outline-none px-3 py-3.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
              style={{ minHeight: "48px", maxHeight: "128px", overflowY: "auto" }}
            />
            <Button
              type="submit"
              disabled={busy || !input.trim() || inputDisabled}
              className="mb-2 mr-1 h-9 w-9 p-0 rounded-xl bg-gradient-hero border-0 flex-shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            {t("coach_enter_hint")}
          </p>
        </div>
      </div>
    </div>
  );
}
