import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAuth } from "@/context/AuthProvider";
import { adminAPI, apiCall } from "@/lib/api-client";
import { Shield, Plus, CheckCircle2, XCircle, Loader2, BarChart3, Building2, Award, Brain, Coins, Flag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

function AdminPage() {
  const { user } = useAuth();
  const { isAdmin, loading } = useIsAdmin();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="p-10 text-center border-dashed space-y-3">
        <Shield className="h-8 w-8 mx-auto text-muted-foreground" />
        <h2 className="text-xl font-semibold">Admin access required</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          You don't have admin privileges yet. Ask another admin to grant you access, or use the
          backend to grant the <code className="px-1 py-0.5 rounded bg-muted">admin</code> role to
          your user (id: <code className="px-1 py-0.5 rounded bg-muted">{user?.id}</code>).
        </p>
        <Button asChild variant="outline"><Link to="/dashboard">Back to dashboard</Link></Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2"><Shield className="h-6 w-6 text-primary" /> Admin</h1>
        <p className="text-muted-foreground mt-1">Moderate opportunities, pulses, and grant roles.</p>
      </div>
      <Tabs defaultValue="opps">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="analytics"><BarChart3 className="h-3.5 w-3.5 mr-1" />Analytics</TabsTrigger>
          <TabsTrigger value="opps">Opportunities</TabsTrigger>
          <TabsTrigger value="moderation"><Flag className="h-3.5 w-3.5 mr-1" />Moderation</TabsTrigger>
          <TabsTrigger value="pulses">Pulses</TabsTrigger>
          <TabsTrigger value="insights"><Brain className="h-3.5 w-3.5 mr-1" />AI Insights</TabsTrigger>
          <TabsTrigger value="badges"><Award className="h-3.5 w-3.5 mr-1" />Badges</TabsTrigger>
          <TabsTrigger value="institutions"><Building2 className="h-3.5 w-3.5 mr-1" />Institutions</TabsTrigger>
          <TabsTrigger value="rewards"><Coins className="h-3.5 w-3.5 mr-1" />Rewards</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="users">Notify</TabsTrigger>
        </TabsList>
        <TabsContent value="analytics" className="mt-4"><AnalyticsAdmin /></TabsContent>
        <TabsContent value="opps" className="mt-4"><OppsAdmin /></TabsContent>
        <TabsContent value="moderation" className="mt-4"><ModerationAdmin /></TabsContent>
        <TabsContent value="pulses" className="mt-4"><PulsesAdmin /></TabsContent>
        <TabsContent value="insights" className="mt-4"><InsightsAdmin /></TabsContent>
        <TabsContent value="badges" className="mt-4"><BadgesAdmin /></TabsContent>
        <TabsContent value="institutions" className="mt-4"><InstitutionsAdmin /></TabsContent>
        <TabsContent value="rewards" className="mt-4"><RewardsAdmin /></TabsContent>
        <TabsContent value="roles" className="mt-4"><RolesAdmin /></TabsContent>
        <TabsContent value="users" className="mt-4"><UsersAdmin /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------- Opportunities ---------- */
function OppsAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title_fr: "", title_en: "", description_fr: "", description_en: "",
    org_name: "", location: "", type: "job", deadline: "", emoji: "✨",
  });

  const load = async () => {
    try {
      const data = await adminAPI.getOpportunities();
      setRows(data.opportunities ?? []);
    } catch (error) {
      toast.error("Failed to load opportunities");
    }
  };
  
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: "approved" | "rejected" | "draft" | "archived") => {
    try {
      await adminAPI.updateOpportunityStatus(id, status);
      toast.success(`Status → ${status}`);
      load();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const create = async () => {
    if (!user) return;
    if (!form.title_fr || !form.title_en) return toast.error("Title (FR & EN) required");
    setCreating(true);
    try {
      await adminAPI.createOpportunity({
        ...form,
        deadline: form.deadline || null,
        created_by: user.id,
        status: "approved",
        languages: ["fr", "en"],
      });
      toast.success("Opportunity created");
      setForm({ title_fr: "", title_en: "", description_fr: "", description_en: "", org_name: "", location: "", type: "job", deadline: "", emoji: "✨" });
      load();
    } catch (error) {
      toast.error("Failed to create opportunity");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Org</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.title_en}<div className="text-xs text-muted-foreground">{r.title_fr}</div></TableCell>
                <TableCell className="text-xs">{r.org_name ?? "—"}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.type}</Badge></TableCell>
                <TableCell>
                  <Badge className={r.status === "approved" ? "bg-success/15 border-success/30 text-foreground" : r.status === "pending" ? "bg-accent/20 border-accent/30 text-foreground" : "bg-muted border-border text-foreground"}>{r.status}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  {r.status !== "approved" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "approved")}><CheckCircle2 className="h-3.5 w-3.5 text-success" /></Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(r.id, "rejected")}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No opportunities yet.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-5 space-y-3 h-fit">
        <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> New opportunity</h3>
        <Input placeholder="Title (FR)" value={form.title_fr} onChange={(e) => setForm({ ...form, title_fr: e.target.value })} />
        <Input placeholder="Title (EN)" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Org" value={form.org_name} onChange={(e) => setForm({ ...form, org_name: e.target.value })} />
          <Input placeholder="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {["job","internship","scholarship","training","grant","mentorship","fellowship","challenge","volunteering","entrepreneurship","freelance"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
        </div>
        <Input placeholder="Emoji" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} />
        <Textarea placeholder="Description (FR)" value={form.description_fr} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} rows={2} />
        <Textarea placeholder="Description (EN)" value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} rows={2} />
        <Button onClick={create} disabled={creating} className="w-full bg-gradient-hero border-0">
          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Publish"}
        </Button>
      </Card>
    </div>
  );
}

