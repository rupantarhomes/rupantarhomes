// Generated from Supabase production project gmtdqeskyvdvyibccxwt on 2026-08-09.
// Regenerate after every approved database migration; do not edit table shapes by hand.
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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      blogs: {
        Row: { body: string; category: string; created_at: string; id: number; slug: string; title: string; updated_at: string }
        Insert: { body: string; category: string; created_at?: string; id?: never; slug: string; title: string; updated_at?: string }
        Update: { body?: string; category?: string; created_at?: string; id?: never; slug?: string; title?: string; updated_at?: string }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: []
      }
      estimate_requests: {
        Row: {
          approximate_size: string
          attachment_public_id: string | null
          attachment_url: string | null
          category: string
          created_at: string
          id: number
          location: string
          material_preference: string
          message: string
          name: string
          phone: string
        }
        Insert: {
          approximate_size?: string
          attachment_public_id?: string | null
          attachment_url?: string | null
          category: string
          created_at?: string
          id?: never
          location: string
          material_preference?: string
          message?: string
          name: string
          phone: string
        }
        Update: {
          approximate_size?: string
          attachment_public_id?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          id?: never
          location?: string
          material_preference?: string
          message?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          approximate_area: string | null
          budget: string | null
          created_at: string
          email: string | null
          id: string
          location: string | null
          material_preference: string | null
          message: string | null
          name: string
          phone: string
          property_type: string | null
          reference_image_public_id: string | null
          reference_image_url: string | null
          service_required: string | null
          status: string
          timeline: string | null
          updated_at: string
        }
        Insert: {
          approximate_area?: string | null
          budget?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          material_preference?: string | null
          message?: string | null
          name: string
          phone: string
          property_type?: string | null
          reference_image_public_id?: string | null
          reference_image_url?: string | null
          service_required?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
        }
        Update: {
          approximate_area?: string | null
          budget?: string | null
          created_at?: string
          email?: string | null
          id?: string
          location?: string | null
          material_preference?: string | null
          message?: string | null
          name?: string
          phone?: string
          property_type?: string | null
          reference_image_public_id?: string | null
          reference_image_url?: string | null
          service_required?: string | null
          status?: string
          timeline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      queries: {
        Row: {
          attachment_public_id: string | null
          attachment_url: string | null
          category: string
          created_at: string
          id: number
          message: string
          name: string
          phone: string
        }
        Insert: {
          attachment_public_id?: string | null
          attachment_url?: string | null
          category: string
          created_at?: string
          id?: never
          message?: string
          name: string
          phone: string
        }
        Update: {
          attachment_public_id?: string | null
          attachment_url?: string | null
          category?: string
          created_at?: string
          id?: never
          message?: string
          name?: string
          phone?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          created_at: string
          id: number
          instagram_url: string | null
          location: string
          message: string
          name: string
          rating: number
        }
        Insert: {
          created_at?: string
          id?: never
          instagram_url?: string | null
          location?: string
          message: string
          name: string
          rating?: number
        }
        Update: {
          created_at?: string
          id?: never
          instagram_url?: string | null
          location?: string
          message?: string
          name?: string
          rating?: number
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          address: string
          id: number
          instagram_url: string
          phone: string
          slogan: string
          tiktok_url: string
          updated_at: string
          workshop_note: string
        }
        Insert: {
          address: string
          id?: number
          instagram_url: string
          phone: string
          slogan: string
          tiktok_url: string
          updated_at?: string
          workshop_note: string
        }
        Update: {
          address?: string
          id?: number
          instagram_url?: string
          phone?: string
          slogan?: string
          tiktok_url?: string
          updated_at?: string
          workshop_note?: string
        }
        Relationships: []
      }
      work_images: {
        Row: {
          alt_text: string
          byte_size: number
          cloudinary_public_id: string
          created_at: string
          display_order: number
          format: string
          height: number
          id: number
          is_cover: boolean
          secure_url: string
          sort_order: number
          width: number
          work_id: number
        }
        Insert: {
          alt_text?: string
          byte_size: number
          cloudinary_public_id: string
          created_at?: string
          display_order?: number
          format?: string
          height: number
          id?: never
          is_cover?: boolean
          secure_url: string
          sort_order?: number
          width: number
          work_id: number
        }
        Update: {
          alt_text?: string
          byte_size?: number
          cloudinary_public_id?: string
          created_at?: string
          display_order?: number
          format?: string
          height?: number
          id?: never
          is_cover?: boolean
          secure_url?: string
          sort_order?: number
          width?: number
          work_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "work_images_work_id_fkey"
            columns: ["work_id"]
            isOneToOne: false
            referencedRelation: "works"
            referencedColumns: ["id"]
          },
        ]
      }
      works: {
        Row: {
          category: string
          created_at: string
          featured: boolean
          id: number
          location: string
          long_desc: string
          long_description: string
          short_description: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          featured?: boolean
          id?: never
          location?: string
          long_desc?: string
          long_description?: string
          short_description?: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          featured?: boolean
          id?: never
          location?: string
          long_desc?: string
          long_description?: string
          short_description?: string
          slug?: string
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
      delete_work_with_images: {
        Args: {
          p_work_id: number
        }
        Returns: string[]
      }
      save_work_with_images: {
        Args: {
          p_category: string
          p_featured: boolean
          p_images: Json
          p_location: string
          p_long_description: string
          p_short_description: string
          p_slug: string
          p_title: string
          p_work_id: number | null
        }
        Returns: number
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

