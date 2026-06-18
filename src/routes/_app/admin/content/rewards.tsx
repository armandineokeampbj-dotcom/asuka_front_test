import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { adminAPI } from "@/lib/api-client";
import { Coins, Plus, Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/content/rewards")({ component: RewardsAdminPage });

const emptyForm = {
  userId: "", amount: 0, currency: "XOF", reason: "", type: "prize",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/15 border-amber-500/30 text-foreground",
  paid: "bg-success/15 border-success/30 text-foreground",
  cancelled: "bg-destructive/15 border-destructive/30 text-foreground",
};

function RewardsAdminPage() {
  const { t } = useLang();
  const { canEdit } = useAdminPermissions();
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "cancelled">("all");

  const load = () => {
    setLoading(true);
    adminAPI.getRewardsLedger()
      .then((data: any) => setRewards(Array.isArray(data?.rewards) ? data.rewards : Array.isArray(data) ? data : []))
      .catch(() => { toast.error(t("admin_rewards_err")); setRewards([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? rewards : rewards.filter((r) => r.status === filter);

  const totalPending = rewards.filter((r) => r.status === "pending").reduce((s, r) => s + (r.amount ?? 0), 0);
  const totalPaid = rewards.filter((r) => r.status === "paid").reduce((s, r) => s + (r.amount ?? 0), 0);

  const create = async () => {
    if (!form.userId) return toast.error(t("admin_rewards_err_fields"));
    if (!form.amount || form.amount <= 0) return toast.error(t("admin_rewards_err_fields"));
    setSaving(true);
    try {
      await adminAPI.createReward(form);
      toast.success(t("admin_rewards_created"));
      setDialog(false);
      setForm(emptyForm);
      load();
    } catch (e: any) {
      toast.error(e.message || t("admin_err"));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await adminAPI.updateRewardStatus(id, status);
      toast.success(status === "paid" ? t("admin_rewards_marked_paid") : t("admin_rewards_cancelled_ok"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Coins className="h-6 w-6 text-primary" /> {t("admin_rewards_title")}
          <span className="text-sm font-normal text-muted-foreground ml-1">({rewards.length})</span>
        </h1>
        {canEdit && (
          <Button size="sm" onClick={() => { setForm(emptyForm); setDialog(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {t("admin_create")}
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("admin_status_pending")}</div>
          <div className="text-2xl font-bold mt-0.5">{totalPending.toLocaleString()} XOF</div>
        </Card>
        <Card className="p-4 bg-gradient-to-br from-success/15 to-success/5">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("admin_status_paid")}</div>
          <div className="text-2xl font-bold mt-0.5">{totalPaid.toLocaleString()} XOF</div>
        </Card>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "pending", "paid", "cancelled"] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
            className="text-xs h-7"
          >
            {s === "all" ? t("admin_rewards_filter_all") : s === "pending" ? t("admin_status_pending") : s === "paid" ? t("admin_status_paid") : t("admin_status_cancelled")}
            <span className="ml-1.5 text-[10px] opacity-60">
              {s === "all" ? rewards.length : rewards.filter((r) => r.status === s).length}
            </span>
          </Button>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin_rewards_col_user")}</TableHead>
              <TableHead>{t("admin_rewards_col_amount")}</TableHead>
              <TableHead>{t("admin_col_type")}</TableHead>
              <TableHead>{t("admin_rewards_col_reason")}</TableHead>
              <TableHead>{t("admin_col_status")}</TableHead>
              <TableHead>{t("admin_col_date")}</TableHead>
              {canEdit && <TableHead className="text-right">{t("admin_col_actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : filtered.map((r) => {
              const id = r._id ?? r.id;
              return (
                <TableRow key={id}>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {String(r.userId).slice(0, 10)}…
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.amount?.toLocaleString()} {r.currency ?? "XOF"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{r.type}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                    {r.reason ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] ${STATUS_COLORS[r.status] ?? ""}`}>
                      {r.status === "pending" ? t("admin_status_pending") : r.status === "paid" ? t("admin_status_paid") : t("admin_status_cancelled")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.createdAt ? new Date(r.createdAt).toLocaleDateString("fr-FR") : "—"}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      {r.status === "pending" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setStatus(id, "paid")} title={t("admin_rewards_marked_paid")}>
                            <CheckCircle className="h-3.5 w-3.5 text-success" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setStatus(id, "cancelled")} title={t("admin_cancel")}>
                            <XCircle className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!loading && !filtered.length && (
              <TableRow>
                <TableCell colSpan={canEdit ? 7 : 6} className="text-center text-muted-foreground py-10">
                  {t("admin_rewards_no_data")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("admin_rewards_create_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder={t("admin_rewards_field_user_id")} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin_rewards_field_amount")}</label>
                <Input type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin_rewards_field_currency")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {["XOF", "EUR", "USD"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("admin_col_type")}</label>
              <select
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {["prize", "bonus", "grant", "compensation"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <Input placeholder={t("admin_rewards_field_reason")} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>{t("admin_cancel")}</Button>
            <Button onClick={create} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("admin_create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