/* ---------- Pulses ---------- */
function PulsesAdmin() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({
    topic_fr: "",
    topic_en: "",
    reward_points: 15,
    questionsRaw: `Q: Quelle est ta priorité ? || What's your priority?\nA | A\nB | B\nC | C\n---\nQ: Pourquoi ? || Why?\nTemps | Time\nArgent | Money`,
  });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const data = await adminAPI.getSurveys();
      setRows(data ?? []);
    } catch (error) {
      toast.error("Failed to load pulses");
    }
  };
  useEffect(() => { load(); }, []);

  const togglePub = async (id: string, current: boolean) => {
    try {
      await adminAPI.updateSurvey(id, { is_published: !current });
      load();
    } catch (error) {
      toast.error("Failed to update pulse");
    }
  };

  const create = async () => {
    if (!user) return;
    // Parse multi-question format: blocks separated by `---`, each starting with `Q: fr || en`, then options `fr | en`
    const blocks = form.questionsRaw.split(/\n-{3,}\n/).map((b) => b.trim()).filter(Boolean);
    const questions = blocks.map((block, qi) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const head = lines[0].replace(/^Q:\s*/i, "");
      const [pfr, pen] = head.split("||").map((s) => s.trim());
      const opts = lines.slice(1).map((line, i) => {
        const [fr, en] = line.split("|").map((s) => s.trim());
        return { id: String.fromCharCode(97 + i), label: { fr, en: en || fr } };
      });
      return { id: `q${qi + 1}`, prompt_fr: pfr, prompt_en: pen || pfr, options: opts };
    });
    if (!questions.length || questions.some((q) => q.options.length < 2)) {
      return toast.error("Each question needs at least 2 options");
    }
    setBusy(true);
    try {
      await adminAPI.createSurvey({
        topic_fr: form.topic_fr, topic_en: form.topic_en,
        question_fr: questions[0].prompt_fr, question_en: questions[0].prompt_en,
        options: questions[0].options as any,
        questions: questions as any,
        reward_points: Number(form.reward_points) || 15,
        is_published: true, created_by: user.id,
      });
      toast.success("Pulse created");
      setForm({ ...form, topic_fr: "", topic_en: "" });
      load();
    } catch (error) {
      toast.error("Failed to create pulse");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{r.topic_en || r.question_en}</div>
              <div className="text-xs text-muted-foreground">
                {(Array.isArray(r.questions) ? r.questions.length : 1)} questions · +{r.reward_points ?? 15} XP
              </div>
            </div>
            <Button size="sm" variant={r.is_published ? "outline" : "default"} onClick={() => togglePub(r.id, r.is_published)}>
              {r.is_published ? "Unpublish" : "Publish"}
            </Button>
          </Card>
        ))}
        {!rows.length && <Card className="p-8 text-center text-muted-foreground border-dashed">No pulses.</Card>}
      </div>
      <Card className="p-5 space-y-3 h-fit">
        <h3 className="font-semibold flex items-center gap-2"><Plus className="h-4 w-4" /> New pulse</h3>
        <Input placeholder="Topic (FR)" value={form.topic_fr} onChange={(e) => setForm({ ...form, topic_fr: e.target.value })} />
        <Input placeholder="Topic (EN)" value={form.topic_en} onChange={(e) => setForm({ ...form, topic_en: e.target.value })} />
        <Input type="number" placeholder="Reward XP" value={form.reward_points}
          onChange={(e) => setForm({ ...form, reward_points: Number(e.target.value) })} />
        <Textarea rows={10} value={form.questionsRaw}
          onChange={(e) => setForm({ ...form, questionsRaw: e.target.value })}
          placeholder={`Q: question FR || question EN\noption fr | option en\n...\n---\nQ: next question FR || EN\n...`} />
        <p className="text-[11px] text-muted-foreground">Separate questions with a line of <code>---</code>. First line of each block: <code>Q: FR || EN</code>. Then one option per line: <code>FR | EN</code>.</p>
        <Button onClick={create} disabled={busy} className="w-full bg-gradient-hero border-0">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Create"}</Button>
      </Card>
    </div>
  );
}

