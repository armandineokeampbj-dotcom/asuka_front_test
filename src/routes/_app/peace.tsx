import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { useLang } from "@/i18n/LanguageProvider";
import { Plus, X, Shield, Users, AlertTriangle, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/peace")({ component: PeacePage });

const CATEGORIES = [
  { id: "security", labelKey: "cat_security", icon: Shield, tone: "destructive" },
  { id: "conflict", labelKey: "cat_conflict", icon: AlertTriangle, tone: "warning" },
  { id: "community", labelKey: "cat_community", icon: Users, tone: "primary" },
];

type Report = {
  id: string;
  category: string;
  description: string;
  location: string;
  status: "Under review" | "In progress" | "Resolved";
  user_id: string;
  created_at: string;
};

function PeacePage() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [reports, setReports] = useState<Report[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadReports();
  }, [user?.id]);

  const loadReports = async () => {
    try {
      // TODO: Implement reports table in Supabase
      // const { data } = await supabase
      //   .from("reports")
      //   .select("*")
      //   .order("created_at", { ascending: false });
      // setReports((data ?? []) as Report[]);
      setReports([]);
    } catch (error) {
      console.error("Error loading reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 1) return t("just_now");
    if (min < 60) return `${min}m`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h`;
    const d = Math.floor(hr / 24);
    return `${d}d`;
  };

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6 sm:p-8 border-border/50 bg-gradient-card">
        <div className="absolute inset-0 bg-gradient-aurora opacity-50" />
        <div className="relative">
          <h1 className="text-3xl font-bold">{t("peace_title")}</h1>
          <p className="text-muted-foreground mt-2">{t("peace_sub")}</p>
        </div>
      </Card>

      <div className="space-y-3">
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          className="group w-full border-2 border-dashed border-primary/40 bg-primary/5 hover:border-primary hover:bg-primary/10 h-auto py-5 text-base"
        >
          <Plus className="h-5 w-5 mr-2 transition-transform group-hover:rotate-90" />
          {t("report_issue")}
        </Button>
      </div>

      <div className="space-y-3">
        <h3 className="text-base font-semibold">{t("recent_reports")}</h3>
        {loading ? (
          <div className="text-center text-muted-foreground">{t("loading")}</div>
        ) : reports.length === 0 ? (
          <Card className="p-10 text-center text-muted-foreground border-dashed">
            {lang === "fr" ? "Aucun signalement pour le moment." : "No reports yet."}
          </Card>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => {
              const cat = CATEGORIES.find((c) => c.id === r.category);
              if (!cat) return null;
              const toneStyle = {
                destructive: "bg-destructive/10 text-destructive",
                warning: "bg-accent/15 text-accent-foreground",
                primary: "bg-primary/10 text-primary",
              }[cat.tone];
              const Icon = cat.icon;
              const statusKey = r.status === "Under review" ? "status_review" : r.status === "In progress" ? "status_progress" : "status_resolved";
              const statusStyle = {
                "Under review": "bg-muted text-muted-foreground",
                "In progress": "bg-accent/15 text-accent-foreground",
                Resolved: "bg-success/15 text-success",
              }[r.status];

              return (
                <Card key={r.id} className="p-5 border-border/50">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneStyle}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{t(cat.labelKey as any)}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${statusStyle}`}>
                          {t(statusKey as any)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-foreground/90">{r.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {r.location}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(r.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {open && <ReportSheet user={user} onClose={() => { setOpen(false); loadReports(); }} t={t} lang={lang} />}
    </div>
  );
}

function ReportSheet({ user, onClose, t, lang }: { user: any; onClose: () => void; t: any; lang: string }) {
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);

  const valid = category && description.trim().length > 5 && location.trim().length > 1;

  const submit = async () => {
    if (!valid || !user) return;
    setLoading(true);
    try {
      // TODO: Implement reports table in Supabase
      // const { error } = await supabase.from("reports").insert([
      //   {
      //     category,
      //     description: description.trim(),
      //     location: location.trim(),
      //     status: "Under review",
      //     user_id: user.id,
      //   },
      // ]);
      // if (error) throw error;
      toast.success(t("submit_report") + " — " + (lang === "fr" ? "Merci !" : "Thanks!"));
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Error submitting report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-t-3xl bg-background p-6 pb-10 shadow-elevated animate-slide-up">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">{t("report_issue")}</h3>
          <button
            onClick={onClose}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted hover:bg-muted/80 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {t("type_of_issue")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                disabled={loading}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 px-2 py-3 text-xs font-semibold transition disabled:opacity-50 ${
                  active
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-center leading-tight">{t(c.labelKey as any)}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("description")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("desc_placeholder")}
              disabled={loading}
              rows={4}
              className="w-full resize-none rounded-2xl border border-border bg-card px-5 py-3.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {t("location")}
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t("loc_placeholder")}
              disabled={loading}
              className="w-full rounded-2xl border border-border bg-card px-5 py-3.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>

        <Button
          onClick={submit}
          disabled={!valid || loading}
          className="mt-6 w-full"
          size="lg"
        >
          {loading ? (lang === "fr" ? "Envoi..." : "Sending...") : t("submit_report")}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {t("reviewed_48h")}
        </p>
      </div>
    </div>
  );
}
