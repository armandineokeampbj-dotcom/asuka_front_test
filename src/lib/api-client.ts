/**
 * Helper utilities for authenticated API calls
 * This replaces direct Supabase calls with backend API calls
 */

import { getAuthToken } from "@/context/AuthProvider";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

/**
 * Make authenticated API calls with automatic Bearer token injection
 */
export async function apiCall<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const token = getAuthToken();
  const url = new URL(endpoint, API_BASE);

  // Add query parameters if provided
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  const headers = new Headers(options.headers || {});

  // Add authorization header
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Add content-type for JSON by default (skip for FormData — browser sets multipart boundary)
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url.toString(), {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * Rewards API
 */
export const rewardsAPI = {
  getRewards: () => apiCall("/api/rewards"),
  getStats: () => apiCall("/api/rewards/stats"),
};

/**
 * Pulses API
 */
export const pulsesAPI = {
  getPulses: () => apiCall("/api/pulses"),
  getUserResponses: () => apiCall("/api/pulses/responses"),
  submitResponse: (pulseId: string, data: any) =>
    apiCall(`/api/pulses/${pulseId}/responses`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  submitBatchResponses: (pulseId: string, responses: any[]) =>
    apiCall(`/api/pulses/${pulseId}/responses/batch`, {
      method: "POST",
      body: JSON.stringify({ responses }),
    }),
};

/**
 * Profile API
 */
export const profileAPI = {
  getProfile: (userId: string) =>
    apiCall(`/api/profile/${userId}`),
  updateProfile: (userId: string, data: any) =>
    apiCall(`/api/profile/${userId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
  uploadAvatar: (userId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiCall(`/api/profile/${userId}/avatar`, {
      method: "POST",
      body: formData,
      headers: {}, // Don't set Content-Type for FormData
    });
  },
  uploadCV: (userId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiCall(`/api/profile/${userId}/cv`, {
      method: "POST",
      body: formData,
      headers: {},
    });
  },

  // Education
  getEducation: (userId: string) =>
    apiCall(`/api/profile/${userId}/education`),
  addEducation: (userId: string, education: any) =>
    apiCall(`/api/profile/${userId}/education`, {
      method: "POST",
      body: JSON.stringify(education),
    }),
  updateEducation: (userId: string, educationId: string, education: any) =>
    apiCall(`/api/profile/${userId}/education/${educationId}`, {
      method: "PUT",
      body: JSON.stringify(education),
    }),
  deleteEducation: (userId: string, educationId: string) =>
    apiCall(`/api/profile/${userId}/education/${educationId}`, {
      method: "DELETE",
    }),

  // Skills
  getSkills: (userId: string) =>
    apiCall(`/api/profile/${userId}/skills`),
  addSkill: (userId: string, skill: any) =>
    apiCall(`/api/profile/${userId}/skills`, {
      method: "POST",
      body: JSON.stringify(skill),
    }),
  updateSkill: (userId: string, skillId: string, skill: any) =>
    apiCall(`/api/profile/${userId}/skills/${skillId}`, {
      method: "PUT",
      body: JSON.stringify(skill),
    }),
  deleteSkill: (userId: string, skillId: string) =>
    apiCall(`/api/profile/${userId}/skills/${skillId}`, {
      method: "DELETE",
    }),

  // Certifications
  getCertifications: (userId: string) =>
    apiCall(`/api/profile/${userId}/certifications`),
  addCertification: (userId: string, certification: any) =>
    apiCall(`/api/profile/${userId}/certifications`, {
      method: "POST",
      body: JSON.stringify(certification),
    }),  updateCertification: (userId: string, certificationId: string, certification: any) =>
    apiCall(`/api/profile/${userId}/certifications/${certificationId}`, {
      method: "PUT",
      body: JSON.stringify(certification),
    }),  deleteCertification: (userId: string, certId: string) =>
    apiCall(`/api/profile/${userId}/certifications/${certId}`, {
      method: "DELETE",
    }),

  // Experiences
  getExperiences: (userId: string) =>
    apiCall(`/api/profile/${userId}/experiences`),
  addExperience: (userId: string, experience: any) => {
    // Normalize and format dates to ISO format with T and Z for backend validation
    const normalized = {
      title: experience.title ?? experience.role,
      company: experience.company ?? experience.organization,
      startDate: experience.startDate ? `${experience.startDate}T00:00:00Z` : null,
      endDate: experience.endDate ? `${experience.endDate}T00:00:00Z` : null,
      currentlyWorking: experience.currentlyWorking ?? experience.isCurrent ?? false,
      description: experience.description || null,
      location: experience.location ?? experience.sector ?? null,
      kind: experience.kind ?? experience.type ?? null,
      impact: experience.impact || null,
      teamSize: experience.teamSize ?? experience.team_size ?? null,
    };
    console.log("Payload envoyé à /experiences:", JSON.stringify(normalized, null, 2));
    return apiCall(`/api/profile/${userId}/experiences`, {
      method: "POST",
      body: JSON.stringify(normalized),
    });
  },
  updateExperience: (userId: string, experienceId: string, experience: any) => {
    const normalized = {
      title: experience.title ?? experience.role,
      company: experience.company ?? experience.organization,
      kind: experience.kind ?? experience.type ?? "job",
      startDate: experience.startDate ? experience.startDate.split("T")[0] : null,
      endDate: experience.endDate ? experience.endDate.split("T")[0] : null,
      currentlyWorking: experience.currentlyWorking ?? experience.isCurrent ?? false,
      description: experience.description || null,
      impact: experience.impact || null,
      teamSize: experience.teamSize ?? experience.team_size ?? null,
      location: experience.location ?? experience.sector ?? null,
    };
    return apiCall(`/api/profile/${userId}/experiences/${experienceId}`, {
      method: "PUT",
      body: JSON.stringify(normalized),
    });
  },
  deleteExperience: (userId: string, expId: string) =>
    apiCall(`/api/profile/${userId}/experiences/${expId}`, {
      method: "DELETE",
    }),

  // Portfolio
  getPortfolio: (userId: string) =>
    apiCall(`/api/profile/${userId}/portfolio`),
  addPortfolioItem: (userId: string, item: any) =>
    apiCall(`/api/profile/${userId}/portfolio`, {
      method: "POST",
      body: JSON.stringify(item),
    }),  updatePortfolioItem: (userId: string, itemId: string, item: any) =>
    apiCall(`/api/profile/${userId}/portfolio/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(item),
    }),  deletePortfolioItem: (userId: string, portId: string) =>
    apiCall(`/api/profile/${userId}/portfolio/${portId}`, {
      method: "DELETE",
    }),

  // Profile Data (Countries, Cities, Languages)
  getCountries: () =>
    apiCall("/api/profile/data/countries"),
  getCities: (countryCode: string) =>
    apiCall(`/api/profile/data/cities/${countryCode}`),
  getLanguages: () =>
    apiCall("/api/profile/data/languages"),
};

/**
 * Payout Methods API
 */
export const payoutAPI = {
  getMethods: () => apiCall("/api/payout-methods"),
  addMethod: (data: any) =>
    apiCall("/api/payout-methods", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  removeMethod: (methodId: string) =>
    apiCall(`/api/payout-methods/${methodId}`, {
      method: "DELETE",
    }),
  setDefault: (methodId: string) =>
    apiCall(`/api/payout-methods/${methodId}/default`, {
      method: "PUT",
    }),
};

/**
 * User API
 */
export const userAPI = {
  getMe: () => apiCall("/api/me"),
  updateMe: (data: any) =>
    apiCall("/api/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    }),
};

/**
 * Opportunities API
 */
export const opportunitiesAPI = {
  getOpportunities: () => apiCall("/api/opportunities"),
  getOpportunity: (id: string) => apiCall(`/api/opportunities/${id}`),
  applyForOpportunity: (id: string) =>
    apiCall(`/api/opportunities/${id}/apply`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  saveOpportunity: (id: string) =>
    apiCall(`/api/opportunities/${id}/save`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
};

/**
 * Admin API
 */
export const adminAPI = {
  getAnalytics: () => apiCall("/api/admin/analytics"),
  getTopOpportunities: () => apiCall("/api/admin/top-opportunities"),
  getPendingOpportunities: () => apiCall("/api/admin/pending-opportunities"),
  getPulseInsights: () => apiCall("/api/admin/pulse-insights"),
  createPulseInsight: (data: any) =>
    apiCall("/api/admin/pulse-insights", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Surveys/Pulses
  getSurveys: () => apiCall("/api/admin/surveys"),
  createSurvey: (data: any) =>
    apiCall("/api/admin/surveys", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateSurvey: (id: string, data: any) =>
    apiCall(`/api/admin/surveys/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deleteSurvey: (id: string) =>
    apiCall(`/api/admin/surveys/${id}`, {
      method: "DELETE",
    }),

  // Users
  getUsers: () => apiCall("/api/admin/users"),
  getUser: (id: string) => apiCall(`/api/admin/users/${id}`),
  updateUser: (id: string, data: any) =>
    apiCall(`/api/admin/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  // Opportunities
  getOpportunities: () => apiCall("/api/admin/opportunities"),
  createOpportunity: (data: any) =>
    apiCall("/api/admin/opportunities", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateOpportunityStatus: (id: string, status: string) =>
    apiCall(`/api/admin/opportunities/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  deleteOpportunity: (id: string) =>
    apiCall(`/api/admin/opportunities/${id}`, {
      method: "DELETE",
    }),

  // Badges
  getBadges: () => apiCall("/api/admin/badges"),
  createBadge: (data: any) =>
    apiCall("/api/admin/badges", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  deleteBadge: (id: string) =>
    apiCall(`/api/admin/badges/${id}`, {
      method: "DELETE",
    }),

  // Institutions
  getInstitutions: () => apiCall("/api/institutions"),
  createInstitution: (data: any) =>
    apiCall("/api/institutions", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  verifyInstitution: (id: string) =>
    apiCall(`/api/institutions/${id}/verify`, {
      method: "PUT",
    }),
  deleteInstitution: (id: string) =>
    apiCall(`/api/institutions/${id}`, {
      method: "DELETE",
    }),

  // Rewards Ledger
  getRewardsLedger: () => apiCall("/api/rewards-ledger"),
  createReward: (data: any) =>
    apiCall("/api/rewards-ledger", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateRewardStatus: (id: string, status: string) =>
    apiCall(`/api/rewards-ledger/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),

  // User Roles
  getUserRoles: () => apiCall("/api/user-roles"),
  grantRole: (data: any) =>
    apiCall("/api/user-roles", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  revokeRole: (id: string) =>
    apiCall(`/api/user-roles/${id}`, {
      method: "DELETE",
    }),

  // Moderation / Reports
  getReports: () => apiCall("/api/moderation"),
  createReport: (data: any) =>
    apiCall("/api/moderation", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateReportStatus: (id: string, status: string) =>
    apiCall(`/api/moderation/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
};

/**
 * Storage API - MongoDB GridFS
 */
export const storageAPI = {
  uploadFile: async (file: File): Promise<{ fileId: string; url: string; filename: string; size: number }> => {
    const token = getAuthToken();
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(new URL("/api/storage/upload", API_BASE).toString(), {
      method: "POST",
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `Upload failed: ${response.status}`);
    }

    return response.json();
  },

  downloadFile: (fileId: string): string => {
    return new URL(`/api/storage/download/${fileId}`, API_BASE).toString();
  },

  deleteFile: (fileId: string) =>
    apiCall(`/api/storage/delete/${fileId}`, {
      method: "DELETE",
    }),

  listFiles: () => apiCall("/api/storage/list"),
};

/**
 * Coach API
 */
export const coachAPI = {
  callCoach: async (messages: any[], language: string = "en", profile: any = {}) => {
    const token = getAuthToken();
    const url = new URL("/api/coach", API_BASE);

    return fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ messages, language, profile }),
    });
  },

  streamCoach: async (messages: any[], language: string = "en", profile: any = {}) => {
    const token = getAuthToken();
    const url = new URL("/api/coach/stream", API_BASE);

    return fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ messages, language, profile }),
    });
  },

  callProfileAI: (data: any) =>
    apiCall("/api/profile-ai", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

export default {
  rewardsAPI,
  pulsesAPI,
  profileAPI,
  payoutAPI,
  userAPI,
  opportunitiesAPI,
  storageAPI,
  adminAPI,
  coachAPI,
  apiCall,
};