/* ---------- Roles ---------- */
function RolesAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("admin");
  const load = async () => {
    try {
      const data = await adminAPI.getUserRoles();
      setRows(data ?? []);
    } catch (error) {
      toast.error("Failed to load roles");
    }
  };
  useEffect(() => { load(); }, []);

  const grant = async () => {
    if (!userId) return toast.error("User ID required");
    try {
      await adminAPI.grantRole({ user_id: userId, role: role as any });
      toast.success("Role granted");
      setUserId("");
      load();
    } catch (error) {
      toast.error("Failed to grant role");
    }
  };

  const revoke = async (id: string) => {
    try {
      await adminAPI.revokeRole(id);
      toast.success("Role revoked");
      load();
    } catch (error) {
      toast.error("Failed to revoke role");
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Role</TableHead><TableHead>Granted</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.user_id}</TableCell>
                <TableCell><Badge>{r.role}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{new Date(r.granted_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => revoke(r.id)}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-5 space-y-3 h-fit">
        <h3 className="font-semibold">Grant role</h3>
        <Input placeholder="User UUID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={role} onChange={(e) => setRole(e.target.value)}>
          {["youth","partner","institution","moderator","admin"].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <Button onClick={grant} className="w-full bg-gradient-hero border-0">Grant</Button>
      </Card>
    </div>
  );
}

/* ---------- Users (broadcast notification) ---------- */
function UsersAdmin() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetId, setTargetId] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    if (!title || !targetId) return toast.error("Target user ID and title required");
    setBusy(true);
    try {
      await apiCall("/api/notifications", {
        method: "POST",
        body: JSON.stringify({
          user_id: targetId,
          title,
          body: body || title,
          type: "system",
        }),
      });
      toast.success("Notification sent");
      setTitle("");
      setBody("");
    } catch (error) {
      toast.error("Failed to send notification");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-3 max-w-lg">
      <h3 className="font-semibold">Send notification to a user</h3>
      <Input placeholder="Target user UUID" value={targetId} onChange={(e) => setTargetId(e.target.value)} />
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Body (optional)" value={body} onChange={(e) => setBody(e.target.value)} rows={3} />
      <Button onClick={send} disabled={busy} className="bg-gradient-hero border-0">{busy ? "Sending…" : "Send"}</Button>
    </Card>
  );
}
/* ---------- Analytics ---------- */
function AnalyticsAdmin() {
  const [stats, setStats] = useState<{ users: number; opps: number; apps: number; pulses: number; rewards: number; xp: number } | null>(null);
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
      } catch (error) {
        toast.error("Failed to load analytics");
      }
    })();
  }, []);

  if (!stats) return <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Computing…</div>;

  const cards = [
    { label: "Youth on platform", value: stats.users, color: "from-primary/20 to-primary/5" },
    { label: "Approved opportunities", value: stats.opps, color: "from-secondary/20 to-secondary/5" },
    { label: "Applications", value: stats.apps, color: "from-accent/20 to-accent/5" },
    { label: "Live pulses", value: stats.pulses, color: "from-success/20 to-success/5" },
    { label: "XP distributed", value: stats.xp.toLocaleString(), color: "from-primary/20 to-secondary/5" },
    { label: "Rewards (XOF)", value: stats.rewards.toLocaleString(), color: "from-accent/20 to-accent/5" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className={`p-5 bg-gradient-to-br ${c.color} border-border/50`}>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</div>
            <div className="text-3xl font-bold mt-1">{c.value}</div>
          </Card>
        ))}
      </div>
      <Card className="p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /> Top opportunities by views</h3>
        <div className="space-y-2">
          {topOpps.map((o) => (
            <div key={o.id} className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0">
              <div className="truncate">{o.title_en} <Badge variant="outline" className="ml-1 text-[10px]">{o.type}</Badge></div>
              <div className="text-muted-foreground">{o.views_count ?? 0} views</div>
            </div>
          ))}
          {!topOpps.length && <div className="text-muted-foreground text-sm">No data yet.</div>}
        </div>
      </Card>
    </div>
  );
}

