/**
 * Dynamic Score Calculation
 * Scores are calculated based on profile completion and content
 */

export interface ScoreInputs {
  completion: number; // 0-100
  experienceCount: number;
  skillsCount: number;
  educationCount: number;
  portfolioCount: number;
  hasResume: boolean;
  verifications?: Record<string, boolean>;
}

/**
 * Calculate individual scores based on profile completeness and content
 */
export function calculateDynamicScores(inputs: ScoreInputs) {
  const {
    completion,
    experienceCount,
    skillsCount,
    educationCount,
    portfolioCount,
    hasResume,
    verifications = {},
  } = inputs;

  // Base score from profile completion (40% weight)
  const completionBase = (completion / 100) * 100;

  // Employability: completion + experience + skills
  const employability = Math.min(100, 40 + (completion * 0.4) + (experienceCount * 8) + (skillsCount * 3));

  // Leadership: experience + skills in management/leadership contexts
  const leadership = Math.min(100, 40 + (completion * 0.3) + (experienceCount * 10) + (portfolioCount * 5));

  // Digital: skills count heavily influences this
  const digital = Math.min(100, 40 + (completion * 0.3) + (skillsCount * 6) + (portfolioCount * 5));

  // Communication: completion + experience
  const communication = Math.min(100, 40 + (completion * 0.4) + (experienceCount * 8) + (portfolioCount * 3));

  // Entrepreneurship: portfolio + skills + resume
  const entrepreneurship = Math.min(100, 35 + (completion * 0.3) + (portfolioCount * 8) + (skillsCount * 4) + (hasResume ? 15 : 0));

  // Community: education + certifications + completion
  const community = Math.min(100, 40 + (completion * 0.4) + (educationCount * 10) + (Object.values(verifications).filter(Boolean).length * 10));

  return {
    employability: Math.round(employability),
    leadership: Math.round(leadership),
    digital: Math.round(digital),
    communication: Math.round(communication),
    entrepreneurship: Math.round(entrepreneurship),
    community: Math.round(community),
  };
}

/**
 * Calculate overall profile readiness for different opportunity types
 */
export function calculateReadiness(inputs: ScoreInputs) {
  const scores = calculateDynamicScores(inputs);
  const completion = inputs.completion;
  
  return {
    job: Math.round((scores.employability + scores.communication) / 2 * (completion / 100)),
    internship: Math.round((scores.employability + scores.digital + scores.community) / 3 * (completion / 100)),
    freelance: Math.round((scores.digital + scores.entrepreneurship + scores.community) / 3 * (completion / 100)),
    entrepreneurship: Math.round((scores.entrepreneurship + scores.leadership + scores.digital) / 3 * (completion / 100)),
    leadership: Math.round((scores.leadership + scores.communication + scores.community) / 3 * (completion / 100)),
  };
}

/**
 * Merge default scores with dynamic scores
 * Prefers dynamic scores if completion > 0, otherwise uses defaults
 */
export function getDisplayScores(
  completion: number,
  inputs: ScoreInputs,
  defaultScores?: Record<string, number>
) {
  if (completion === 0) {
    // Use default scores if no profile completion
    return defaultScores || {
      employability: 60,
      leadership: 55,
      digital: 65,
      communication: 60,
      entrepreneurship: 50,
      community: 55,
    };
  }

  // Use dynamically calculated scores based on completion and content
  return calculateDynamicScores(inputs);
}
