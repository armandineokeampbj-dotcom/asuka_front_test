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
  const [streaming, setStreaming] = useState(false);
  const [quota, setQuota] = useState<{ remaining: number; limit: number; resetAt?: string } | null>(null);
  const [quotaExhausted, setQuotaExhausted] = useState<{ resetAt?: string } | null>(null);
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

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  const starters = [t("coach_starter_1"), t("coach_starter_2"), t("coach_starter_3")];

  const send = async (text: string, useStreaming: boolean = true) => {
    if (!text.trim() || busy || quotaExhausted !== null) return;
    const userMsg: Msg = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setBusy(true);

    try {
      if (useStreaming) {
        await handleStreamingResponse(newMessages);
      } else {
        await handleSimpleResponse(newMessages);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      console.error("Coach error:", msg);
      setMessages(newMessages.slice(0, -1));
      if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
        toast.error(lang === "fr"
          ? "Impossible de contacter le serveur. Vérifie ta connexion internet."
          : "Cannot reach the server. Check your internet connection.");
      } else {
        toast.error(lang === "fr"
          ? "Une erreur inattendue s'est produite. Réessaie."
          : "An unexpected error occurred. Please try again.");
      }
    } finally {
      setBusy(false);
      setStreaming(false);
    }
  };

  const handleStreamingResponse = async (newMessages: Msg[]) => {
    try {
      setStreaming(true);
      const resp = await coachAPI.streamCoach(newMessages, lang, profile);

      if (!resp.ok) {
        let errorMessage = lang === "fr" ? "Erreur lors de l'appel au coach" : "Error calling coach";
        let errorData: any = {};

        try {
          errorData = await resp.json();
        } catch {}

        switch (resp.status) {
          case 400:
            errorMessage = errorData.error || (lang === "fr" ? "Requête invalide" : "Invalid request");
            break;
          case 401:
            errorMessage = lang === "fr" ? "Authentification requise. Reconnecte-toi." : "Authentication required. Please log in again.";
            break;
          case 403:
            setQuotaExhausted({ resetAt: errorData.resetAt });
            setMessages(newMessages.slice(0, -1));
            setStreaming(false);
            return;
          case 404:
            errorMessage = lang === "fr" ? "Utilisateur non trouvé" : "User not found";
            break;
          case 429:
            errorMessage = lang === "fr" ? "Trop de requêtes. Réessaie dans quelques instants." : "Too many requests. Please try again shortly.";
            break;
          case 502:
            errorMessage = lang === "fr"
              ? "Le service IA est temporairement surchargé. Groq et Gemini sont tous les deux indisponibles. Réessaie dans 1-2 minutes."
              : "The AI service is temporarily overloaded. Both Groq and Gemini are unavailable. Please retry in 1-2 minutes.";
            break;
          case 500:
          case 503:
            errorMessage = lang === "fr"
              ? "Le service Coach IA est temporairement indisponible. Réessaie."
              : "Coach AI service is temporarily unavailable. Please try again.";
            break;
          default:
            errorMessage = errorData.error || errorMessage;
        }

        setMessages(newMessages.slice(0, -1));
        setStreaming(false);
        toast.error(errorMessage);
        return;
      }

      if (!resp.body) {
        toast.error(lang === "fr" ? "Pas de corps de réponse" : "No response body");
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

            if (parsed.status === "connected") {
              // initial handshake
            } else if (parsed.content && parsed.type === "stream") {
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
              toast.error(parsed.error || (lang === "fr" ? "Erreur du stream" : "Stream error"));
            }
          } catch {
            // skip non-JSON lines
          }
        }
      }

      if (!messageAdded) {
        toast.error(lang === "fr" ? "Réponse vide du coach" : "Empty response from coach");
        setMessages(newMessages.slice(0, -1));
      }
    } catch (error) {
      setStreaming(false);
      throw error;
    }
  };

  const handleSimpleResponse = async (newMessages: Msg[]) => {
    try {
      const resp = await coachAPI.callCoach(newMessages, lang, profile);

      if (!resp.ok) {
        let errorMessage = lang === "fr" ? "Erreur lors de l'appel au coach" : "Error calling coach";
        let errorData: any = {};

        try {
          errorData = await resp.json();
        } catch {}

        switch (resp.status) {
          case 400:
            errorMessage = errorData.error || (lang === "fr" ? "Requête invalide" : "Invalid request");
            break;
          case 401:
            errorMessage = lang === "fr" ? "Authentification requise. Reconnecte-toi." : "Authentication required. Please log in again.";
            break;
          case 403:
            setQuotaExhausted({ resetAt: errorData.resetAt });
            setMessages(newMessages.slice(0, -1));
            return;
          case 404:
            errorMessage = lang === "fr" ? "Utilisateur non trouvé" : "User not found";
            break;
          case 429:
            errorMessage = lang === "fr" ? "Trop de requêtes. Réessaie dans quelques instants." : "Too many requests. Please try again shortly.";
            break;
          case 502:
            errorMessage = lang === "fr"
              ? "Le service IA est temporairement surchargé. Groq et Gemini sont tous les deux indisponibles. Réessaie dans 1-2 minutes."
              : "The AI service is temporarily overloaded. Both Groq and Gemini are unavailable. Please retry in 1-2 minutes.";
            break;
          case 500:
          case 503:
            errorMessage = lang === "fr"
              ? "Le service Coach IA est temporairement indisponible. Réessaie."
              : "Coach AI service is temporarily unavailable. Please try again.";
            break;
          default:
            errorMessage = errorData.error || errorMessage;
        }

        setMessages(newMessages.slice(0, -1));
        toast.error(errorMessage);
        return;
      }

      const data = await resp.json();

      if (!data.response) {
        setMessages(newMessages.slice(0, -1));
        toast.error(lang === "fr" ? "Réponse vide du coach" : "Empty response from coach");
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

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] lg:h-[calc(100vh-140px)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" /> {t("coach_title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("coach_subtitle")}</p>
      </div>

      <Card className="flex-1 overflow-hidden flex flex-col border-border/50">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {quotaExhausted !== null ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-8">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center text-3xl">🔋</div>
              <div>
                <h3 className="font-semibold text-lg">
                  {lang === "fr" ? "Limite quotidienne atteinte" : "Daily limit reached"}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                  {lang === "fr"
                    ? "Tu as utilisé tes 15 messages d'aujourd'hui avec ASUKA COACH. Reviens demain pour continuer !"
                    : "You've used your 15 messages for today with ASUKA COACH. Come back tomorrow to continue!"}
                </p>
                {quotaExhausted.resetAt && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {lang === "fr" ? "Disponible à partir de : " : "Available from: "}
                    <span className="font-medium">
                      {new Date(quotaExhausted.resetAt).toLocaleString(
                        lang === "fr" ? "fr-FR" : "en-US",
                        { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "long" }
                      )}
                    </span>
                  </p>
                )}
              </div>
              <Button variant="outline" onClick={() => { setQuotaExhausted(null); setMessages([]); }}>
                {lang === "fr" ? "Voir la conversation" : "View conversation"}
              </Button>
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-hero flex items-center justify-center shadow-glow">
                    <Sparkles className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <p className="text-muted-foreground max-w-md">{t("coach_subtitle")}</p>
                  <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                    {starters.map((s) => (
                      <button
                        key={s}
                        onClick={() => send(s)}
                        className="px-3 py-2 rounded-full text-xs border border-border bg-card hover:border-primary/40 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-gradient-hero text-primary-foreground" : "bg-muted"}`}>
                    {m.role === "user" ? (
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    ) : (
                      <MarkdownMessage content={m.content || (busy && i === messages.length - 1 ? t("coach_thinking") : "")} />
                    )}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {showTyping && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-2xl px-4 py-3 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={endRef} />
        </div>

        {/* Quota banner */}
        {quota !== null && (
          <div className={`px-4 py-1.5 text-[11px] flex items-center justify-between border-t border-border/40 ${quota.remaining <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
            <span>
              {lang === "fr"
                ? `${quota.remaining} message${quota.remaining > 1 ? "s" : ""} restant${quota.remaining > 1 ? "s" : ""} aujourd'hui`
                : `${quota.remaining} message${quota.remaining > 1 ? "s" : ""} left today`}
            </span>
            {quota.remaining <= 3 && (
              <span className="font-medium">
                {lang === "fr" ? "⚠️ Quota presque atteint" : "⚠️ Quota almost reached"}
              </span>
            )}
          </div>
        )}

        {/* Input form */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="border-t border-border/60 p-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("coach_placeholder")}
            disabled={!!quotaExhausted || quota?.remaining === 0}
            className="flex-1 bg-transparent outline-none px-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            type="submit"
            disabled={busy || !input.trim() || !!quotaExhausted || quota?.remaining === 0}
            className="bg-gradient-hero border-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
}
