import { apiCall } from "@/lib/api-client";

export async function awardXp(userId: string, amount: number, reason: string, metadata: Record<string, unknown> = {}) {
  try {
    await apiCall("/api/xp-events", {
      method: "POST",
      body: JSON.stringify({ userId, amount, reason, metadata }),
    });
  } catch (error) {
    console.error("Failed to award XP:", error);
  }
}

export async function notify(userId: string, title: string, body?: string, kind: "system" | "opportunity" | "application" | "coach" | "profile" | "pulse" | "reward" = "system", data: Record<string, unknown> = {}) {
  try {
    await apiCall("/api/notifications", {
      method: "POST",
      body: JSON.stringify({ userId, title, body, kind, data }),
    });
  } catch (error) {
    console.error("Failed to send notification:", error);
  }
}

export async function awardBadgeIfMissing(userId: string, badgeId: string) {
  try {
    const result = await apiCall<{ awarded: boolean }>("/api/user-badges/award", {
      method: "POST",
      body: JSON.stringify({ userId, badgeId }),
    });
    return result.awarded || false;
  } catch (error) {
    console.error("Failed to award badge:", error);
    return false;
  }
}