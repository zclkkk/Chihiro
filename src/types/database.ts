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
      admin_profiles: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          alt: string | null
          bucket: string
          created_at: string
          duration: number | null
          height: number | null
          id: string
          kind: string
          mime_type: string | null
          size: number | null
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt?: string | null
          bucket?: string
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          kind: string
          mime_type?: string | null
          size?: number | null
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt?: string | null
          bucket?: string
          created_at?: string
          duration?: number | null
          height?: number | null
          id?: string
          kind?: string
          mime_type?: string | null
          size?: number | null
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_revisions: {
        Row: {
          author_name: string | null
          category_id: string | null
          content: Json | null
          content_html: string | null
          cover_asset_id: string | null
          id: string
          kind: string
          post_id: string
          published_at: string | null
          saved_at: string
          slug: string
          summary: string | null
          tags_snapshot: Json | null
          title: string
        }
        Insert: {
          author_name?: string | null
          category_id?: string | null
          content?: Json | null
          content_html?: string | null
          cover_asset_id?: string | null
          id?: string
          kind: string
          post_id: string
          published_at?: string | null
          saved_at?: string
          slug: string
          summary?: string | null
          tags_snapshot?: Json | null
          title: string
        }
        Update: {
          author_name?: string | null
          category_id?: string | null
          content?: Json | null
          content_html?: string | null
          cover_asset_id?: string | null
          id?: string
          kind?: string
          post_id?: string
          published_at?: string | null
          saved_at?: string
          slug?: string
          summary?: string | null
          tags_snapshot?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_revisions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_tags: {
        Row: {
          assigned_at: string
          post_id: string
          tag_id: string
        }
        Insert: {
          assigned_at?: string
          post_id: string
          tag_id: string
        }
        Update: {
          assigned_at?: string
          post_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_tags_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_name: string | null
          category_id: string | null
          content: Json | null
          content_html: string | null
          cover_asset_id: string | null
          created_at: string
          id: string
          published_at: string | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          category_id?: string | null
          content?: Json | null
          content_html?: string | null
          cover_asset_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          category_id?: string | null
          content?: Json | null
          content_html?: string | null
          cover_asset_id?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_posts_cover_asset"
            columns: ["cover_asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          author_avatar_url: string | null
          author_name: string
          created_at: string
          email: string | null
          github_url: string | null
          hero_intro: string | null
          id: string
          locale: string
          motto: string | null
          site_description: string
          site_name: string
          site_url: string
          summary: string | null
          updated_at: string
        }
        Insert: {
          author_avatar_url?: string | null
          author_name: string
          created_at?: string
          email?: string | null
          github_url?: string | null
          hero_intro?: string | null
          id?: string
          locale?: string
          motto?: string | null
          site_description: string
          site_name: string
          site_url: string
          summary?: string | null
          updated_at?: string
        }
        Update: {
          author_avatar_url?: string | null
          author_name?: string
          created_at?: string
          email?: string | null
          github_url?: string | null
          hero_intro?: string | null
          id?: string
          locale?: string
          motto?: string | null
          site_description?: string
          site_name?: string
          site_url?: string
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      update_revisions: {
        Row: {
          author_name: string | null
          content: Json | null
          content_html: string | null
          id: string
          kind: string
          published_at: string | null
          saved_at: string
          title: string
          update_id: string
        }
        Insert: {
          author_name?: string | null
          content?: Json | null
          content_html?: string | null
          id?: string
          kind: string
          published_at?: string | null
          saved_at?: string
          title: string
          update_id: string
        }
        Update: {
          author_name?: string | null
          content?: Json | null
          content_html?: string | null
          id?: string
          kind?: string
          published_at?: string | null
          saved_at?: string
          title?: string
          update_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "update_revisions_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "updates"
            referencedColumns: ["id"]
          },
        ]
      }
      updates: {
        Row: {
          author_name: string | null
          content: Json | null
          content_html: string | null
          created_at: string
          id: string
          published_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string | null
          content?: Json | null
          content_html?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          author_name?: string | null
          content?: Json | null
          content_html?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      delete_category: { Args: { p_id: string }; Returns: undefined }
      delete_tag: { Args: { p_id: string }; Returns: undefined }
      sync_post_tags: { Args: { p_post_id: string; p_tag_ids: string[] }; Returns: undefined }
      list_published_post_categories_for_navigation: {
        Args: { p_limit?: number }
        Returns: {
          content_count: number
          label: string
          posts: Json
          slug: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
