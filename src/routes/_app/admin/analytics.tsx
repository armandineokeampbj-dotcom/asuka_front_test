import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { adminAPI } from "@/lib/api-client";
import { BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/analytics")({ component: AdminAnalyticsPage });

function AdminAnalyticsPage() {
  const { t } = useLang();
  const [stats, setStats] = useState<any>(null);
  const [topOpps, setTopOpps] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [analyticsData, topOppsData] = await Promise.all([
          adminAPI.getAnalytics(),
          adminAPI.getTopOpportunities(),
        ]);
        setStats(analyticsData);
        setTopOpps(topOppsData ?? []);
      } catch {
        toast.error(t("admin_analytics_err"));
      }
    })();
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("admin_analytics_computing")}
      </div>
    );
  }

  const cards = [
    { label: t("admin_analytics_youth"), value: stats.users, color: "from-primary/20 to-primary/5" },
    { label: t("admin_analytics_opps"), value: stats.opps, color: "from-secondary/20 to-secondary/5" },
    { label: t("admin_analytics_applications"), value: stats.apps, color: "from-accent/20 to-accent/5" },
    { label: t("admin_analytics_pulses"), value: stats.pulses, color: "from-success/20 to-success/5" },
    { label: t("admin_analytics_xp"), value: stats.xp?.toLocaleString(), color: "from-primary/20 to-secondary/5" },
    { label: t("admin_analytics_rewards"), value: stats.rewards?.toLocaleString(), color: "from-accent/20 to-accent/5" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <BarChart3 className="h-6 w-6 text-primary" /> Analytics
      </h1>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={`p-5 bg-gradient-to-br ${c.color} border-border/50`}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="text-3xl font-bold mt-1">{c.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> {t("admin_analytics_top_opps")}
        </h3>
        <div className="space-y-2">
          {topOpps.map((o) => (
            <div key={o.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
              <div className="truncate">
                {o.title_en}
                <Badge variant="outline" className="ml-1 text-[10px]">{o.type}</Badge>
              </div>
              <div className="text-muted-foreground shrink-0 ml-3">{o.views_count ?? 0} {t("admin_analytics_views")}</div>
            </div>
          ))}
          {!topOpps.length && <div className="text-muted-foreground text-sm">{t("admin_analytics_no_data")}</div>}
        </div>
      </Card>
    </div>
  );
}
