import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rewardsAPI, payoutAPI } from "@/lib/api-client";
import { useAuth } from "@/context/AuthProvider";
import { Coins, Smartphone, Plus, Trash2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/rewards")({ component: RewardsPage });

function RewardsPage() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [rewards, setRewards] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ provider: "mobile_money", accountLabel: "Orange Money", accountRef: "" });

  const load = async () => {
    if (!user?.id) return;
    try {
      const { rewards_ledger, payout_methods } = await rewardsAPI.getRewards();
      setRewards(rewards_ledger ?? []);
      setMethods(payout_methods ?? []);
    } catch (err) {
      console.error("Load rewards error:", err);
      toast.error("Erreur lors du chargement des rewards");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.id]);

  const totals = rewards.reduce(
    (acc, r) => {
      if (r.status === "paid") acc.paid += Number(r.amount);
      else if (r.status === "approved" || r.status === "pending") acc.pending += Number(r.amount);
      return acc;
    },
    { paid: 0, pending: 0 },
  );

  const addMethod = async () => {
    if (!user?.id || !form.accountRef) return toast.error(lang === "fr" ? "Référence requise" : "Account reference required");
    try {
      await payoutAPI.addMethod({ ...form, isDefault: methods.length === 0 });
      toast.success(lang === "fr" ? "Méthode ajoutée" : "Method added");
      setForm({ provider: "mobile_money", accountLabel: "Orange Money", accountRef: "" });
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const removeMethod = async (id: string) => {
    try {
      await payoutAPI.removeMethod(id);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const setDefault = async (id: string) => {
    if (!user?.id) return;
    try {
      await payoutAPI.setDefault(id);
      load();
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  if (loading) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {lang === "fr" ? "Chargement…" : "Loading…"}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Coins className="h-6 w-6 text-accent" /> {lang === "fr" ? "Récompenses" : "Rewards"}</h1>
        <p className="text-muted-foreground mt-1">{lang === "fr" ? "Stipends, bourses et points gagnés grâce à ta progression." : "Stipends, grants and points earned through your progress."}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Card className="p-5 bg-gradient-to-br from-accent/15 to-accent/5 border-accent/30">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{lang === "fr" ? "Versé" : "Paid"}</div>
          <div className="text-3xl font-bold mt-1">{totals.paid.toLocaleString()} <span className="text-base font-normal text-muted-foreground">{rewards[0]?.currency ?? "XOF"}</span></div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-secondary/15 to-secondary/5 border-secondary/30">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{lang === "fr" ? "En attente" : "Pending"}</div>
          <div className="text-3xl font-bold mt-1">{totals.pending.toLocaleString()} <span className="text-base font-normal text-muted-foreground">{rewards[0]?.currency ?? "XOF"}</span></div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6">
        <Card className="p-5">
          <h2 className="font-semibold mb-3">{lang === "fr" ? "Historique" : "Ledger"}</h2>
          <div className="space-y-2">
            {rewards.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-border/50 pb-2 last:border-0">
                <div>
                  <div className="text-sm font-medium">{r.reason ?? r.kind}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()} · <Badge variant="outline" className="text-[10px]">{r.kind}</Badge></div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{Number(r.amount).toLocaleString()} {r.currency}</div>
                  <Badge className={r.status === "paid" ? "bg-success/15 border-success/30 text-foreground" : "bg-muted border-border text-foreground"}>{r.status}</Badge>
                </div>
              </div>
            ))}
            {!rewards.length && (
              <div className="text-center text-muted-foreground py-10 border border-dashed rounded-xl">
                <Sparkles className="h-6 w-6 mx-auto mb-2 text-accent" />
                {lang === "fr" ? "Pas encore de récompenses. Continue à progresser !" : "No rewards yet. Keep going!"}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 space-y-3 h-fit">
          <h2 className="font-semibold flex items-center gap-2"><Smartphone className="h-4 w-4 text-secondary" /> {lang === "fr" ? "Méthodes de paiement" : "Payout methods"}</h2>
          <div className="space-y-2">
            {methods.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border border-border/60">
                <div className="min-w-0">
                  <div className="text-sm font-medium flex items-center gap-1">{m.account_label} {m.is_default && <Badge className="text-[9px] bg-accent/20 border-accent/30 text-foreground">{lang === "fr" ? "défaut" : "default"}</Badge>}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">{m.account_ref}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!m.is_default && <Button size="sm" variant="ghost" onClick={() => setDefault(m.id)}>★</Button>}
                  <Button size="sm" variant="ghost" onClick={() => removeMethod(m.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
            {!methods.length && <p className="text-xs text-muted-foreground">{lang === "fr" ? "Aucune méthode ajoutée." : "No method added."}</p>}
          </div>
          <div className="pt-3 border-t border-border/50 space-y-2">
            <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })}>
              <option value="mobile_money">Mobile Money</option>
              <option value="bank">Bank</option>
              <option value="wallet">Wallet</option>
              <option value="card">Card</option>
            </select>
            <Input placeholder={lang === "fr" ? "Étiquette (Orange Money, Wave…)" : "Label (Orange Money, Wave…)"} value={form.accountLabel} onChange={(e) => setForm({ ...form, accountLabel: e.target.value })} />
            <Input placeholder={lang === "fr" ? "Numéro / référence" : "Number / reference"} value={form.accountRef} onChange={(e) => setForm({ ...form, accountRef: e.target.value })} />
            <Button onClick={addMethod} className="w-full bg-gradient-hero border-0"><Plus className="h-3.5 w-3.5 mr-1" />{lang === "fr" ? "Ajouter" : "Add"}</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}