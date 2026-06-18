export type MatchProfile = {
  skills?: string[];
  interests?: string[];
  goals?: string[];
  country?: string | null;
  city?: string | null;
  primary_language?: string | null;
  languages_spoken?: string[];
  remote_available?: boolean;
};

export type MatchOpportunity = {
  type?: string;
  tags?: string[];
  skills?: string[];
  country?: string | null;
  remote?: boolean;
  languages?: string[];
};

export function baselineMatch(p: MatchProfile, o: MatchOpportunity): { score: number; reasons: string[] } {
  let score = 40;
  const reasons: string[] = [];
  const safe = (v: any) => (v != null ? String(v).toLowerCase() : "");
  const pSkills = (p.skills || []).map(safe);
  const oSkills = (o.skills || []).concat(o.tags || []).map(safe);
  const skillOverlap = pSkills.filter((s) => s && oSkills.includes(s)).length;
  if (skillOverlap > 0) {
    score += Math.min(25, skillOverlap * 8);
    reasons.push(`${skillOverlap} skill match`);
  }
  const interests = (p.interests || []).concat(p.goals || []).map(safe);
  const interestOverlap = interests.filter((s) => s && oSkills.includes(s)).length;
  if (interestOverlap > 0) {
    score += Math.min(15, interestOverlap * 5);
    reasons.push("interest aligned");
  }
  if (o.country && p.country && safe(o.country) === safe(p.country)) {
    score += 10;
    reasons.push("same country");
  } else if (o.remote && p.remote_available !== false) {
    score += 8;
    reasons.push("remote-friendly");
  }
  const langs = (p.languages_spoken || []).concat(p.primary_language ? [p.primary_language] : []).map(safe);
  if ((o.languages || []).some((l) => langs.includes(safe(l)))) {
    score += 5;
    reasons.push("language match");
  }
  return { score: Math.max(15, Math.min(99, score)), reasons };
}