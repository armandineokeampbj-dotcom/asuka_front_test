import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { adminAPI } from "@/lib/api-client";
import { Award, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/content/badges")({ component: BadgesAdminPage });

const emptyForm = {
  name_fr: "", name_en: "",
  description_fr: "", description_en: "",
  icon: "",
  xp_required: 0,
  category: "achievement",
};

function BadgesAdminPage() {
  const { t } = useLang();
  const { canEdit } = useAdminPermissions();
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.getBadges()
      .then((data: any) => setBadges(data?.badges ?? (Array.isArray(data) ? data : [])))
      .catch(() => { toast.error(t("admin_badges_err")); setBadges([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name_fr && !form.name_en) return toast.error(t("admin_badges_err_name"));
    setSaving(true);
    try {
      await adminAPI.createBadge(form);
      toast.success(t("admin_badges_created"));
      setDialog(false);
      setForm(emptyForm);
      load();
    } catch (e: any) {
      toast.error(e.message || t("admin_err"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce badge ?")) return;
    try {
      await adminAPI.deleteBadge(id);
      toast.success(t("admin_badges_deleted"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" /> {t("admin_nav_badges")}
          <span className="text-sm font-normal text-muted-foreground ml-1">({badges.length})</span>
        </h1>
        {canEdit && (
          <Button size="sm" onClick={() => { setForm(emptyForm); setDialog(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {t("admin_badges_create")}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("admin_loading")}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {badges.map((b) => {
            const id = b._id ?? b.id;
            return (
              <Card key={id} className="p-4 flex flex-col gap-3 relative group">
                <div className="flex items-start gap-3">
                  {b.icon ? (
                    <img src={b.icon} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{b.name_fr || b.name_en}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{b.category}</Badge>
                      {b.xp_required > 0 && (
                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/30">
                          {b.xp_required} XP
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {b.description_fr && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{b.description_fr}</p>
                )}
                {canEdit && (
                  <div className="flex justify-end opacity-0 group-hover:opacity-100 transition">
                    <Button size="sm" variant="ghost" onClick={() => remove(id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
          {!badges.length && (
            <div className="col-span-full text-center text-muted-foreground py-10">{t("admin_badges_no_data")}</div>
          )}
        </div>
      )}

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("admin_badges_create")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder={t("admin_badges_name_fr")} value={form.name_fr} onChange={(e) => setForm({ ...form, name_fr: e.target.value })} />
              <Input placeholder={t("admin_badges_name_en")} value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </div>
            <Textarea placeholder={t("admin_badges_desc_fr")} rows={2} value={form.description_fr} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} />
            <Textarea placeholder={t("admin_badges_desc_en")} rows={2} value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
            <Input placeholder={t("admin_badges_icon_url")} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin_badges_category")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {["achievement", "milestone", "skill", "community", "special"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin_badges_xp_required")}</label>
                <Input
                  type="number"
                  min={0}
                  value={form.xp_required}
                  onChange={(e) => setForm({ ...form, xp_required: Number(e.target.value) })}
                />
              </div>
            </div>
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
