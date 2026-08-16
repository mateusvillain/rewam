export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      episodes: {
        Row: {
          air_date: string | null
          created_at: string
          episode_number: number
          id: string
          name: string | null
          runtime_minutes: number | null
          season_id: string | null
          season_number: number
          title_id: string
          tmdb_episode_id: number | null
          updated_at: string
        }
        Insert: {
          air_date?: string | null
          created_at?: string
          episode_number: number
          id?: string
          name?: string | null
          runtime_minutes?: number | null
          season_id?: string | null
          season_number: number
          title_id: string
          tmdb_episode_id?: number | null
          updated_at?: string
        }
        Update: {
          air_date?: string | null
          created_at?: string
          episode_number?: number
          id?: string
          name?: string | null
          runtime_minutes?: number | null
          season_id?: string | null
          season_number?: number
          title_id?: string
          tmdb_episode_id?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seasons: {
        Row: {
          created_at: string
          episode_count: number | null
          id: string
          name: string | null
          poster_path: string | null
          title_id: string
          tmdb_season_number: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          episode_count?: number | null
          id?: string
          name?: string | null
          poster_path?: string | null
          title_id: string
          tmdb_season_number: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          episode_count?: number | null
          id?: string
          name?: string | null
          poster_path?: string | null
          title_id?: string
          tmdb_season_number?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          created_at: string
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          metadata: Json
          original_title: string | null
          poster_path: string | null
          release_date: string | null
          runtime_minutes: number | null
          title: string
          tmdb_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          original_title?: string | null
          poster_path?: string | null
          release_date?: string | null
          runtime_minutes?: number | null
          title: string
          tmdb_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["media_type"]
          metadata?: Json
          original_title?: string | null
          poster_path?: string | null
          release_date?: string | null
          runtime_minutes?: number | null
          title?: string
          tmdb_id?: number
          updated_at?: string
        }
        Relationships: []
      }
      watch_events: {
        Row: {
          created_at: string
          duration_minutes: number | null
          episode_id: string | null
          id: string
          notes: string | null
          title_id: string
          updated_at: string
          user_id: string
          watched_at: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          episode_id?: string | null
          id?: string
          notes?: string | null
          title_id: string
          updated_at?: string
          user_id?: string
          watched_at?: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          episode_id?: string | null
          id?: string
          notes?: string | null
          title_id?: string
          updated_at?: string
          user_id?: string
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "watch_events_episode_belongs_to_title"
            columns: ["episode_id", "title_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id", "title_id"]
          },
          {
            foreignKeyName: "watch_events_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watch_events_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_own_account: { Args: never; Returns: undefined }
      episode_watch_counts: {
        Args: { p_title_id: string }
        Returns: {
          episode_id: string
          latest_event_id: string
          season_number: number
          watch_count: number
        }[]
      }
      upsert_episode: {
        Args: {
          p_air_date?: string
          p_episode_number: number
          p_name?: string
          p_runtime_minutes?: number
          p_season_number: number
          p_title_id: string
          p_tmdb_episode_id?: number
        }
        Returns: {
          air_date: string | null
          created_at: string
          episode_number: number
          id: string
          name: string | null
          runtime_minutes: number | null
          season_id: string | null
          season_number: number
          title_id: string
          tmdb_episode_id: number | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "episodes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_episodes: {
        Args: { p_episodes: Json; p_title_id: string }
        Returns: {
          air_date: string | null
          created_at: string
          episode_number: number
          id: string
          name: string | null
          runtime_minutes: number | null
          season_id: string | null
          season_number: number
          title_id: string
          tmdb_episode_id: number | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "episodes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      upsert_season: {
        Args: {
          p_episode_count?: number
          p_name?: string
          p_poster_path?: string
          p_title_id: string
          p_tmdb_season_number: number
        }
        Returns: {
          created_at: string
          episode_count: number | null
          id: string
          name: string | null
          poster_path: string | null
          title_id: string
          tmdb_season_number: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "seasons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      upsert_seasons: {
        Args: { p_seasons: Json; p_title_id: string }
        Returns: {
          created_at: string
          episode_count: number | null
          id: string
          name: string | null
          poster_path: string | null
          title_id: string
          tmdb_season_number: number
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "seasons"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      upsert_title: {
        Args: {
          p_media_type: Database["public"]["Enums"]["media_type"]
          p_original_title?: string
          p_poster_path?: string
          p_release_date?: string
          p_runtime_minutes?: number
          p_title: string
          p_tmdb_id: number
        }
        Returns: {
          created_at: string
          id: string
          media_type: Database["public"]["Enums"]["media_type"]
          metadata: Json
          original_title: string | null
          poster_path: string | null
          release_date: string | null
          runtime_minutes: number | null
          title: string
          tmdb_id: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "titles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      watch_stats: {
        Args: never
        Returns: {
          total_events: number
          total_minutes: number
          unknown_duration_events: number
        }[]
      }
    }
    Enums: {
      media_type: "movie" | "tv"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      media_type: ["movie", "tv"],
    },
  },
} as const

