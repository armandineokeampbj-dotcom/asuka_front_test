import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminTeamAPI } from "@/lib/api-client";
import { ScrollText, ChevronLeft, ChevronRight, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useLang } from "@/i18n/LanguageProvider";

export const Route = createFileRoute("/_app/admin/logs")({ component: AdminLogsPage });

function AdminLogsPage() {
  const { t } = useLang();

  const ACTION_LABELS: Record<string, string> = {
    create_admin_b: t("admin_log_create_admin_b"),
    update_admin_b: t("admin_log_edit_admin_b"),
    delete_admin_b: t("admin_log_delete_admin_b"),
    active_admin_b: t("admin_log_unblock_admin_b"),
    blocked_admin_b: t("admin_log_block_admin_b"),
    create_collaborator_c: t("admin_log_create_collab"),
    update_collaborator_c: t("admin_log_edit_collab"),
    delete_collaborator_c: t("admin_log_delete_collab"),
    active_collaborator_c: t("admin_log_unblock_collab"),
    blocked_collaborator_c: t("admin_log_block_collab"),
  };

  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAdmin, setFilterAdmin] = useState("");
  const [filterAction, setFilterAction] = useState("");

  const load = async (p = page) => {
    setLoading(true);
    try {
      const data: any = await adminTeamAPI.getLogs({
        page: p,
        limit: 50,
        ...(filterAdmin ? { adminId: filterAdmin } : {}),
        ...(filterAction ? { action: filterAction } : {}),
      });
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
    } catch {
      toast.error(t("admin_err"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); setPage(1); }, [filterAdmin, filterAction]);

  const roleColor = (role: string) =>
    role === "super_admin" ? "bg-primary/10 text-primary" :
    role === "admin_b" ? "bg-secondary/10 text-secondary-foreground" :
    "bg-muted";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-primary" /> {t("admin_logs_title")}
          <span className="text-sm font-normal text-muted-foreground ml-1">({total} entrées)</span>
        </h1>
        <Button size="sm" variant="outline" onClick={() => load(page)} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder={t("admin_logs_filter")}
          value={filterAdmin}
          onChange={(e) => setFilterAdmin(e.target.value)}
          className="max-w-[220px] text-xs h-8"
        />
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="">{t("admin_logs_all")}</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("admin_col_date")}</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Cible</TableHead>
              <TableHead>Détails</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : logs.map((log) => (
              <TableRow key={log._id}>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono">{String(log.adminId).slice(0, 8)}…</div>
                  <Badge className={`text-[10px] mt-0.5 ${roleColor(log.adminRole)}`}>{log.adminRole}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-[10px]">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {log.targetType && <span className="mr-1">{log.targetType}</span>}
                  {log.targetId && <span className="font-mono">{String(log.targetId).slice(0, 8)}…</span>}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {log.details ? JSON.stringify(log.details).slice(0, 80) : "—"}
                </TableCell>
              </TableRow>
            ))}
            {!loading && !logs.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                  {t("admin_logs_not_found")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} / {pages}</p>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => { setPage(page - 1); load(page - 1); }}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => { setPage(page + 1); load(page + 1); }}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
