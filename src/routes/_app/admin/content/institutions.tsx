import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { adminAPI } from "@/lib/api-client";
import { Building2, Plus, Loader2, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/content/institutions")({ component: InstitutionsAdminPage });

const emptyForm = {
  name: "", description: "", website: "", country: "", type: "university",
};

function InstitutionsAdminPage() {
  const { t } = useLang();
  const { canEdit } = useAdminPermissions();
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    adminAPI.getInstitutions()
      .then((data: any) => setInstitutions(data?.institutions ?? (Array.isArray(data) ? data : [])))
      .catch(() => { toast.error(t("admin_inst_err")); setInstitutions([]); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return toast.error(t("admin_inst_err_name"));
    setSaving(true);
    try {
      await adminAPI.createInstitution(form);
      toast.success(t("admin_inst_created"));
      setDialog(false);
      setForm(emptyForm);
      load();
    } catch (e: any) {
      toast.error(e.message || t("admin_err"));
    } finally {
      setSaving(false);
    }
  };

  const verify = async (id: string) => {
    try {
      await adminAPI.verifyInstitution(id);
      toast.success(t("admin_inst_verified_ok"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer cette institution ?")) return;
    try {
      await adminAPI.deleteInstitution(id);
      toast.success(t("admin_inst_deleted"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  const unverified = institutions.filter((i) => !i.verified);
  const verified = institutions.filter((i) => i.verified);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="h-6 w-6 text-primary" /> {t("admin_nav_institutions")}
          <span className="text-sm font-normal text-muted-foreground ml-1">({institutions.length})</span>
        </h1>
        {canEdit && (
          <Button size="sm" onClick={() => { setForm(emptyForm); setDialog(true); }} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {t("admin_add")}
          </Button>
        )}
      </div>

      {unverified.length > 0 && canEdit && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <p className="text-sm font-medium mb-3 text-amber-500">{unverified.length} {t("admin_inst_pending")}</p>
          <div className="space-y-2">
            {unverified.map((inst) => {
              const id = inst._id ?? inst.id;
              return (
                <div key={id} className="flex items-center justify-between text-sm py-2 border-b border-border/50 last:border-0">
                  <div>
                    <span className="font-medium">{inst.name}</span>
                    {inst.country && <span className="text-muted-foreground ml-2">— {inst.country}</span>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => verify(id)} className="h-7 text-xs gap-1">
                      <CheckCircle className="h-3 w-3 text-success" /> {t("admin_verify")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(id)} className="h-7">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin_col_name")}</TableHead>
              <TableHead>{t("admin_col_type")}</TableHead>
              <TableHead>{t("admin_inst_field_country")}</TableHead>
              <TableHead>{t("admin_col_status")}</TableHead>
              {canEdit && <TableHead className="text-right">{t("admin_col_actions")}</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : verified.map((inst) => {
              const id = inst._id ?? inst.id;
              return (
                <TableRow key={id}>
                  <TableCell className="font-medium">
                    {inst.name}
                    {inst.website && (
                      <a href={inst.website} target="_blank" rel="noopener noreferrer" className="block text-xs text-muted-foreground hover:text-primary">
                        {inst.website}
                      </a>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{inst.type}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{inst.country ?? "—"}</TableCell>
                  <TableCell>
                    <Badge className="text-[10px] bg-success/15 border-success/30 text-foreground">{t("admin_status_verified")}</Badge>
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => remove(id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
            {!loading && !verified.length && (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="text-center text-muted-foreground py-10">
                  {t("admin_inst_no_verified")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialog} onOpenChange={setDialog}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{t("admin_inst_add_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input placeholder={t("admin_inst_field_name")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Textarea placeholder={t("admin_description")} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">{t("admin_col_type")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {["university", "school", "ngo", "company", "government", "research", "other"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <Input placeholder={t("admin_inst_field_country")} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <Input placeholder={t("admin_inst_field_website")} value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(false)}>{t("admin_cancel")}</Button>
            <Button onClick={create} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("admin_add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
