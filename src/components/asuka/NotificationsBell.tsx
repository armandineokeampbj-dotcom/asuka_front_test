import { useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { apiCall } from "@/lib/api-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useLang } from "@/i18n/LanguageProvider";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  kind: string;
};

export function NotificationsBell() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [items, setItems] = useState<Notif[]>([]);

  const load = async () => {
    if (!user) return;
    try {
      const data = await apiCall("/api/notifications");
      setItems((data.notifications as Notif[]) ?? []);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  useEffect(() => {
    if (!user?.id) return;
    
    // Load notifications ONCE on mount
    load();
    
    // No polling - notifications are loaded once and updated when user performs actions
  }, [user?.id]);

  const unread = items.filter((n) => !n.read_at).length;

  const markAll = async () => {
    if (!user) return;
    try {
      await apiCall("/api/notifications/mark-all-read", {
        method: "PUT",
      });
      load();
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative h-9 w-9 rounded-full inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-semibold">
            {lang === "fr" ? "Notifications" : "Notifications"}
          </span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAll}>
              <CheckCheck className="h-3 w-3 mr-1" />
              {lang === "fr" ? "Tout lire" : "Mark all read"}
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {lang === "fr" ? "Aucune notification" : "No notifications yet"}
            </div>
          ) : (
            items.map((n) => (
              <div
                key={n.id}
                className={`px-3 py-2.5 border-b last:border-0 text-sm ${
                  !n.read_at ? "bg-primary/5" : ""
                }`}
              >
                <div className="font-medium leading-snug">{n.title}</div>
                {n.body && (
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{n.body}</div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">
                  {new Date(n.created_at).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
                </div>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}