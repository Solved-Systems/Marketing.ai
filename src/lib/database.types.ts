export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          plan_tier: 'free' | 'pro' | 'enterprise'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          plan_tier?: 'free' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          plan_tier?: 'free' | 'pro' | 'enterprise'
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          organization_id: string | null
          email: string
          full_name: string | null
          avatar_url: string | null
          role: 'owner' | 'admin' | 'member'
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          organization_id?: string | null
          email: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          role?: 'owner' | 'admin' | 'member'
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          brand_config: Json
          style_guide_id: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          brand_config?: Json
          style_guide_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          brand_config?: Json
          style_guide_id?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      assets: {
        Row: {
          id: string
          project_id: string
          name: string
          file_path: string
          file_type: string
          mime_type: string
          file_size: number
          metadata: Json
          uploaded_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          file_path: string
          file_type: string
          mime_type: string
          file_size: number
          metadata?: Json
          uploaded_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          file_path?: string
          file_type?: string
          mime_type?: string
          file_size?: number
          metadata?: Json
          uploaded_by?: string | null
          created_at?: string
        }
      }
      video_templates: {
        Row: {
          id: string
          organization_id: string | null
          name: string
          description: string | null
          composition_id: string
          duration_frames: number
          fps: number
          width: number
          height: number
          input_schema: Json
          preview_url: string | null
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          name: string
          description?: string | null
          composition_id: string
          duration_frames: number
          fps?: number
          width?: number
          height?: number
          input_schema: Json
          preview_url?: string | null
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          name?: string
          description?: string | null
          composition_id?: string
          duration_frames?: number
          fps?: number
          width?: number
          height?: number
          input_schema?: Json
          preview_url?: string | null
          is_public?: boolean
          created_at?: string
        }
      }
      video_jobs: {
        Row: {
          id: string
          project_id: string
          template_id: string | null
          status: 'pending' | 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled'
          input_props: Json
          output_url: string | null
          render_id: string | null
          progress: number
          error_message: string | null
          render_metadata: Json
          created_by: string | null
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          project_id: string
          template_id?: string | null
          status?: 'pending' | 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled'
          input_props: Json
          output_url?: string | null
          render_id?: string | null
          progress?: number
          error_message?: string | null
          render_metadata?: Json
          created_by?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          project_id?: string
          template_id?: string | null
          status?: 'pending' | 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled'
          input_props?: Json
          output_url?: string | null
          render_id?: string | null
          progress?: number
          error_message?: string | null
          render_metadata?: Json
          created_by?: string | null
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      github_connections: {
        Row: {
          id: string
          organization_id: string
          installation_id: number
          account_type: 'user' | 'organization'
          account_login: string
          account_avatar_url: string | null
          access_token_encrypted: string
          token_expires_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          installation_id: number
          account_type: 'user' | 'organization'
          account_login: string
          account_avatar_url?: string | null
          access_token_encrypted: string
          token_expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          installation_id?: number
          account_type?: 'user' | 'organization'
          account_login?: string
          account_avatar_url?: string | null
          access_token_encrypted?: string
          token_expires_at?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      watched_repositories: {
        Row: {
          id: string
          github_connection_id: string
          project_id: string
          repo_full_name: string
          repo_id: number
          default_branch: string
          watch_config: Json
          is_active: boolean
          created_at: string
          brand_id: string | null
          product_id: string | null
        }
        Insert: {
          id?: string
          github_connection_id: string
          project_id: string
          repo_full_name: string
          repo_id: number
          default_branch?: string
          watch_config?: Json
          is_active?: boolean
          created_at?: string
          brand_id?: string | null
          product_id?: string | null
        }
        Update: {
          id?: string
          github_connection_id?: string
          project_id?: string
          repo_full_name?: string
          repo_id?: number
          default_branch?: string
          watch_config?: Json
          is_active?: boolean
          created_at?: string
          brand_id?: string | null
          product_id?: string | null
        }
      }
      github_events: {
        Row: {
          id: string
          watched_repository_id: string
          event_type: string
          payload: Json
          processed: boolean
          video_job_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          watched_repository_id: string
          event_type: string
          payload: Json
          processed?: boolean
          video_job_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          watched_repository_id?: string
          event_type?: string
          payload?: Json
          processed?: boolean
          video_job_id?: string | null
          created_at?: string
        }
      }
      social_accounts: {
        Row: {
          id: string
          organization_id: string
          platform: 'linkedin' | 'twitter' | 'tiktok' | 'instagram'
          account_id: string
          account_name: string | null
          account_handle: string | null
          avatar_url: string | null
          access_token_encrypted: string
          refresh_token_encrypted: string | null
          token_expires_at: string | null
          scopes: string[] | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          platform: 'linkedin' | 'twitter' | 'tiktok' | 'instagram'
          account_id: string
          account_name?: string | null
          account_handle?: string | null
          avatar_url?: string | null
          access_token_encrypted: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          scopes?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          platform?: 'linkedin' | 'twitter' | 'tiktok' | 'instagram'
          account_id?: string
          account_name?: string | null
          account_handle?: string | null
          avatar_url?: string | null
          access_token_encrypted?: string
          refresh_token_encrypted?: string | null
          token_expires_at?: string | null
          scopes?: string[] | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      publish_queue: {
        Row: {
          id: string
          video_job_id: string | null
          content_draft_id: string | null
          social_account_id: string
          status: 'pending' | 'scheduled' | 'uploading' | 'published' | 'failed'
          caption: string | null
          hashtags: string[] | null
          scheduled_for: string | null
          platform_post_id: string | null
          platform_url: string | null
          error_message: string | null
          attempts: number
          created_at: string
          published_at: string | null
        }
        Insert: {
          id?: string
          video_job_id?: string | null
          content_draft_id?: string | null
          social_account_id: string
          status?: 'pending' | 'scheduled' | 'uploading' | 'published' | 'failed'
          caption?: string | null
          hashtags?: string[] | null
          scheduled_for?: string | null
          platform_post_id?: string | null
          platform_url?: string | null
          error_message?: string | null
          attempts?: number
          created_at?: string
          published_at?: string | null
        }
        Update: {
          id?: string
          video_job_id?: string | null
          content_draft_id?: string | null
          social_account_id?: string
          status?: 'pending' | 'scheduled' | 'uploading' | 'published' | 'failed'
          caption?: string | null
          hashtags?: string[] | null
          scheduled_for?: string | null
          platform_post_id?: string | null
          platform_url?: string | null
          error_message?: string | null
          attempts?: number
          created_at?: string
          published_at?: string | null
        }
      }
      activity_log: {
        Row: {
          id: string
          organization_id: string
          user_id: string | null
          action: string
          resource_type: string
          resource_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          user_id?: string | null
          action: string
          resource_type: string
          resource_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          user_id?: string | null
          action?: string
          resource_type?: string
          resource_id?: string | null
          metadata?: Json
          created_at?: string
        }
      }
      brands: {
        Row: {
          id: string
          organization_id: string
          name: string
          description: string | null
          logo_url: string | null
          brand_colors: Json
          tagline: string | null
          website_url: string | null
          social_handles: Json
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          name: string
          description?: string | null
          logo_url?: string | null
          brand_colors?: Json
          tagline?: string | null
          website_url?: string | null
          social_handles?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          name?: string
          description?: string | null
          logo_url?: string | null
          brand_colors?: Json
          tagline?: string | null
          website_url?: string | null
          social_handles?: Json
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      products: {
        Row: {
          id: string
          brand_id: string
          name: string
          description: string | null
          tagline: string | null
          product_images: Json
          features: Json
          pricing: string | null
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          brand_id: string
          name: string
          description?: string | null
          tagline?: string | null
          product_images?: Json
          features?: Json
          pricing?: string | null
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          brand_id?: string
          name?: string
          description?: string | null
          tagline?: string | null
          product_images?: Json
          features?: Json
          pricing?: string | null
          category?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      content_drafts: {
        Row: {
          id: string
          organization_id: string
          brand_id: string | null
          product_id: string | null
          content_type: 'video' | 'image' | 'post'
          title: string | null
          content: Json
          ai_prompt: string | null
          status: 'draft' | 'approved' | 'scheduled' | 'published'
          scheduled_for: string | null
          platforms: Json
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          brand_id?: string | null
          product_id?: string | null
          content_type: 'video' | 'image' | 'post'
          title?: string | null
          content: Json
          ai_prompt?: string | null
          status?: 'draft' | 'approved' | 'scheduled' | 'published'
          scheduled_for?: string | null
          platforms?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          brand_id?: string | null
          product_id?: string | null
          content_type?: 'video' | 'image' | 'post'
          title?: string | null
          content?: Json
          ai_prompt?: string | null
          status?: 'draft' | 'approved' | 'scheduled' | 'published'
          scheduled_for?: string | null
          platforms?: Json
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      style_guides: {
        Row: {
          id: string
          organization_id: string
          product_id: string | null
          name: string
          description: string | null
          brand_identity: Json
          target_audience: Json
          voice_and_tone: Json
          visual_style: Json
          content_guidelines: Json
          competitive_context: Json
          inherit_from_company: boolean
          is_default: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          organization_id: string
          product_id?: string | null
          name: string
          description?: string | null
          brand_identity?: Json
          target_audience?: Json
          voice_and_tone?: Json
          visual_style?: Json
          content_guidelines?: Json
          competitive_context?: Json
          inherit_from_company?: boolean
          is_default?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          organization_id?: string
          product_id?: string | null
          name?: string
          description?: string | null
          brand_identity?: Json
          target_audience?: Json
          voice_and_tone?: Json
          visual_style?: Json
          content_guidelines?: Json
          competitive_context?: Json
          inherit_from_company?: boolean
          is_default?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_merged_style_guide: {
        Args: { guide_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']
export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']
export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