/* ---------- Moderation queue ---------- */
function ModerationAdmin() {
  const [pending, setPending] = useState<any[]>([]);
  const load = async () => {
    try {
      const data = await adminAPI.getPendingOpportunities();
      setPending(data ?? []);
    } catch (error) {
      toast.error("Failed to load pending opportunities");
    }
  };
  useEffect(() => { load(); }, []);
  const setStatus = async (id: string, status: "approved" | "rejected") => {
    try {
      await adminAPI.updateOpportunityStatus(id, status);
      toast.success(`${status}`);
      load();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };
  return (
    <div className="space-y-3">
      {pending.map((p) => (
        <Card key={p.id} className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2"><Badge variant="outline" className="text-[10px]">{p.type}</Badge><span className="font-medium truncate">{p.title_en}</span></div>
              <div className="text-xs text-muted-foreground mt-0.5">{p.title_fr} · {p.org_name ?? "—"}</div>
              {p.description_en && <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{p.description_en}</p>}
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "approved")}><CheckCircle2 className="h-3.5 w-3.5 text-success mr-1" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => setStatus(p.id, "rejected")}><XCircle className="h-3.5 w-3.5 text-destructive mr-1" />Reject</Button>
            </div>
          </div>
        </Card>
      ))}
      {!pending.length && <Card className="p-10 text-center text-muted-foreground border-dashed"><Flag className="h-6 w-6 mx-auto mb-2" />Inbox zero — nothing pending review.</Card>}
    </div>
  );
}

/* ---------- AI Insights ---------- */
function InsightsAdmin() {
  const { user } = useAuth();
  const [pulses, setPulses] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [pulseId, setPulseId] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ summary_fr: "", summary_en: "" });

  const load = async () => {
    try {
      const [pulsesData, insightsData] = await Promise.all([
        adminAPI.getSurveys(),
        adminAPI.getPulseInsights(),
      ]);
      setPulses(pulsesData ?? []);
      setInsights(insightsData ?? []);
    } catch (error) {
      toast.error("Failed to load insights data");
    }
  };
  useEffect(() => { load(); }, []);

  const generate = async () => {
    if (!pulseId) return toast.error("Pick a pulse");
    setBusy(true);
    try {
      await adminAPI.createPulseInsight({
        pulse_id: pulseId,
        summary_fr: form.summary_fr || `Réponses compilées pour ce pulse.`,
        summary_en: form.summary_en || `Compiled responses for this pulse.`,
      });
      toast.success("Insight saved");
      setForm({ summary_fr: "", summary_en: "" });
      load();
    } catch (error) {
      toast.error("Failed to create insight");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="space-y-3">
        {insights.map((i) => (
          <Card key={i.id} className="p-4">
            <div className="text-xs text-muted-foreground">Pulse · {new Date(i.generated_at).toLocaleString()}</div>
            <div className="font-medium mt-1">{i.summary_en}</div>
            <div className="text-sm text-muted-foreground">{i.summary_fr}</div>
            {i.stats?.total != null && <div className="text-xs mt-2">Total responses: {i.stats.total}</div>}
          </Card>
        ))}
        {!insights.length && <Card className="p-8 text-center text-muted-foreground border-dashed">No insights yet.</Card>}
      </div>
      <Card className="p-5 space-y-3 h-fit">
        <h3 className="font-semibold flex items-center gap-2"><Brain className="h-4 w-4" /> Generate insight</h3>
        <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={pulseId} onChange={(e) => setPulseId(e.target.value)}>
          <option value="">Pick a pulse…</option>
          {pulses.map((p) => <option key={p.id} value={p.id}>{p.question_en || p.topic_en}</option>)}
        </select>
        <Textarea rows={2} placeholder="Summary (FR) — optional, auto-generated if empty" value={form.summary_fr} onChange={(e) => setForm({ ...form, summary_fr: e.target.value })} />
        <Textarea rows={2} placeholder="Summary (EN) — optional" value={form.summary_en} onChange={(e) => setForm({ ...form, summary_en: e.target.value })} />
        <Button onClick={generate} disabled={busy} className="w-full bg-gradient-hero border-0">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Generate"}</Button>
        <p className="text-[11px] text-muted-foreground">Computes vote distribution from responses and stores a multilingual insight.</p>
      </Card>
    </div>
  );
}

