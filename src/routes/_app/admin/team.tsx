import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { adminTeamAPI } from "@/lib/api-client";
import { Shield, Users, Plus, Pencil, Trash2, Ban, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/team")({ component: AdminTeamPage });

type DialogMode = "create-admin-b" | "edit-admin-b" | "create-collab" | "edit-collab" | null;

const emptyAdminBForm = { email: "", password: "", firstName: "", lastName: "" };
const emptyCollabForm = { email: "", password: "", permissions: "editor" as "editor" | "reader", parentAdminId: "", firstName: "", lastName: "" };

function AdminTeamPage() {
  const { t } = useLang();
  const { isSuperAdmin, isAdminB } = useAdminPermissions();

  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [adminsB, setAdminsB] = useState<any[]>([]);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState<DialogMode>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [adminBForm, setAdminBForm] = useState(emptyAdminBForm);
  const [collabForm, setCollabForm] = useState(emptyCollabForm);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: "admin_b" | "collab"; name: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [adminTeamAPI.getCollaborators()];
      if (isSuperAdmin) {
        promises.push(adminTeamAPI.getSuperAdmins(), adminTeamAPI.getAdminsB());
      }
      const results = await Promise.all(promises);
      setCollabs(results[0]?.collaborators ?? []);
      if (isSuperAdmin) {
        setSuperAdmins(results[1]?.superAdmins ?? []);
        setAdminsB(results[2]?.adminsB ?? []);
      }
    } catch {
      toast.error(t("admin_team_err"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [isSuperAdmin]);

  /* ---- Admin B CRUD ---- */
  const openCreateAdminB = () => { setAdminBForm(emptyAdminBForm); setEditTarget(null); setDialog("create-admin-b"); };
  const openEditAdminB = (a: any) => { setAdminBForm({ firstName: a.firstName, lastName: a.lastName, email: a.email, password: "" }); setEditTarget(a); setDialog("edit-admin-b"); };

  const saveAdminB = async () => {
    if (!adminBForm.email) return toast.error(t("admin_team_err_email"));
    if (editTarget && (!adminBForm.firstName || !adminBForm.lastName)) return toast.error(t("admin_team_err_name"));
    if (!editTarget && !adminBForm.password) return toast.error(t("admin_team_err_pw"));
    setSaving(true);
    try {
      if (editTarget) {
        await adminTeamAPI.updateAdminB(editTarget._id, { firstName: adminBForm.firstName, lastName: adminBForm.lastName, email: adminBForm.email });
        toast.success(t("admin_team_updated_admin_b"));
      } else {
        await adminTeamAPI.createAdminB({ email: adminBForm.email, password: adminBForm.password });
        toast.success(t("admin_team_created_admin_b"));
      }
      setDialog(null);
      load();
    } catch (e: any) {
      toast.error(e.message || t("admin_err"));
    } finally {
      setSaving(false);
    }
  };

  const toggleAdminBStatus = async (a: any) => {
    const newStatus = a.status === "active" ? "blocked" : "active";
    try {
      await adminTeamAPI.setAdminBStatus(a._id, newStatus);
      toast.success(newStatus === "blocked" ? t("admin_team_blocked_admin_b") : t("admin_team_unblocked_admin_b"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  /* ---- Collaborator CRUD ---- */
  const openCreateCollab = () => { setCollabForm({ ...emptyCollabForm, parentAdminId: adminsB[0]?._id ?? "" }); setEditTarget(null); setDialog("create-collab"); };
  const openEditCollab = (c: any) => { setCollabForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, password: "", permissions: c.permissions ?? "reader", parentAdminId: c.parentAdminId ?? "" }); setEditTarget(c); setDialog("edit-collab"); };

  const saveCollab = async () => {
    if (!collabForm.email) return toast.error(t("admin_team_err_email"));
    if (editTarget && (!collabForm.firstName || !collabForm.lastName)) return toast.error(t("admin_team_err_name"));
    if (!editTarget && !collabForm.password) return toast.error(t("admin_team_err_pw"));
    setSaving(true);
    try {
      if (editTarget) {
        await adminTeamAPI.updateCollaborator(editTarget._id, { firstName: collabForm.firstName, lastName: collabForm.lastName, email: collabForm.email, permissions: collabForm.permissions });
        toast.success(t("admin_team_updated_collab"));
      } else {
        await adminTeamAPI.createCollaborator({
          email: collabForm.email,
          password: collabForm.password,
          permissions: collabForm.permissions,
          ...(isSuperAdmin ? { parentAdminId: collabForm.parentAdminId } : {}),
        });
        toast.success(t("admin_team_created_collab"));
      }
      setDialog(null);
      load();
    } catch (e: any) {
      toast.error(e.message || t("admin_err"));
    } finally {
      setSaving(false);
    }
  };

  const toggleCollabStatus = async (c: any) => {
    const newStatus = c.status === "active" ? "blocked" : "active";
    try {
      await adminTeamAPI.setCollaboratorStatus(c._id, newStatus);
      toast.success(newStatus === "blocked" ? t("admin_team_blocked_collab") : t("admin_team_unblocked_collab"));
      load();
    } catch {
      toast.error(t("admin_err"));
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "admin_b") {
        await adminTeamAPI.deleteAdminB(confirmDelete.id);
        toast.success(t("admin_team_deleted_admin_b"));
      } else {
        await adminTeamAPI.deleteCollaborator(confirmDelete.id);
        toast.success(t("admin_team_deleted_collab"));
      }
      setConfirmDelete(null);
      load();
    } catch (e: any) {
      toast.error(e.message || t("admin_err"));
    }
  };

  const statusBadge = (status: string) =>
    status === "active"
      ? <Badge className="bg-success/15 border-success/30 text-foreground text-[10px]">{t("admin_status_active")}</Badge>
      : <Badge className="bg-destructive/15 border-destructive/30 text-foreground text-[10px]">{t("admin_status_blocked")}</Badge>;

  if (loading) {
    return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("admin_loading")}</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" /> {isSuperAdmin ? t("admin_team_title") : t("admin_team_my_team")}
      </h1>

      {/* Super Admins (lecture seule) */}
      {isSuperAdmin && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Super Admins</h2>
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin_col_name")}</TableHead>
                  <TableHead>{t("admin_col_email")}</TableHead>
                  <TableHead>{t("admin_team_col_created")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {superAdmins.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell className="font-medium">{a.firstName} {a.lastName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.email}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
                {!superAdmins.length && (
                  <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">{t("admin_team_no_super_admins")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* Admins B */}
      {isSuperAdmin && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t("admin_team_admins_b")}</h2>
            <Button size="sm" onClick={openCreateAdminB} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> {t("admin_team_create_admin_b")}
            </Button>
          </div>
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin_col_name")}</TableHead>
                  <TableHead>{t("admin_col_email")}</TableHead>
                  <TableHead>{t("admin_col_status")}</TableHead>
                  <TableHead>{t("admin_team_col_collabs")}</TableHead>
                  <TableHead>{t("admin_team_col_created")}</TableHead>
                  <TableHead className="text-right">{t("admin_col_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminsB.map((a) => (
                  <TableRow key={a._id}>
                    <TableCell className="font-medium">{a.firstName} {a.lastName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.email}</TableCell>
                    <TableCell>{statusBadge(a.status)}</TableCell>
                    <TableCell className="text-sm">{(a.collaborators ?? []).length}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditAdminB(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleAdminBStatus(a)}>
                          {a.status === "active" ? <Ban className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle className="h-3.5 w-3.5 text-success" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete({ id: a._id, type: "admin_b", name: `${a.firstName} ${a.lastName}` })}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!adminsB.length && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">{t("admin_team_no_admins")}</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </section>
      )}

      {/* Collaborateurs C */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {isAdminB ? "Mes collaborateurs" : t("admin_team_collabs_c")}
          </h2>
          <Button size="sm" onClick={openCreateCollab} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> {t("admin_team_create_collab")}
          </Button>
        </div>
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin_col_name")}</TableHead>
                <TableHead>{t("admin_col_email")}</TableHead>
                {isSuperAdmin && <TableHead>Admin B parent</TableHead>}
                <TableHead>{t("admin_team_perm_label")}</TableHead>
                <TableHead>{t("admin_col_status")}</TableHead>
                <TableHead className="text-right">{t("admin_col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collabs.map((c) => {
                const parent = adminsB.find((a) => a._id === c.parentAdminId);
                return (
                  <TableRow key={c._id}>
                    <TableCell className="font-medium">{c.firstName} {c.lastName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.email}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-xs text-muted-foreground">
                        {parent ? `${parent.firstName} ${parent.lastName}` : c.parentAdminId?.slice(0, 8) ?? "—"}
                      </TableCell>
                    )}
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${c.permissions === "editor" ? "border-primary/40 text-primary" : ""}`}>
                        {c.permissions === "editor" ? t("admin_team_perm_editor") : t("admin_team_perm_reader")}
                      </Badge>
                    </TableCell>
                    <TableCell>{statusBadge(c.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditCollab(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" onClick={() => toggleCollabStatus(c)}>
                          {c.status === "active" ? <Ban className="h-3.5 w-3.5 text-amber-500" /> : <CheckCircle className="h-3.5 w-3.5 text-success" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete({ id: c._id, type: "collab", name: `${c.firstName} ${c.lastName}` })}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!collabs.length && (
                <TableRow><TableCell colSpan={isSuperAdmin ? 6 : 5} className="text-center text-muted-foreground py-6">{t("admin_team_no_collabs")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* Dialog Admin B */}
      <Dialog open={dialog === "create-admin-b" || dialog === "edit-admin-b"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editTarget ? t("admin_team_edit_admin_b") : t("admin_team_create_admin_b")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editTarget && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={t("admin_firstname")} value={adminBForm.firstName} onChange={(e) => setAdminBForm({ ...adminBForm, firstName: e.target.value })} />
                <Input placeholder={t("admin_lastname")} value={adminBForm.lastName} onChange={(e) => setAdminBForm({ ...adminBForm, lastName: e.target.value })} />
              </div>
            )}
            <Input type="email" placeholder={t("admin_col_email")} value={adminBForm.email} onChange={(e) => setAdminBForm({ ...adminBForm, email: e.target.value })} />
            <Input type="password" placeholder={editTarget ? "Nouveau mot de passe (optionnel)" : "Mot de passe temporaire (min. 12 car.)"} value={adminBForm.password} onChange={(e) => setAdminBForm({ ...adminBForm, password: e.target.value })} />
            {!editTarget && <p className="text-xs text-muted-foreground">{t("admin_team_verification_email")}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>{t("admin_cancel")}</Button>
            <Button onClick={saveAdminB} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editTarget ? t("admin_save") : t("admin_create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Collaborateur */}
      <Dialog open={dialog === "create-collab" || dialog === "edit-collab"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>{editTarget ? t("admin_team_edit_collab") : t("admin_team_create_collab")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {editTarget && (
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder={t("admin_firstname")} value={collabForm.firstName} onChange={(e) => setCollabForm({ ...collabForm, firstName: e.target.value })} />
                <Input placeholder={t("admin_lastname")} value={collabForm.lastName} onChange={(e) => setCollabForm({ ...collabForm, lastName: e.target.value })} />
              </div>
            )}
            <Input type="email" placeholder={t("admin_col_email")} value={collabForm.email} onChange={(e) => setCollabForm({ ...collabForm, email: e.target.value })} />
            <Input type="password" placeholder={editTarget ? "Nouveau mot de passe (optionnel)" : "Mot de passe temporaire (min. 12 car.)"} value={collabForm.password} onChange={(e) => setCollabForm({ ...collabForm, password: e.target.value })} />
            {!editTarget && <p className="text-xs text-muted-foreground">{t("admin_team_verification_email")}</p>}
            <div>
              <label className="text-xs text-muted-foreground font-medium block mb-1.5">{t("admin_team_perm_label")}</label>
              <div className="flex gap-4">
                {(["editor", "reader"] as const).map((perm) => (
                  <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={collabForm.permissions === perm} onChange={() => setCollabForm({ ...collabForm, permissions: perm })} />
                    {perm === "editor" ? t("admin_team_perm_editor") : t("admin_team_perm_reader")}
                  </label>
                ))}
              </div>
            </div>
            {isSuperAdmin && !editTarget && (
              <div>
                <label className="text-xs text-muted-foreground font-medium block mb-1.5">{t("admin_team_responsible")}</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={collabForm.parentAdminId}
                  onChange={(e) => setCollabForm({ ...collabForm, parentAdminId: e.target.value })}
                >
                  <option value="">{t("admin_team_select_admin")}</option>
                  {adminsB.map((a) => (
                    <option key={a._id} value={a._id}>{a.firstName} {a.lastName}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>{t("admin_cancel")}</Button>
            <Button onClick={saveCollab} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : editTarget ? t("admin_save") : t("admin_create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmation suppression */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" /> {t("admin_delete_confirm")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {t("admin_delete")} <strong>{confirmDelete?.name}</strong> ?
            {confirmDelete?.type === "admin_b" && (
              <span className="block mt-1 text-destructive font-medium">
                {t("admin_team_delete_warning")}
              </span>
            )}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(null)}>{t("admin_cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete}>{t("admin_delete_permanently")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
