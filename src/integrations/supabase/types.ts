export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      applications: {
        Row: {
          applied_at: string | null
          created_at: string
          id: string
          match_score: number | null
          notes: string | null
          opportunity_id: string
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          created_at?: string
          id?: string
          match_score?: number | null
          notes?: string | null
          opportunity_id: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          created_at?: string
          id?: string
          match_score?: number | null
          notes?: string | null
          opportunity_id?: string
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "applications_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string
          description_en: string | null
          description_fr: string | null
          icon: string | null
          id: string
          name_en: string
          name_fr: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          icon?: string | null
          id: string
          name_en: string
          name_fr: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          description_en?: string | null
          description_fr?: string | null
          icon?: string | null
          id?: string
          name_en?: string
          name_fr?: string
          xp_reward?: number
        }
        Relationships: []
      }
      certifications: {
        Row: {
          created_at: string
          credential_url: string | null
          document_url: string | null
          expires_at: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credential_url?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credential_url?: string | null
          document_url?: string | null
          expires_at?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      education: {
        Row: {
          achievements: string | null
          country: string | null
          created_at: string
          degree: string | null
          document_url: string | null
          end_date: string | null
          field: string | null
          id: string
          institution: string
          is_current: boolean
          start_date: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: string | null
          country?: string | null
          created_at?: string
          degree?: string | null
          document_url?: string | null
          end_date?: string | null
          field?: string | null
          id?: string
          institution: string
          is_current?: boolean
          start_date?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: string | null
          country?: string | null
          created_at?: string
          degree?: string | null
          document_url?: string | null
          end_date?: string | null
          field?: string | null
          id?: string
          institution?: string
          is_current?: boolean
          start_date?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      endorsements: {
        Row: {
          created_at: string
          endorser_id: string
          id: string
          kind: string
          note: string | null
          skill_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          endorser_id: string
          id?: string
          kind?: string
          note?: string | null
          skill_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          endorser_id?: string
          id?: string
          kind?: string
          note?: string | null
          skill_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "endorsements_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          achievements: string | null
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          impact: string | null
          is_current: boolean
          kind: string
          organization: string | null
          role: string
          sector: string | null
          skills_used: Json
          start_date: string | null
          team_size: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievements?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          impact?: string | null
          is_current?: boolean
          kind?: string
          organization?: string | null
          role: string
          sector?: string | null
          skills_used?: Json
          start_date?: string | null
          team_size?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievements?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          impact?: string | null
          is_current?: boolean
          kind?: string
          organization?: string | null
          role?: string
          sector?: string | null
          skills_used?: Json
          start_date?: string | null
          team_size?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      institutions: {
        Row: {
          country: string | null
          created_at: string
          id: string
          kind: string | null
          logo_url: string | null
          name: string
          owner_id: string | null
          updated_at: string
          verified: boolean
          website: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          logo_url?: string | null
          name: string
          owner_id?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          kind?: string | null
          logo_url?: string | null
          name?: string
          owner_id?: string | null
          updated_at?: string
          verified?: boolean
          website?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          data: Json
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          data?: Json
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          data?: Json
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          ai_summary: string | null
          country: string | null
          created_at: string
          created_by: string | null
          deadline: string | null
          description_en: string | null
          description_fr: string | null
          emoji: string | null
          id: string
          institution_id: string | null
          languages: string[]
          location: string | null
          match_weights: Json
          org_name: string | null
          remote: boolean
          skills: string[]
          status: Database["public"]["Enums"]["opportunity_status"]
          tags: string[]
          title_en: string
          title_fr: string
          type: Database["public"]["Enums"]["opportunity_type"]
          updated_at: string
          url: string | null
          views_count: number
        }
        Insert: {
          ai_summary?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description_en?: string | null
          description_fr?: string | null
          emoji?: string | null
          id?: string
          institution_id?: string | null
          languages?: string[]
          location?: string | null
          match_weights?: Json
          org_name?: string | null
          remote?: boolean
          skills?: string[]
          status?: Database["public"]["Enums"]["opportunity_status"]
          tags?: string[]
          title_en: string
          title_fr: string
          type: Database["public"]["Enums"]["opportunity_type"]
          updated_at?: string
          url?: string | null
          views_count?: number
        }
        Update: {
          ai_summary?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          deadline?: string | null
          description_en?: string | null
          description_fr?: string | null
          emoji?: string | null
          id?: string
          institution_id?: string | null
          languages?: string[]
          location?: string | null
          match_weights?: Json
          org_name?: string | null
          remote?: boolean
          skills?: string[]
          status?: Database["public"]["Enums"]["opportunity_status"]
          tags?: string[]
          title_en?: string
          title_fr?: string
          type?: Database["public"]["Enums"]["opportunity_type"]
          updated_at?: string
          url?: string | null
          views_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_institution_id_fkey"
            columns: ["institution_id"]
            isOneToOne: false
            referencedRelation: "institutions"
            referencedColumns: ["id"]
          },
        ]
      }
      payout_methods: {
        Row: {
          account_label: string | null
          account_ref: string | null
          created_at: string
          id: string
          is_default: boolean
          provider: Database["public"]["Enums"]["payout_provider"]
          user_id: string
        }
        Insert: {
          account_label?: string | null
          account_ref?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          provider: Database["public"]["Enums"]["payout_provider"]
          user_id: string
        }
        Update: {
          account_label?: string | null
          account_ref?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          provider?: Database["public"]["Enums"]["payout_provider"]
          user_id?: string
        }
        Relationships: []
      }
      portfolio_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          kind: string
          title: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          kind?: string
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          causes: Json
          city: string | null
          country: string | null
          created_at: string
          current_status: string | null
          cv_url: string | null
          date_of_birth: string | null
          dream_career: string | null
          email: string | null
          full_name: string | null
          future_vision: string | null
          gender: string | null
          goals: string[] | null
          id: string
          identity_labels: string[] | null
          industries: Json
          interests: string[] | null
          language: string | null
          languages_spoken: Json
          last_active_at: string | null
          level: number
          nationality: string | null
          onboarded: boolean | null
          personality_insights: Json
          phone: string | null
          preferred_name: string | null
          primary_language: string | null
          readiness: Json
          remote_available: boolean
          scores: Json | null
          skills: string[] | null
          social_links: Json
          streak_days: number
          updated_at: string
          verifications: Json
          video_intro_url: string | null
          visibility: string
          willing_to_relocate: boolean
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          causes?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          current_status?: string | null
          cv_url?: string | null
          date_of_birth?: string | null
          dream_career?: string | null
          email?: string | null
          full_name?: string | null
          future_vision?: string | null
          gender?: string | null
          goals?: string[] | null
          id: string
          identity_labels?: string[] | null
          industries?: Json
          interests?: string[] | null
          language?: string | null
          languages_spoken?: Json
          last_active_at?: string | null
          level?: number
          nationality?: string | null
          onboarded?: boolean | null
          personality_insights?: Json
          phone?: string | null
          preferred_name?: string | null
          primary_language?: string | null
          readiness?: Json
          remote_available?: boolean
          scores?: Json | null
          skills?: string[] | null
          social_links?: Json
          streak_days?: number
          updated_at?: string
          verifications?: Json
          video_intro_url?: string | null
          visibility?: string
          willing_to_relocate?: boolean
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          causes?: Json
          city?: string | null
          country?: string | null
          created_at?: string
          current_status?: string | null
          cv_url?: string | null
          date_of_birth?: string | null
          dream_career?: string | null
          email?: string | null
          full_name?: string | null
          future_vision?: string | null
          gender?: string | null
          goals?: string[] | null
          id?: string
          identity_labels?: string[] | null
          industries?: Json
          interests?: string[] | null
          language?: string | null
          languages_spoken?: Json
          last_active_at?: string | null
          level?: number
          nationality?: string | null
          onboarded?: boolean | null
          personality_insights?: Json
          phone?: string | null
          preferred_name?: string | null
          primary_language?: string | null
          readiness?: Json
          remote_available?: boolean
          scores?: Json | null
          skills?: string[] | null
          social_links?: Json
          streak_days?: number
          updated_at?: string
          verifications?: Json
          video_intro_url?: string | null
          visibility?: string
          willing_to_relocate?: boolean
          xp?: number
        }
        Relationships: []
      }
      pulse_insights: {
        Row: {
          generated_at: string
          id: string
          pulse_id: string
          stats: Json
          summary_en: string | null
          summary_fr: string | null
        }
        Insert: {
          generated_at?: string
          id?: string
          pulse_id: string
          stats?: Json
          summary_en?: string | null
          summary_fr?: string | null
        }
        Update: {
          generated_at?: string
          id?: string
          pulse_id?: string
          stats?: Json
          summary_en?: string | null
          summary_fr?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_insights_pulse_id_fkey"
            columns: ["pulse_id"]
            isOneToOne: false
            referencedRelation: "pulses"
            referencedColumns: ["id"]
          },
        ]
      }
      pulse_responses: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          option_id: string
          pulse_id: string
          question_id: string | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          option_id: string
          pulse_id: string
          question_id?: string | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          option_id?: string
          pulse_id?: string
          question_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pulse_responses_pulse_id_fkey"
            columns: ["pulse_id"]
            isOneToOne: false
            referencedRelation: "pulses"
            referencedColumns: ["id"]
          },
        ]
      }
      pulses: {
        Row: {
          closes_at: string | null
          created_at: string
          created_by: string | null
          id: string
          is_published: boolean
          options: Json
          question_en: string
          question_fr: string
          questions: Json
          reward_points: number
          topic_en: string
          topic_fr: string
          updated_at: string
        }
        Insert: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          options?: Json
          question_en: string
          question_fr: string
          questions?: Json
          reward_points?: number
          topic_en: string
          topic_fr: string
          updated_at?: string
        }
        Update: {
          closes_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_published?: boolean
          options?: Json
          question_en?: string
          question_fr?: string
          questions?: Json
          reward_points?: number
          topic_en?: string
          topic_fr?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          created_at: string
          id: string
          match_score: number
          opportunity_id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_score: number
          opportunity_id: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_score?: number
          opportunity_id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards_ledger: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          kind: Database["public"]["Enums"]["reward_kind"]
          metadata: Json
          payout_method_id: string | null
          reason: string | null
          source: string | null
          status: Database["public"]["Enums"]["reward_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          kind: Database["public"]["Enums"]["reward_kind"]
          metadata?: Json
          payout_method_id?: string | null
          reason?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["reward_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["reward_kind"]
          metadata?: Json
          payout_method_id?: string | null
          reason?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["reward_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_ledger_payout_method_id_fkey"
            columns: ["payout_method_id"]
            isOneToOne: false
            referencedRelation: "payout_methods"
            referencedColumns: ["id"]
          },
        ]
      }
      skills_v2: {
        Row: {
          category: string
          created_at: string
          id: string
          level: number
          name: string
          self_rated: boolean
          updated_at: string
          user_id: string
          validations: Json
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          level?: number
          name: string
          self_rated?: boolean
          updated_at?: string
          user_id: string
          validations?: Json
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          level?: number
          name?: string
          self_rated?: boolean
          updated_at?: string
          user_id?: string
          validations?: Json
        }
        Relationships: []
      }
      user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          id?: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          granted_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          granted_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          amount: number
          created_at: string
          id: string
          metadata: Json
          reason: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          metadata?: Json
          reason: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          metadata?: Json
          reason?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      datalab_engagement: {
        Row: {
          active_users: number | null
          day: string | null
          xp_events: number | null
        }
        Relationships: []
      }
      datalab_opportunity_demand: {
        Row: {
          applications: number | null
          country: string | null
          type: Database["public"]["Enums"]["opportunity_type"] | null
          unique_applicants: number | null
        }
        Relationships: []
      }
      pulse_results: {
        Row: {
          option_id: string | null
          pulse_id: string | null
          votes: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pulse_responses_pulse_id_fkey"
            columns: ["pulse_id"]
            isOneToOne: false
            referencedRelation: "pulses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "youth" | "partner" | "institution" | "admin" | "moderator"
      application_status:
        | "saved"
        | "applied"
        | "in_review"
        | "accepted"
        | "rejected"
        | "withdrawn"
      notification_channel: "in_app" | "email" | "sms" | "whatsapp" | "push"
      notification_kind:
        | "opportunity"
        | "coach"
        | "profile"
        | "pulse"
        | "application"
        | "system"
        | "reward"
      opportunity_status:
        | "draft"
        | "pending"
        | "approved"
        | "rejected"
        | "archived"
      opportunity_type:
        | "job"
        | "internship"
        | "scholarship"
        | "freelance"
        | "volunteering"
        | "training"
        | "challenge"
        | "mentorship"
        | "entrepreneurship"
        | "grant"
        | "fellowship"
      payout_provider: "mobile_money" | "bank" | "card" | "wallet" | "manual"
      reward_kind: "xp" | "points" | "stipend" | "grant" | "voucher" | "badge"
      reward_status: "pending" | "approved" | "paid" | "failed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["youth", "partner", "institution", "admin", "moderator"],
      application_status: [
        "saved",
        "applied",
        "in_review",
        "accepted",
        "rejected",
        "withdrawn",
      ],
      notification_channel: ["in_app", "email", "sms", "whatsapp", "push"],
      notification_kind: [
        "opportunity",
        "coach",
        "profile",
        "pulse",
        "application",
        "system",
        "reward",
      ],
      opportunity_status: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "archived",
      ],
      opportunity_type: [
        "job",
        "internship",
        "scholarship",
        "freelance",
        "volunteering",
        "training",
        "challenge",
        "mentorship",
        "entrepreneurship",
        "grant",
        "fellowship",
      ],
      payout_provider: ["mobile_money", "bank", "card", "wallet", "manual"],
      reward_kind: ["xp", "points", "stipend", "grant", "voucher", "badge"],
      reward_status: ["pending", "approved", "paid", "failed", "cancelled"],
    },
  },
} as const