/* ---------- Badges (content) ---------- */
function BadgesAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ id: "", name_fr: "", name_en: "", description_fr: "", description_en: "", icon: "🏅", xp_reward: 50 });
  const load = async () => {
    try {
      const data = await adminAPI.getBadges();
      setRows(data ?? []);
    } catch (error) {
      toast.error("Failed to load badges");
    }
  };
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.id || !form.name_fr || !form.name_en) return toast.error("ID + name required");
    try {
      await adminAPI.createBadge(form);
      toast.success("Badge created");
      setForm({ id: "", name_fr: "", name_en: "", description_fr: "", description_en: "", icon: "🏅", xp_reward: 50 });
      load();
    } catch (error) {
      toast.error("Failed to create badge");
    }
  };
  const remove = async (id: string) => {
    try {
      await adminAPI.deleteBadge(id);
      toast.success("Badge deleted");
      load();
    } catch (error) {
      toast.error("Failed to delete badge");
    }
  };
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <div className="grid sm:grid-cols-2 gap-3">
        {rows.map((b) => (
          <Card key={b.id} className="p-4 flex items-start gap-3">
            <div className="text-3xl">{b.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{b.name_en}</div>
              <div className="text-xs text-muted-foreground">{b.name_fr}</div>
              <div className="text-xs mt-1"><Badge variant="outline" className="text-[10px]">+{b.xp_reward} XP</Badge> <code className="text-[10px] text-muted-foreground">{b.id}</code></div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => remove(b.id)}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
          </Card>
        ))}
        {!rows.length && <Card className="p-8 text-center text-muted-foreground border-dashed col-span-2">No badges.</Card>}
      </div>
      <Card className="p-5 space-y-3 h-fit">
        <h3 className="font-semibold flex items-center gap-2"><Award className="h-4 w-4" /> New badge</h3>
        <Input placeholder="ID (e.g. first_application)" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} />
        <div className="grid grid-cols-[60px_1fr] gap-2">
          <Input placeholder="🏅" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
          <Input type="number" placeholder="XP reward" value={form.xp_reward} onChange={(e) => setForm({ ...form, xp_reward: Number(e.target.value) })} />
        </div>
        <Input placeholder="Name (FR)" value={form.name_fr} onChange={(e) => setForm({ ...form, name_fr: e.target.value })} />
        <Input placeholder="Name (EN)" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
        <Textarea rows={2} placeholder="Description (FR)" value={form.description_fr} onChange={(e) => setForm({ ...form, description_fr: e.target.value })} />
        <Textarea rows={2} placeholder="Description (EN)" value={form.description_en} onChange={(e) => setForm({ ...form, description_en: e.target.value })} />
        <Button onClick={create} className="w-full bg-gradient-hero border-0">Create</Button>
      </Card>
    </div>
  );
}

