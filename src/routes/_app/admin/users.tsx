import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { adminAPI, apiCall } from "@/lib/api-client";
import { Users, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/users")({ component: AdminUsersPage });

function AdminUsersPage() {
  const { t } = useLang();
  const { canEdit } = useAdminPermissions();
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [notifTarget, setNotifTarget] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    adminAPI.getUsers().then((data: any) => {
      setUsers(data.users ?? []);
    }).catch(() => toast.error(t("admin_users_err"))).finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || u.email?.toLowerCase().includes(q) || u.firstName?.toLowerCase().includes(q) || u.lastName?.toLowerCase().includes(q);
  });

  const sendNotif = async () => {
    if (!notifTitle || !notifTarget) return toast.error(t("admin_users_err_fields"));
    setSending(true);
    try {
      await apiCall("/api/notifications", {
        method: "POST",
        body: JSON.stringify({ user_id: notifTarget, title: notifTitle, body: notifBody || notifTitle, type: "system" }),
      });
      toast.success(t("admin_users_sent"));
      setNotifTitle(""); setNotifBody(""); setNotifTarget("");
    } catch {
      toast.error(t("admin_users_send_fail"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Users className="h-6 w-6 text-primary" /> {t("admin_users_title")}
      </h1>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("admin_users_search")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Card className="p-0 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("admin_col_name")}</TableHead>
                  <TableHead>{t("admin_col_email")}</TableHead>
                  <TableHead>{t("admin_col_role")}</TableHead>
                  <TableHead>{t("admin_col_status")}</TableHead>
                  <TableHead>XP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filtered.slice(0, 100).map((u) => (
                  <TableRow key={u._id}>
                    <TableCell className="font-medium">{u.firstName} {u.lastName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{u.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={u.status === "active" ? "bg-success/15 border-success/30 text-foreground" : "bg-destructive/15 text-foreground"}>
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{u.xp?.toLocaleString() ?? 0}</TableCell>
                  </TableRow>
                ))}
                {!loading && !filtered.length && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">{t("admin_users_no_results")}</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
          {filtered.length > 100 && (
            <p className="text-xs text-muted-foreground text-center">{t("admin_users_showing")} {filtered.length}</p>
          )}
        </div>

        {/* Notification ciblée */}
        {canEdit && (
          <Card className="p-5 space-y-3 h-fit">
            <h3 className="font-semibold text-sm">{t("admin_users_send_notif")}</h3>
            <Input placeholder={t("admin_users_notif_user_id")} value={notifTarget} onChange={(e) => setNotifTarget(e.target.value)} />
            <Input placeholder={t("admin_users_notif_title")} value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} />
            <Textarea placeholder={t("admin_users_notif_body")} value={notifBody} onChange={(e) => setNotifBody(e.target.value)} rows={3} />
            <Button onClick={sendNotif} disabled={sending} className="w-full bg-gradient-hero border-0">
              {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("admin_send")}
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