/* ---------- Institutions ---------- */
function InstitutionsAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", country: "", kind: "ngo", website: "", verified: true });
  const load = async () => {
    try {
      const data = await adminAPI.getInstitutions();
      setRows(data ?? []);
    } catch (error) {
      toast.error("Failed to load institutions");
    }
  };
  useEffect(() => { load(); }, []);
  const create = async () => {
    if (!form.name) return toast.error("Name required");
    try {
      await adminAPI.createInstitution(form);
      toast.success("Institution added");
      setForm({ name: "", country: "", kind: "ngo", website: "", verified: true });
      load();
    } catch (error) {
      toast.error("Failed to create institution");
    }
  };
  const toggleVerified = async (id: string, current: boolean) => {
    try {
      if (!current) {
        await adminAPI.verifyInstitution(id);
      }
      load();
    } catch (error) {
      toast.error("Failed to update verification status");
    }
  };
  const remove = async (id: string) => {
    try {
      await adminAPI.deleteInstitution(id);
      toast.success("Institution deleted");
      load();
    } catch (error) {
      toast.error("Failed to delete institution");
    }
  };
  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Kind</TableHead><TableHead>Country</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">{r.name}{r.website && <a href={r.website} target="_blank" rel="noreferrer" className="block text-[11px] text-muted-foreground hover:text-primary">{r.website}</a>}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.kind ?? "—"}</Badge></TableCell>
                <TableCell className="text-xs">{r.country ?? "—"}</TableCell>
                <TableCell>{r.verified ? <Badge className="bg-success/15 border-success/30 text-foreground">verified</Badge> : <Badge variant="outline">unverified</Badge>}</TableCell>
                <TableCell className="text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleVerified(r.id, r.verified)}><CheckCircle2 className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(r.id)}><XCircle className="h-3.5 w-3.5 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No institutions.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-5 space-y-3 h-fit">
        <h3 className="font-semibold flex items-center gap-2"><Building2 className="h-4 w-4" /> New institution</h3>
        <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {["ngo","company","university","government","foundation","incubator","other"].map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
        <Input placeholder="Website" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} />
        <Button onClick={create} className="w-full bg-gradient-hero border-0">Add</Button>
      </Card>
    </div>
  );
}

/* ---------- Rewards (admin grant + ledger) ---------- */
function RewardsAdmin() {
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState({ user_id: "", kind: "stipend", amount: 5000, currency: "XOF", reason: "", source: "manual" });
  const load = async () => {
    try {
      const data = await adminAPI.getRewardsLedger();
      setRows(Array.isArray(data) ? data.slice(0, 50) : []);
    } catch (error) {
      toast.error("Failed to load rewards");
    }
  };
  useEffect(() => { load(); }, []);

  const grant = async () => {
    if (!form.user_id || !form.amount) return toast.error("User + amount required");
    try {
      await adminAPI.createReward({ ...form, status: "approved" });
      toast.success("Reward granted");
      setForm({ user_id: "", kind: "stipend", amount: 5000, currency: "XOF", reason: "", source: "manual" });
      load();
    } catch (error) {
      toast.error("Failed to grant reward");
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await adminAPI.updateRewardStatus(id, status);
      load();
    } catch (error) {
      toast.error("Failed to update reward status");
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Kind</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Set</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-[11px]">{r.user_id.slice(0, 8)}…</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.kind}</Badge></TableCell>
                <TableCell>{Number(r.amount).toLocaleString()} {r.currency}</TableCell>
                <TableCell><Badge>{r.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <select className="h-7 rounded border border-input bg-background px-1 text-xs" value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>
                    {["pending","approved","paid","failed","cancelled"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </TableCell>
              </TableRow>
            ))}
            {!rows.length && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No rewards yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <Card className="p-5 space-y-3 h-fit">
        <h3 className="font-semibold flex items-center gap-2"><Coins className="h-4 w-4" /> Grant reward</h3>
        <Input placeholder="User UUID" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-2 text-sm" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
            {["xp","points","stipend","grant","voucher","badge"].map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <Input placeholder="Currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
        </div>
        <Input type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
        <Input placeholder="Reason (visible to user)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
        <Button onClick={grant} className="w-full bg-gradient-hero border-0">Grant</Button>
        <p className="text-[11px] text-muted-foreground">Future-ready ledger — pluggable to mobile money / bank rails.</p>
      </Card>
    </div>
  );
}
