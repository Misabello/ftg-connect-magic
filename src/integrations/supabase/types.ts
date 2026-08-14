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
      ai_characters: {
        Row: {
          active: boolean
          approved: boolean
          category: string
          character_version: string
          created_at: string
          description: string | null
          id: string
          location_id: string | null
          name: string
          organization_id: string | null
          reference_image_path: string | null
          styles: string[]
          supports_image: boolean
          supports_video: boolean
          updated_at: string
          usage_count: number
          venue_id: string | null
        }
        Insert: {
          active?: boolean
          approved?: boolean
          category?: string
          character_version?: string
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          name: string
          organization_id?: string | null
          reference_image_path?: string | null
          styles?: string[]
          supports_image?: boolean
          supports_video?: boolean
          updated_at?: string
          usage_count?: number
          venue_id?: string | null
        }
        Update: {
          active?: boolean
          approved?: boolean
          category?: string
          character_version?: string
          created_at?: string
          description?: string | null
          id?: string
          location_id?: string | null
          name?: string
          organization_id?: string | null
          reference_image_path?: string | null
          styles?: string[]
          supports_image?: boolean
          supports_video?: boolean
          updated_at?: string
          usage_count?: number
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_characters_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_characters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_characters_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generation_jobs: {
        Row: {
          action: string | null
          aspect_ratio: string
          character_id: string | null
          completed_at: string | null
          composition_approved: boolean
          composition_path: string | null
          created_at: string
          created_by: string | null
          customer_media_path: string
          duration_seconds: number | null
          error_message: string | null
          estimated_cost: number
          extra_instruction: string | null
          final_output_path: string | null
          final_prompt: string | null
          id: string
          location_id: string | null
          model: string | null
          negative_prompt: string | null
          organization_id: string | null
          output_height: number | null
          output_mime_type: string | null
          output_type: Database["public"]["Enums"]["ai_output_type"]
          output_width: number | null
          people_count: number
          point_of_sale_id: string | null
          preview_path: string | null
          progress: number
          prompt_used: string | null
          prompt_version: string
          provider: string
          provider_job_id: string | null
          provider_params: Json
          sale_id: string | null
          scene_id: string | null
          status: Database["public"]["Enums"]["ai_job_status"]
          style: string | null
          thumbnail_path: string | null
          updated_at: string
          user_prompt: string | null
          video_path: string | null
        }
        Insert: {
          action?: string | null
          aspect_ratio?: string
          character_id?: string | null
          completed_at?: string | null
          composition_approved?: boolean
          composition_path?: string | null
          created_at?: string
          created_by?: string | null
          customer_media_path: string
          duration_seconds?: number | null
          error_message?: string | null
          estimated_cost?: number
          extra_instruction?: string | null
          final_output_path?: string | null
          final_prompt?: string | null
          id?: string
          location_id?: string | null
          model?: string | null
          negative_prompt?: string | null
          organization_id?: string | null
          output_height?: number | null
          output_mime_type?: string | null
          output_type?: Database["public"]["Enums"]["ai_output_type"]
          output_width?: number | null
          people_count?: number
          point_of_sale_id?: string | null
          preview_path?: string | null
          progress?: number
          prompt_used?: string | null
          prompt_version?: string
          provider?: string
          provider_job_id?: string | null
          provider_params?: Json
          sale_id?: string | null
          scene_id?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          style?: string | null
          thumbnail_path?: string | null
          updated_at?: string
          user_prompt?: string | null
          video_path?: string | null
        }
        Update: {
          action?: string | null
          aspect_ratio?: string
          character_id?: string | null
          completed_at?: string | null
          composition_approved?: boolean
          composition_path?: string | null
          created_at?: string
          created_by?: string | null
          customer_media_path?: string
          duration_seconds?: number | null
          error_message?: string | null
          estimated_cost?: number
          extra_instruction?: string | null
          final_output_path?: string | null
          final_prompt?: string | null
          id?: string
          location_id?: string | null
          model?: string | null
          negative_prompt?: string | null
          organization_id?: string | null
          output_height?: number | null
          output_mime_type?: string | null
          output_type?: Database["public"]["Enums"]["ai_output_type"]
          output_width?: number | null
          people_count?: number
          point_of_sale_id?: string | null
          preview_path?: string | null
          progress?: number
          prompt_used?: string | null
          prompt_version?: string
          provider?: string
          provider_job_id?: string | null
          provider_params?: Json
          sale_id?: string | null
          scene_id?: string | null
          status?: Database["public"]["Enums"]["ai_job_status"]
          style?: string | null
          thumbnail_path?: string | null
          updated_at?: string
          user_prompt?: string | null
          video_path?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_jobs_character_id_fkey"
            columns: ["character_id"]
            isOneToOne: false
            referencedRelation: "ai_characters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_jobs_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_jobs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generation_jobs_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "ai_scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_scenes: {
        Row: {
          active: boolean
          aspect_ratios: string[]
          available_actions: string[]
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          output_type: Database["public"]["Enums"]["ai_output_type"]
          prompt_template: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          aspect_ratios?: string[]
          available_actions?: string[]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          output_type?: Database["public"]["Enums"]["ai_output_type"]
          prompt_template: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          aspect_ratios?: string[]
          available_actions?: string[]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          output_type?: Database["public"]["Enums"]["ai_output_type"]
          prompt_template?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      ai_souvenirs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          estimated_cost: number
          id: string
          location_id: string | null
          photo_id: string
          prompt_used: string | null
          requested_by: string | null
          result_url: string | null
          sale_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["souvenir_status"]
          template_id: string | null
          updated_at: string
          watermarked: boolean
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number
          id?: string
          location_id?: string | null
          photo_id: string
          prompt_used?: string | null
          requested_by?: string | null
          result_url?: string | null
          sale_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["souvenir_status"]
          template_id?: string | null
          updated_at?: string
          watermarked?: boolean
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          estimated_cost?: number
          id?: string
          location_id?: string | null
          photo_id?: string
          prompt_used?: string | null
          requested_by?: string | null
          result_url?: string | null
          sale_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["souvenir_status"]
          template_id?: string | null
          updated_at?: string
          watermarked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ai_souvenirs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_souvenirs_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_souvenirs_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_souvenirs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "souvenir_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          device_id: string | null
          entity: string
          entity_id: string | null
          id: string
          local_created_at: string | null
          location_id: string | null
          organization_id: string | null
          synced_at: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          device_id?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          local_created_at?: string | null
          location_id?: string | null
          organization_id?: string | null
          synced_at?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          device_id?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          local_created_at?: string | null
          location_id?: string | null
          organization_id?: string | null
          synced_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          counted_amount: number | null
          created_at: string
          currency_code: string
          device_id: string | null
          difference_amount: number | null
          expected_amount: number | null
          id: string
          idempotency_key: string | null
          location_id: string
          notes: string | null
          opened_at: string
          opened_by: string | null
          opening_amount: number
          organization_id: string
          point_of_sale_id: string
          status: Database["public"]["Enums"]["cash_session_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          created_at?: string
          currency_code: string
          device_id?: string | null
          difference_amount?: number | null
          expected_amount?: number | null
          id?: string
          idempotency_key?: string | null
          location_id: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          organization_id: string
          point_of_sale_id: string
          status?: Database["public"]["Enums"]["cash_session_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          counted_amount?: number | null
          created_at?: string
          currency_code?: string
          device_id?: string | null
          difference_amount?: number | null
          expected_amount?: number | null
          id?: string
          idempotency_key?: string | null
          location_id?: string
          notes?: string | null
          opened_at?: string
          opened_by?: string | null
          opening_amount?: number
          organization_id?: string
          point_of_sale_id?: string
          status?: Database["public"]["Enums"]["cash_session_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sessions_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "cash_sessions_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sessions_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_sources: {
        Row: {
          code: string
          created_at: string
          fund_kind: string
          id: string
          is_active: boolean
          location_id: string | null
          match_kinds: Database["public"]["Enums"]["payment_kind"][]
          name: string
          organization_id: string
          point_of_sale_id: string | null
          provider: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          fund_kind?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          match_kinds?: Database["public"]["Enums"]["payment_kind"][]
          name: string
          organization_id: string
          point_of_sale_id?: string | null
          provider?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          fund_kind?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          match_kinds?: Database["public"]["Enums"]["payment_kind"][]
          name?: string
          organization_id?: string
          point_of_sale_id?: string | null
          provider?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_sources_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sources_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_sources_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          date_format: string
          fiscal_adapter: string
          is_active: boolean
          language: string
          locale: string
          name: string
          rounding_mode: string
          timezone: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          date_format?: string
          fiscal_adapter?: string
          is_active?: boolean
          language?: string
          locale?: string
          name: string
          rounding_mode?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          date_format?: string
          fiscal_adapter?: string
          is_active?: boolean
          language?: string
          locale?: string
          name?: string
          rounding_mode?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "countries_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      currencies: {
        Row: {
          code: string
          created_at: string
          decimals: number
          name: string
          symbol: string
        }
        Insert: {
          code: string
          created_at?: string
          decimals?: number
          name: string
          symbol: string
        }
        Update: {
          code?: string
          created_at?: string
          decimals?: number
          name?: string
          symbol?: string
        }
        Relationships: []
      }
      customer_consents: {
        Row: {
          accepted_at: string
          accepted_by: string | null
          consent_type: string
          created_at: string
          customer_media_path: string | null
          device_label: string | null
          guardian_confirmation: boolean
          id: string
          job_id: string | null
          location_id: string | null
          organization_id: string | null
          purpose: string
          retention_policy: string
          sale_id: string | null
        }
        Insert: {
          accepted_at?: string
          accepted_by?: string | null
          consent_type?: string
          created_at?: string
          customer_media_path?: string | null
          device_label?: string | null
          guardian_confirmation?: boolean
          id?: string
          job_id?: string | null
          location_id?: string | null
          organization_id?: string | null
          purpose?: string
          retention_policy?: string
          sale_id?: string | null
        }
        Update: {
          accepted_at?: string
          accepted_by?: string | null
          consent_type?: string
          created_at?: string
          customer_media_path?: string | null
          device_label?: string | null
          guardian_confirmation?: boolean
          id?: string
          job_id?: string | null
          location_id?: string | null
          organization_id?: string | null
          purpose?: string
          retention_policy?: string
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_consents_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ai_generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_consents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_consents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_consents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          country_code: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["customer_kind"]
          legal_name: string | null
          location_id: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          tax_condition: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["customer_kind"]
          legal_name?: string | null
          location_id?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          tax_condition?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["customer_kind"]
          legal_name?: string | null
          location_id?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          tax_condition?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "customers_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      devices: {
        Row: {
          created_at: string
          device_key: string
          id: string
          is_active: boolean
          last_sync_at: string | null
          location_id: string | null
          name: string
          organization_id: string
          pending_operations: number
          platform: string | null
          point_of_sale_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_key: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          location_id?: string | null
          name: string
          organization_id: string
          pending_operations?: number
          platform?: string | null
          point_of_sale_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_key?: string
          id?: string
          is_active?: boolean
          last_sync_at?: string | null
          location_id?: string | null
          name?: string
          organization_id?: string
          pending_operations?: number
          platform?: string | null
          point_of_sale_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ingestion_accounts: {
        Row: {
          active: boolean
          allowed_mime_types: string[]
          allowed_senders: string[]
          country_code: string | null
          created_at: string
          email_address: string
          error_label: string
          frequency_minutes: number
          id: string
          inbox_label: string
          last_checked_at: string | null
          legal_entity_id: string | null
          max_attachment_mb: number
          organization_id: string
          processed_label: string
          processing_label: string
          review_label: string
          search_query: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          allowed_mime_types?: string[]
          allowed_senders?: string[]
          country_code?: string | null
          created_at?: string
          email_address: string
          error_label?: string
          frequency_minutes?: number
          id?: string
          inbox_label?: string
          last_checked_at?: string | null
          legal_entity_id?: string | null
          max_attachment_mb?: number
          organization_id: string
          processed_label?: string
          processing_label?: string
          review_label?: string
          search_query?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          allowed_mime_types?: string[]
          allowed_senders?: string[]
          country_code?: string | null
          created_at?: string
          email_address?: string
          error_label?: string
          frequency_minutes?: number
          id?: string
          inbox_label?: string
          last_checked_at?: string | null
          legal_entity_id?: string | null
          max_attachment_mb?: number
          organization_id?: string
          processed_label?: string
          processing_label?: string
          review_label?: string
          search_query?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ingestion_accounts_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "email_ingestion_accounts_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_ingestion_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ingestion_events: {
        Row: {
          account_id: string
          attachment_count: number
          body_snippet: string | null
          created_at: string
          error_message: string | null
          gmail_message_id: string
          gmail_thread_id: string | null
          id: string
          organization_id: string
          processed_at: string | null
          received_at: string | null
          recipients: string[]
          request_id: string | null
          sender: string | null
          signature_verified: boolean
          status: Database["public"]["Enums"]["email_ingestion_status"]
          subject: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          attachment_count?: number
          body_snippet?: string | null
          created_at?: string
          error_message?: string | null
          gmail_message_id: string
          gmail_thread_id?: string | null
          id?: string
          organization_id: string
          processed_at?: string | null
          received_at?: string | null
          recipients?: string[]
          request_id?: string | null
          sender?: string | null
          signature_verified?: boolean
          status?: Database["public"]["Enums"]["email_ingestion_status"]
          subject?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          attachment_count?: number
          body_snippet?: string | null
          created_at?: string
          error_message?: string | null
          gmail_message_id?: string
          gmail_thread_id?: string | null
          id?: string
          organization_id?: string
          processed_at?: string | null
          received_at?: string | null
          recipients?: string[]
          request_id?: string | null
          sender?: string | null
          signature_verified?: boolean
          status?: Database["public"]["Enums"]["email_ingestion_status"]
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ingestion_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_ingestion_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_ingestion_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_ingestion_requests: {
        Row: {
          account_id: string | null
          received_at: string
          request_id: string
        }
        Insert: {
          account_id?: string | null
          received_at?: string
          request_id: string
        }
        Update: {
          account_id?: string | null
          received_at?: string
          request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_ingestion_requests_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "email_ingestion_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_venue_assignments: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          location_id: string | null
          point_of_sale_id: string | null
          updated_at: string
          valid_from: string
          valid_to: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          location_id?: string | null
          point_of_sale_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          location_id?: string | null
          point_of_sale_id?: string | null
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_venue_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_venue_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_venue_assignments_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_venue_assignments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          address: string | null
          birth_date: string | null
          city: string | null
          contract_type: string | null
          cost_center: string | null
          country_code: string | null
          created_at: string
          created_by: string | null
          department: string | null
          document_number: string | null
          document_type: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          employee_number: string | null
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          gender: string | null
          hire_date: string | null
          id: string
          last_name: string
          marital_status: string | null
          nationality: string | null
          notes: string | null
          organization_id: string
          personal_email: string | null
          phone: string | null
          position: string | null
          primary_location_id: string | null
          primary_point_of_sale_id: string | null
          reference_currency: string | null
          region: string | null
          supervisor_employee_id: string | null
          tax_id: string | null
          termination_date: string | null
          termination_reason: string | null
          updated_at: string
          user_id: string | null
          work_schedule: string | null
          work_shift: string | null
        }
        Insert: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          contract_type?: string | null
          cost_center?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          document_number?: string | null
          document_type?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          last_name: string
          marital_status?: string | null
          nationality?: string | null
          notes?: string | null
          organization_id: string
          personal_email?: string | null
          phone?: string | null
          position?: string | null
          primary_location_id?: string | null
          primary_point_of_sale_id?: string | null
          reference_currency?: string | null
          region?: string | null
          supervisor_employee_id?: string | null
          tax_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string | null
          work_schedule?: string | null
          work_shift?: string | null
        }
        Update: {
          address?: string | null
          birth_date?: string | null
          city?: string | null
          contract_type?: string | null
          cost_center?: string | null
          country_code?: string | null
          created_at?: string
          created_by?: string | null
          department?: string | null
          document_number?: string | null
          document_type?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          employee_number?: string | null
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name?: string
          gender?: string | null
          hire_date?: string | null
          id?: string
          last_name?: string
          marital_status?: string | null
          nationality?: string | null
          notes?: string | null
          organization_id?: string
          personal_email?: string | null
          phone?: string | null
          position?: string | null
          primary_location_id?: string | null
          primary_point_of_sale_id?: string | null
          reference_currency?: string | null
          region?: string | null
          supervisor_employee_id?: string | null
          tax_id?: string | null
          termination_date?: string | null
          termination_reason?: string | null
          updated_at?: string
          user_id?: string | null
          work_schedule?: string | null
          work_shift?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "employees_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_primary_location_id_fkey"
            columns: ["primary_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_primary_point_of_sale_id_fkey"
            columns: ["primary_point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_supervisor_employee_id_fkey"
            columns: ["supervisor_employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          deleted_at: string | null
          ends_at: string | null
          id: string
          location_id: string
          manager_name: string | null
          name: string
          notes: string | null
          organization_id: string
          sales_target: number | null
          starts_at: string
          status: Database["public"]["Enums"]["operational_status"]
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: string
          location_id: string
          manager_name?: string | null
          name: string
          notes?: string | null
          organization_id: string
          sales_target?: number | null
          starts_at: string
          status?: Database["public"]["Enums"]["operational_status"]
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          ends_at?: string | null
          id?: string
          location_id?: string
          manager_name?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          sales_target?: number | null
          starts_at?: string
          status?: Database["public"]["Enums"]["operational_status"]
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_documents: {
        Row: {
          amount: number
          concept: string
          cost_center: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          customer_id: string | null
          document_category: Database["public"]["Enums"]["finance_doc_category"]
          document_number: string | null
          due_on: string | null
          id: string
          idempotency_key: string | null
          issued_on: string
          kind: Database["public"]["Enums"]["finance_doc_kind"]
          location_id: string | null
          notes: string | null
          organization_id: string
          paid_amount: number
          receipt_path: string | null
          status: Database["public"]["Enums"]["finance_doc_status"]
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          concept: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          currency_code: string
          customer_id?: string | null
          document_category?: Database["public"]["Enums"]["finance_doc_category"]
          document_number?: string | null
          due_on?: string | null
          id?: string
          idempotency_key?: string | null
          issued_on?: string
          kind: Database["public"]["Enums"]["finance_doc_kind"]
          location_id?: string | null
          notes?: string | null
          organization_id: string
          paid_amount?: number
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["finance_doc_status"]
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          concept?: string
          cost_center?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          customer_id?: string | null
          document_category?: Database["public"]["Enums"]["finance_doc_category"]
          document_number?: string | null
          due_on?: string | null
          id?: string
          idempotency_key?: string | null
          issued_on?: string
          kind?: Database["public"]["Enums"]["finance_doc_kind"]
          location_id?: string | null
          notes?: string | null
          organization_id?: string
          paid_amount?: number
          receipt_path?: string | null
          status?: Database["public"]["Enums"]["finance_doc_status"]
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_documents_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "finance_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_documents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_alerts: {
        Row: {
          alert_type: string
          created_at: string
          email_ingestion_event_id: string | null
          id: string
          invoice_document_id: string | null
          message: string
          organization_id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["invoice_alert_severity"]
        }
        Insert: {
          alert_type: string
          created_at?: string
          email_ingestion_event_id?: string | null
          id?: string
          invoice_document_id?: string | null
          message: string
          organization_id: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["invoice_alert_severity"]
        }
        Update: {
          alert_type?: string
          created_at?: string
          email_ingestion_event_id?: string | null
          id?: string
          invoice_document_id?: string | null
          message?: string
          organization_id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["invoice_alert_severity"]
        }
        Relationships: [
          {
            foreignKeyName: "invoice_alerts_email_ingestion_event_id_fkey"
            columns: ["email_ingestion_event_id"]
            isOneToOne: false
            referencedRelation: "email_ingestion_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_alerts_invoice_document_id_fkey"
            columns: ["invoice_document_id"]
            isOneToOne: false
            referencedRelation: "invoice_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_documents: {
        Row: {
          approval_status: Database["public"]["Enums"]["invoice_approval_status"]
          bank_details: string | null
          confidence_score: number
          cost_center: string | null
          country_code: string | null
          created_at: string
          currency_code: string | null
          customer_id: string | null
          document_direction: Database["public"]["Enums"]["invoice_direction"]
          document_number: string | null
          document_type: Database["public"]["Enums"]["invoice_doc_type"]
          due_date: string | null
          duplicate_of: string | null
          event_id: string | null
          exchange_rate: number | null
          extraction_status: Database["public"]["Enums"]["invoice_extraction_status"]
          file_hash: string | null
          file_name: string | null
          finance_document_id: string | null
          fiscal_code: string | null
          id: string
          issue_date: string | null
          issuer_name: string | null
          issuer_tax_id: string | null
          legal_entity_id: string | null
          line_items: Json
          location_id: string | null
          mime_type: string | null
          net_amount: number
          organization_id: string
          payment_terms: string | null
          perception_amount: number
          point_of_sale_code: string | null
          purchase_order: string | null
          receiver_name: string | null
          receiver_tax_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          series: string | null
          storage_bucket: string
          storage_path: string | null
          supplier_id: string | null
          tax_amount: number
          total_amount: number
          updated_at: string
          validation_notes: Json
          venue_id: string | null
          withholding_amount: number
        }
        Insert: {
          approval_status?: Database["public"]["Enums"]["invoice_approval_status"]
          bank_details?: string | null
          confidence_score?: number
          cost_center?: string | null
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          customer_id?: string | null
          document_direction?: Database["public"]["Enums"]["invoice_direction"]
          document_number?: string | null
          document_type?: Database["public"]["Enums"]["invoice_doc_type"]
          due_date?: string | null
          duplicate_of?: string | null
          event_id?: string | null
          exchange_rate?: number | null
          extraction_status?: Database["public"]["Enums"]["invoice_extraction_status"]
          file_hash?: string | null
          file_name?: string | null
          finance_document_id?: string | null
          fiscal_code?: string | null
          id?: string
          issue_date?: string | null
          issuer_name?: string | null
          issuer_tax_id?: string | null
          legal_entity_id?: string | null
          line_items?: Json
          location_id?: string | null
          mime_type?: string | null
          net_amount?: number
          organization_id: string
          payment_terms?: string | null
          perception_amount?: number
          point_of_sale_code?: string | null
          purchase_order?: string | null
          receiver_name?: string | null
          receiver_tax_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          series?: string | null
          storage_bucket?: string
          storage_path?: string | null
          supplier_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          validation_notes?: Json
          venue_id?: string | null
          withholding_amount?: number
        }
        Update: {
          approval_status?: Database["public"]["Enums"]["invoice_approval_status"]
          bank_details?: string | null
          confidence_score?: number
          cost_center?: string | null
          country_code?: string | null
          created_at?: string
          currency_code?: string | null
          customer_id?: string | null
          document_direction?: Database["public"]["Enums"]["invoice_direction"]
          document_number?: string | null
          document_type?: Database["public"]["Enums"]["invoice_doc_type"]
          due_date?: string | null
          duplicate_of?: string | null
          event_id?: string | null
          exchange_rate?: number | null
          extraction_status?: Database["public"]["Enums"]["invoice_extraction_status"]
          file_hash?: string | null
          file_name?: string | null
          finance_document_id?: string | null
          fiscal_code?: string | null
          id?: string
          issue_date?: string | null
          issuer_name?: string | null
          issuer_tax_id?: string | null
          legal_entity_id?: string | null
          line_items?: Json
          location_id?: string | null
          mime_type?: string | null
          net_amount?: number
          organization_id?: string
          payment_terms?: string | null
          perception_amount?: number
          point_of_sale_code?: string | null
          purchase_order?: string | null
          receiver_name?: string | null
          receiver_tax_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          series?: string | null
          storage_bucket?: string
          storage_path?: string | null
          supplier_id?: string | null
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          validation_notes?: Json
          venue_id?: string | null
          withholding_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_documents_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoice_documents_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "invoice_documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_duplicate_of_fkey"
            columns: ["duplicate_of"]
            isOneToOne: false
            referencedRelation: "invoice_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_finance_document_id_fkey"
            columns: ["finance_document_id"]
            isOneToOne: false
            referencedRelation: "finance_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_legal_entity_id_fkey"
            columns: ["legal_entity_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_documents_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_email_links: {
        Row: {
          created_at: string
          email_ingestion_event_id: string
          id: string
          invoice_document_id: string
        }
        Insert: {
          created_at?: string
          email_ingestion_event_id: string
          id?: string
          invoice_document_id: string
        }
        Update: {
          created_at?: string
          email_ingestion_event_id?: string
          id?: string
          invoice_document_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_email_links_email_ingestion_event_id_fkey"
            columns: ["email_ingestion_event_id"]
            isOneToOne: false
            referencedRelation: "email_ingestion_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_email_links_invoice_document_id_fkey"
            columns: ["invoice_document_id"]
            isOneToOne: false
            referencedRelation: "invoice_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_extracted_fields: {
        Row: {
          confidence: number
          corrected_value: string | null
          created_at: string
          extracted_value: string | null
          extraction_source: Database["public"]["Enums"]["invoice_field_source"]
          field_name: string
          id: string
          invoice_document_id: string
          page_number: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          updated_at: string
        }
        Insert: {
          confidence?: number
          corrected_value?: string | null
          created_at?: string
          extracted_value?: string | null
          extraction_source?: Database["public"]["Enums"]["invoice_field_source"]
          field_name: string
          id?: string
          invoice_document_id: string
          page_number?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Update: {
          confidence?: number
          corrected_value?: string | null
          created_at?: string
          extracted_value?: string | null
          extraction_source?: Database["public"]["Enums"]["invoice_field_source"]
          field_name?: string
          id?: string
          invoice_document_id?: string
          page_number?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_extracted_fields_invoice_document_id_fkey"
            columns: ["invoice_document_id"]
            isOneToOne: false
            referencedRelation: "invoice_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_processing_jobs: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          invoice_document_id: string
          model: string | null
          provider: string
          started_at: string | null
          status: Database["public"]["Enums"]["invoice_extraction_status"]
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          invoice_document_id: string
          model?: string | null
          provider?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["invoice_extraction_status"]
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          invoice_document_id?: string
          model?: string | null
          provider?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["invoice_extraction_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_processing_jobs_invoice_document_id_fkey"
            columns: ["invoice_document_id"]
            isOneToOne: false
            referencedRelation: "invoice_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          cash_session_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          description: string
          entry_date: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          organization_id: string
          point_of_sale_id: string | null
          source_id: string | null
          source_type: string
        }
        Insert: {
          cash_session_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description: string
          entry_date?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          organization_id: string
          point_of_sale_id?: string | null
          source_id?: string | null
          source_type: string
        }
        Update: {
          cash_session_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string
          entry_date?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          organization_id?: string
          point_of_sale_id?: string | null
          source_id?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "journal_entries_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number
          debit: number
          description: string | null
          entry_id: string
          id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id: string
          id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number
          debit?: number
          description?: string | null
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "ledger_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_accounts: {
        Row: {
          account_type: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          normal_side: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_type: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          normal_side: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_type?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          normal_side?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          city: string | null
          code: string
          country_code: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          timezone: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          country_code: string
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          country_code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "locations_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_actual_results: {
        Row: {
          absolute_error: number | null
          actual_value: number | null
          created_at: string
          currency_code: string | null
          id: string
          job_id: string | null
          measured_at: string
          organization_id: string | null
          percentage_error: number | null
          period_end: string
          period_start: string
          predicted_value: number | null
          prediction_id: string | null
          recommendation_id: string | null
        }
        Insert: {
          absolute_error?: number | null
          actual_value?: number | null
          created_at?: string
          currency_code?: string | null
          id?: string
          job_id?: string | null
          measured_at?: string
          organization_id?: string | null
          percentage_error?: number | null
          period_end: string
          period_start: string
          predicted_value?: number | null
          prediction_id?: string | null
          recommendation_id?: string | null
        }
        Update: {
          absolute_error?: number | null
          actual_value?: number | null
          created_at?: string
          currency_code?: string | null
          id?: string
          job_id?: string | null
          measured_at?: string
          organization_id?: string | null
          percentage_error?: number | null
          period_end?: string
          period_start?: string
          predicted_value?: number | null
          prediction_id?: string | null
          recommendation_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_actual_results_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ml_prediction_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_actual_results_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_actual_results_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "ml_predictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_actual_results_recommendation_id_fkey"
            columns: ["recommendation_id"]
            isOneToOne: false
            referencedRelation: "ml_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_generated_reports: {
        Row: {
          content: Json | null
          created_at: string
          created_by: string | null
          disclaimer: string
          id: string
          job_id: string
          language: string
          model_reference: string | null
          organization_id: string | null
          summary: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          disclaimer?: string
          id?: string
          job_id: string
          language?: string
          model_reference?: string | null
          organization_id?: string | null
          summary?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          created_by?: string | null
          disclaimer?: string
          id?: string
          job_id?: string
          language?: string
          model_reference?: string | null
          organization_id?: string | null
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_generated_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ml_prediction_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_generated_reports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_model_evaluations: {
        Row: {
          backtest_from: string | null
          backtest_to: string | null
          beats_baseline: boolean | null
          bias: number | null
          created_at: string
          details: Json | null
          folds: number | null
          id: string
          interval_coverage: number | null
          is_selected: boolean
          job_id: string | null
          location_id: string | null
          mae: number | null
          mape: number | null
          model_id: string
          organization_id: string | null
          rmse: number | null
          target_key: string
          wape: number | null
        }
        Insert: {
          backtest_from?: string | null
          backtest_to?: string | null
          beats_baseline?: boolean | null
          bias?: number | null
          created_at?: string
          details?: Json | null
          folds?: number | null
          id?: string
          interval_coverage?: number | null
          is_selected?: boolean
          job_id?: string | null
          location_id?: string | null
          mae?: number | null
          mape?: number | null
          model_id: string
          organization_id?: string | null
          rmse?: number | null
          target_key: string
          wape?: number | null
        }
        Update: {
          backtest_from?: string | null
          backtest_to?: string | null
          beats_baseline?: boolean | null
          bias?: number | null
          created_at?: string
          details?: Json | null
          folds?: number | null
          id?: string
          interval_coverage?: number | null
          is_selected?: boolean
          job_id?: string | null
          location_id?: string | null
          mae?: number | null
          mape?: number | null
          model_id?: string
          organization_id?: string | null
          rmse?: number | null
          target_key?: string
          wape?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_model_evaluations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ml_prediction_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_model_evaluations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_model_evaluations_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_model_evaluations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_model_evaluations_target_key_fkey"
            columns: ["target_key"]
            isOneToOne: false
            referencedRelation: "ml_prediction_targets"
            referencedColumns: ["key"]
          },
        ]
      }
      ml_models: {
        Row: {
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          is_baseline: boolean
          key: string
          kind: Database["public"]["Enums"]["ml_model_kind"]
          notes: string | null
          provider: string
          reference: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          is_baseline?: boolean
          key: string
          kind: Database["public"]["Enums"]["ml_model_kind"]
          notes?: string | null
          provider?: string
          reference?: string | null
          updated_at?: string
          version?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_baseline?: boolean
          key?: string
          kind?: Database["public"]["Enums"]["ml_model_kind"]
          notes?: string | null
          provider?: string
          reference?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      ml_prediction_jobs: {
        Row: {
          country_code: string | null
          created_at: string
          currency_code: string
          filters: Json
          finished_at: string | null
          granularity: Database["public"]["Enums"]["ml_granularity"]
          history_days: number | null
          history_from: string | null
          history_to: string | null
          horizon_from: string
          horizon_to: string
          id: string
          location_id: string | null
          metrics: Json | null
          observations_used: number | null
          organization_id: string | null
          point_of_sale_id: string | null
          requested_at: string
          requested_by: string | null
          saved: boolean
          selected_model_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["ml_job_status"]
          status_message: string | null
          target_key: string
          title: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          currency_code?: string
          filters?: Json
          finished_at?: string | null
          granularity?: Database["public"]["Enums"]["ml_granularity"]
          history_days?: number | null
          history_from?: string | null
          history_to?: string | null
          horizon_from: string
          horizon_to: string
          id?: string
          location_id?: string | null
          metrics?: Json | null
          observations_used?: number | null
          organization_id?: string | null
          point_of_sale_id?: string | null
          requested_at?: string
          requested_by?: string | null
          saved?: boolean
          selected_model_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ml_job_status"]
          status_message?: string | null
          target_key: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          currency_code?: string
          filters?: Json
          finished_at?: string | null
          granularity?: Database["public"]["Enums"]["ml_granularity"]
          history_days?: number | null
          history_from?: string | null
          history_to?: string | null
          horizon_from?: string
          horizon_to?: string
          id?: string
          location_id?: string | null
          metrics?: Json | null
          observations_used?: number | null
          organization_id?: string | null
          point_of_sale_id?: string | null
          requested_at?: string
          requested_by?: string | null
          saved?: boolean
          selected_model_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["ml_job_status"]
          status_message?: string | null
          target_key?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_prediction_jobs_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_prediction_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_prediction_jobs_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_prediction_jobs_selected_model_id_fkey"
            columns: ["selected_model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_prediction_jobs_target_key_fkey"
            columns: ["target_key"]
            isOneToOne: false
            referencedRelation: "ml_prediction_targets"
            referencedColumns: ["key"]
          },
        ]
      }
      ml_prediction_targets: {
        Row: {
          created_at: string
          description: string | null
          display_name: string
          display_name_pt: string | null
          family: Database["public"]["Enums"]["ml_target_family"]
          id: string
          is_active: boolean
          key: string
          min_history_days: number
          min_observations: number
          sort_order: number
          supports_product_detail: boolean
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name: string
          display_name_pt?: string | null
          family: Database["public"]["Enums"]["ml_target_family"]
          id?: string
          is_active?: boolean
          key: string
          min_history_days?: number
          min_observations?: number
          sort_order?: number
          supports_product_detail?: boolean
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string
          display_name_pt?: string | null
          family?: Database["public"]["Enums"]["ml_target_family"]
          id?: string
          is_active?: boolean
          key?: string
          min_history_days?: number
          min_observations?: number
          sort_order?: number
          supports_product_detail?: boolean
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      ml_predictions: {
        Row: {
          actual_value: number | null
          category_id: string | null
          confidence_level: number
          created_at: string
          currency_code: string | null
          id: string
          is_history: boolean
          job_id: string
          location_id: string | null
          lower_bound: number | null
          model_id: string | null
          organization_id: string | null
          period_end: string
          period_start: string
          point_of_sale_id: string | null
          predicted_value: number | null
          product_id: string | null
          target_value: number | null
          upper_bound: number | null
        }
        Insert: {
          actual_value?: number | null
          category_id?: string | null
          confidence_level?: number
          created_at?: string
          currency_code?: string | null
          id?: string
          is_history?: boolean
          job_id: string
          location_id?: string | null
          lower_bound?: number | null
          model_id?: string | null
          organization_id?: string | null
          period_end: string
          period_start: string
          point_of_sale_id?: string | null
          predicted_value?: number | null
          product_id?: string | null
          target_value?: number | null
          upper_bound?: number | null
        }
        Update: {
          actual_value?: number | null
          category_id?: string | null
          confidence_level?: number
          created_at?: string
          currency_code?: string | null
          id?: string
          is_history?: boolean
          job_id?: string
          location_id?: string | null
          lower_bound?: number | null
          model_id?: string | null
          organization_id?: string | null
          period_end?: string
          period_start?: string
          point_of_sale_id?: string | null
          predicted_value?: number | null
          product_id?: string | null
          target_value?: number | null
          upper_bound?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ml_predictions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_predictions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ml_prediction_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_predictions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_predictions_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "ml_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_predictions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_predictions_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_predictions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_recommendations: {
        Row: {
          action: Database["public"]["Enums"]["ml_recommendation_action"]
          confidence: number | null
          coverage_days: number | null
          created_at: string
          currency_code: string | null
          decided_at: string | null
          decided_by: string | null
          decided_quantity: number | null
          decision: Database["public"]["Enums"]["ml_recommendation_decision"]
          decision_comment: string | null
          estimated_margin: number | null
          forecast_demand: number | null
          historical_sales: number | null
          id: string
          job_id: string
          location_id: string | null
          organization_id: string | null
          overstock_risk: number | null
          point_of_sale_id: string | null
          product_id: string | null
          product_name: string | null
          reason: string | null
          recommended_quantity: number | null
          stock_in_transit: number | null
          stock_on_hand: number | null
          stockout_risk: number | null
          updated_at: string
        }
        Insert: {
          action?: Database["public"]["Enums"]["ml_recommendation_action"]
          confidence?: number | null
          coverage_days?: number | null
          created_at?: string
          currency_code?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decided_quantity?: number | null
          decision?: Database["public"]["Enums"]["ml_recommendation_decision"]
          decision_comment?: string | null
          estimated_margin?: number | null
          forecast_demand?: number | null
          historical_sales?: number | null
          id?: string
          job_id: string
          location_id?: string | null
          organization_id?: string | null
          overstock_risk?: number | null
          point_of_sale_id?: string | null
          product_id?: string | null
          product_name?: string | null
          reason?: string | null
          recommended_quantity?: number | null
          stock_in_transit?: number | null
          stock_on_hand?: number | null
          stockout_risk?: number | null
          updated_at?: string
        }
        Update: {
          action?: Database["public"]["Enums"]["ml_recommendation_action"]
          confidence?: number | null
          coverage_days?: number | null
          created_at?: string
          currency_code?: string | null
          decided_at?: string | null
          decided_by?: string | null
          decided_quantity?: number | null
          decision?: Database["public"]["Enums"]["ml_recommendation_decision"]
          decision_comment?: string | null
          estimated_margin?: number | null
          forecast_demand?: number | null
          historical_sales?: number | null
          id?: string
          job_id?: string
          location_id?: string | null
          organization_id?: string | null
          overstock_risk?: number | null
          point_of_sale_id?: string | null
          product_id?: string | null
          product_name?: string | null
          reason?: string | null
          recommended_quantity?: number | null
          stock_in_transit?: number | null
          stock_on_hand?: number | null
          stockout_risk?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_recommendations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "ml_prediction_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_recommendations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_recommendations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_recommendations_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_recommendations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_scenarios: {
        Row: {
          assumptions: Json
          base_job_id: string | null
          compare_job_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string | null
          description: string | null
          id: string
          location_id: string | null
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          assumptions?: Json
          base_job_id?: string | null
          compare_job_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          assumptions?: Json
          base_job_id?: string | null
          compare_job_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string | null
          description?: string | null
          id?: string
          location_id?: string | null
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ml_scenarios_base_job_id_fkey"
            columns: ["base_job_id"]
            isOneToOne: false
            referencedRelation: "ml_prediction_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_scenarios_compare_job_id_fkey"
            columns: ["compare_job_id"]
            isOneToOne: false
            referencedRelation: "ml_prediction_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_scenarios_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ml_scenarios_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_checklist_items: {
        Row: {
          created_at: string
          done_at: string | null
          done_by: string | null
          id: string
          is_done: boolean
          is_required: boolean
          label: string
          notes: string | null
          operation_day_id: string
          phase: Database["public"]["Enums"]["checklist_phase"]
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          is_required?: boolean
          label: string
          notes?: string | null
          operation_day_id: string
          phase: Database["public"]["Enums"]["checklist_phase"]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          done_at?: string | null
          done_by?: string | null
          id?: string
          is_done?: boolean
          is_required?: boolean
          label?: string
          notes?: string | null
          operation_day_id?: string
          phase?: Database["public"]["Enums"]["checklist_phase"]
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_checklist_items_operation_day_id_fkey"
            columns: ["operation_day_id"]
            isOneToOne: false
            referencedRelation: "operation_days"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_days: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          day: string
          event_id: string | null
          expected_visitors: number | null
          id: string
          location_id: string
          manager_name: string | null
          notes: string | null
          opened_at: string | null
          opened_by: string | null
          organization_id: string
          sales_target: number | null
          status: Database["public"]["Enums"]["operational_status"]
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          day: string
          event_id?: string | null
          expected_visitors?: number | null
          id?: string
          location_id: string
          manager_name?: string | null
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          organization_id: string
          sales_target?: number | null
          status?: Database["public"]["Enums"]["operational_status"]
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          day?: string
          event_id?: string | null
          expected_visitors?: number | null
          id?: string
          location_id?: string
          manager_name?: string | null
          notes?: string | null
          opened_at?: string | null
          opened_by?: string | null
          organization_id?: string
          sales_target?: number | null
          status?: Database["public"]["Enums"]["operational_status"]
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_days_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_days_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_days_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_days_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_incidents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          idempotency_key: string | null
          location_id: string
          operation_day_id: string | null
          organization_id: string
          point_of_sale_id: string | null
          reported_by: string | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: Database["public"]["Enums"]["incident_severity"]
          status: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          location_id: string
          operation_day_id?: string | null
          organization_id: string
          point_of_sale_id?: string | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          idempotency_key?: string | null
          location_id?: string
          operation_day_id?: string | null
          organization_id?: string
          point_of_sale_id?: string | null
          reported_by?: string | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: Database["public"]["Enums"]["incident_severity"]
          status?: Database["public"]["Enums"]["incident_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_incidents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_incidents_operation_day_id_fkey"
            columns: ["operation_day_id"]
            isOneToOne: false
            referencedRelation: "operation_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_incidents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_incidents_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_staff: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          operation_day_id: string
          person_name: string
          point_of_sale_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          shift_end: string | null
          shift_start: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          operation_day_id: string
          person_name: string
          point_of_sale_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          shift_end?: string | null
          shift_start?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          operation_day_id?: string
          person_name?: string
          point_of_sale_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          shift_end?: string | null
          shift_start?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_staff_operation_day_id_fkey"
            columns: ["operation_day_id"]
            isOneToOne: false
            referencedRelation: "operation_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_staff_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country_code: string
          created_at: string
          deleted_at: string | null
          functional_currency: string
          id: string
          is_active: boolean
          legal_name: string | null
          logo_url: string | null
          name: string
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          country_code: string
          created_at?: string
          deleted_at?: string | null
          functional_currency: string
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name: string
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          deleted_at?: string | null
          functional_currency?: string
          id?: string
          is_active?: boolean
          legal_name?: string | null
          logo_url?: string | null
          name?: string
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "organizations_functional_currency_fkey"
            columns: ["functional_currency"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
        ]
      }
      payment_intents: {
        Row: {
          amount: number
          approved_at: string | null
          cash_session_id: string | null
          cash_source_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          description: string | null
          external_reference: string
          id: string
          init_point: string | null
          location_id: string
          organization_id: string
          payer_email: string | null
          point_of_sale_id: string
          preference_id: string | null
          provider: string
          provider_payment_id: string | null
          qr_code: string | null
          raw: Json
          sale_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          cash_session_id?: string | null
          cash_source_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          external_reference: string
          id?: string
          init_point?: string | null
          location_id: string
          organization_id: string
          payer_email?: string | null
          point_of_sale_id: string
          preference_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          qr_code?: string | null
          raw?: Json
          sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          cash_session_id?: string | null
          cash_source_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          description?: string | null
          external_reference?: string
          id?: string
          init_point?: string | null
          location_id?: string
          organization_id?: string
          payer_email?: string | null
          point_of_sale_id?: string
          preference_id?: string | null
          provider?: string
          provider_payment_id?: string | null
          qr_code?: string | null
          raw?: Json
          sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_intents_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_cash_source_id_fkey"
            columns: ["cash_source_id"]
            isOneToOne: false
            referencedRelation: "cash_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payment_intents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_intents_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          code: string
          country_code: string | null
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["payment_kind"]
          name: string
          organization_id: string
          requires_reference: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          country_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["payment_kind"]
          name: string
          organization_id: string
          requires_reference?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          country_code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["payment_kind"]
          name?: string
          organization_id?: string
          requires_reference?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "payment_methods_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at: string
          description: string | null
          id: string
          module: string
          submodule: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["permission_action"]
          created_at?: string
          description?: string | null
          id?: string
          module: string
          submodule?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["permission_action"]
          created_at?: string
          description?: string | null
          id?: string
          module?: string
          submodule?: string | null
        }
        Relationships: []
      }
      photo_consents: {
        Row: {
          accepts_image_use: boolean
          accepts_marketing: boolean
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          signed_at: string
          updated_at: string
          visitor_code: string
          visitor_name: string | null
        }
        Insert: {
          accepts_image_use?: boolean
          accepts_marketing?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          signed_at?: string
          updated_at?: string
          visitor_code: string
          visitor_name?: string | null
        }
        Update: {
          accepts_image_use?: boolean
          accepts_marketing?: boolean
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          signed_at?: string
          updated_at?: string
          visitor_code?: string
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "photo_consents_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          captured_at: string
          created_at: string
          event_id: string | null
          has_consent: boolean
          id: string
          idempotency_key: string | null
          image_url: string
          location_id: string
          notes: string | null
          photographer_id: string | null
          photographer_name: string | null
          point_of_sale_id: string | null
          retention_until: string | null
          status: Database["public"]["Enums"]["photo_status"]
          thumbnail_url: string | null
          updated_at: string
          visitor_code: string
        }
        Insert: {
          captured_at?: string
          created_at?: string
          event_id?: string | null
          has_consent?: boolean
          id?: string
          idempotency_key?: string | null
          image_url: string
          location_id: string
          notes?: string | null
          photographer_id?: string | null
          photographer_name?: string | null
          point_of_sale_id?: string | null
          retention_until?: string | null
          status?: Database["public"]["Enums"]["photo_status"]
          thumbnail_url?: string | null
          updated_at?: string
          visitor_code: string
        }
        Update: {
          captured_at?: string
          created_at?: string
          event_id?: string | null
          has_consent?: boolean
          id?: string
          idempotency_key?: string | null
          image_url?: string
          location_id?: string
          notes?: string | null
          photographer_id?: string | null
          photographer_name?: string | null
          point_of_sale_id?: string | null
          retention_until?: string | null
          status?: Database["public"]["Enums"]["photo_status"]
          thumbnail_url?: string | null
          updated_at?: string
          visitor_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      points_of_sale: {
        Row: {
          code: string
          created_at: string
          currency_code: string
          deleted_at: string | null
          event_id: string | null
          fiscal_prefix: string | null
          id: string
          is_active: boolean
          location_id: string
          name: string
          organization_id: string
          pos_type: Database["public"]["Enums"]["pos_type"]
          updated_at: string
          venue_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          currency_code: string
          deleted_at?: string | null
          event_id?: string | null
          fiscal_prefix?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          organization_id: string
          pos_type?: Database["public"]["Enums"]["pos_type"]
          updated_at?: string
          venue_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          currency_code?: string
          deleted_at?: string | null
          event_id?: string | null
          fiscal_prefix?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          organization_id?: string
          pos_type?: Database["public"]["Enums"]["pos_type"]
          updated_at?: string
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "points_of_sale_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "points_of_sale_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_sale_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_sale_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "points_of_sale_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_tickets: {
        Row: {
          amount: number
          cash_session_id: string | null
          created_at: string
          created_by: string | null
          currency_code: string
          document_number: string | null
          drive_file_id: string | null
          drive_url: string | null
          id: string
          image_path: string
          issued_on: string | null
          journal_entry_id: string | null
          kind: string
          location_id: string
          notes: string | null
          ocr_amount: number | null
          ocr_confidence: number | null
          ocr_raw: Json
          organization_id: string
          point_of_sale_id: string
          sale_id: string | null
          status: string
          supplier_name: string | null
          tax_amount: number
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          cash_session_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          document_number?: string | null
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          image_path: string
          issued_on?: string | null
          journal_entry_id?: string | null
          kind?: string
          location_id: string
          notes?: string | null
          ocr_amount?: number | null
          ocr_confidence?: number | null
          ocr_raw?: Json
          organization_id: string
          point_of_sale_id: string
          sale_id?: string | null
          status?: string
          supplier_name?: string | null
          tax_amount?: number
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          cash_session_id?: string | null
          created_at?: string
          created_by?: string | null
          currency_code?: string
          document_number?: string | null
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          image_path?: string
          issued_on?: string | null
          journal_entry_id?: string | null
          kind?: string
          location_id?: string
          notes?: string | null
          ocr_amount?: number | null
          ocr_confidence?: number | null
          ocr_raw?: Json
          organization_id?: string
          point_of_sale_id?: string
          sale_id?: string | null
          status?: string
          supplier_name?: string | null
          tax_amount?: number
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pos_tickets_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_tickets_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "pos_tickets_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_tickets_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_tickets_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_tickets_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      price_lists: {
        Row: {
          created_at: string
          currency_code: string
          id: string
          is_active: boolean
          location_id: string | null
          name: string
          organization_id: string
          updated_at: string
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string
          currency_code: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name: string
          organization_id: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_lists_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "price_lists_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_lists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["product_kind"]
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          created_at: string
          id: string
          includes_tax: boolean
          price: number
          price_list_id: string
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          includes_tax?: boolean
          price: number
          price_list_id: string
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          includes_tax?: boolean
          price?: number
          price_list_id?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_price_list_id_fkey"
            columns: ["price_list_id"]
            isOneToOne: false
            referencedRelation: "price_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          category_id: string | null
          cost: number
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          kind: Database["public"]["Enums"]["product_kind"]
          name: string
          organization_id: string
          requires_photo: boolean
          sku: string
          tax_rate: number
          track_stock: boolean
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          name: string
          organization_id: string
          requires_photo?: boolean
          sku: string
          tax_rate?: number
          track_stock?: boolean
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          category_id?: string | null
          cost?: number
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          kind?: Database["public"]["Enums"]["product_kind"]
          name?: string
          organization_id?: string
          requires_photo?: boolean
          sku?: string
          tax_rate?: number
          track_stock?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          country_code: string | null
          created_at: string
          deactivated_at: string | null
          default_location_id: string | null
          document_number: string | null
          email: string | null
          end_date: string | null
          first_name: string | null
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          language: string
          last_name: string | null
          last_sign_in_at: string | null
          notes: string | null
          organization_id: string | null
          phone: string | null
          sender_email: string | null
          start_date: string
          status: Database["public"]["Enums"]["user_account_status"]
          tax_id: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          country_code?: string | null
          created_at?: string
          deactivated_at?: string | null
          default_location_id?: string | null
          document_number?: string | null
          email?: string | null
          end_date?: string | null
          first_name?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          job_title?: string | null
          language?: string
          last_name?: string | null
          last_sign_in_at?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          sender_email?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["user_account_status"]
          tax_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          country_code?: string | null
          created_at?: string
          deactivated_at?: string | null
          default_location_id?: string | null
          document_number?: string | null
          email?: string | null
          end_date?: string | null
          first_name?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          language?: string
          last_name?: string | null
          last_sign_in_at?: string | null
          notes?: string | null
          organization_id?: string | null
          phone?: string | null
          sender_email?: string | null
          start_date?: string
          status?: Database["public"]["Enums"]["user_account_status"]
          tax_id?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "profiles_default_location_id_fkey"
            columns: ["default_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          allowed: boolean
          country_code: string | null
          created_at: string
          id: string
          location_id: string | null
          organization_id: string | null
          permission_id: string
          point_of_sale_id: string | null
          role_id: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          country_code?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          permission_id: string
          point_of_sale_id?: string | null
          role_id: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          country_code?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          permission_id?: string
          point_of_sale_id?: string | null
          role_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_permissions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          legacy_role: string | null
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          legacy_role?: string | null
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          legacy_role?: string | null
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          description: string
          discount_amount: number
          id: string
          line_total: number
          photo_code: string | null
          product_id: string | null
          quantity: number
          sale_id: string
          tax_amount: number
          tax_rate: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description: string
          discount_amount?: number
          id?: string
          line_total?: number
          photo_code?: string | null
          product_id?: string | null
          quantity?: number
          sale_id: string
          tax_amount?: number
          tax_rate?: number
          unit_price?: number
        }
        Update: {
          created_at?: string
          description?: string
          discount_amount?: number
          id?: string
          line_total?: number
          photo_code?: string | null
          product_id?: string | null
          quantity?: number
          sale_id?: string
          tax_amount?: number
          tax_rate?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          cash_source_id: string | null
          created_at: string
          currency_code: string
          id: string
          idempotency_key: string | null
          location_id: string | null
          method_name: string
          payment_method_id: string | null
          point_of_sale_id: string | null
          received_at: string
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          cash_source_id?: string | null
          created_at?: string
          currency_code: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          method_name: string
          payment_method_id?: string | null
          point_of_sale_id?: string | null
          received_at?: string
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          cash_source_id?: string | null
          created_at?: string
          currency_code?: string
          id?: string
          idempotency_key?: string | null
          location_id?: string | null
          method_name?: string
          payment_method_id?: string | null
          point_of_sale_id?: string | null
          received_at?: string
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_cash_source_id_fkey"
            columns: ["cash_source_id"]
            isOneToOne: false
            referencedRelation: "cash_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sale_payments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          cash_session_id: string | null
          created_at: string
          currency_code: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          customer_tax_id: string | null
          device_id: string | null
          discount_total: number
          event_id: string | null
          id: string
          idempotency_key: string
          local_created_at: string
          location_id: string
          notes: string | null
          organization_id: string
          point_of_sale_id: string
          sale_number: string
          sold_by: string | null
          source: Database["public"]["Enums"]["sale_source"]
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          synced_at: string
          tax_total: number
          total: number
          updated_at: string
          void_reason: string | null
        }
        Insert: {
          cash_session_id?: string | null
          created_at?: string
          currency_code: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_tax_id?: string | null
          device_id?: string | null
          discount_total?: number
          event_id?: string | null
          id?: string
          idempotency_key: string
          local_created_at?: string
          location_id: string
          notes?: string | null
          organization_id: string
          point_of_sale_id: string
          sale_number: string
          sold_by?: string | null
          source?: Database["public"]["Enums"]["sale_source"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          synced_at?: string
          tax_total?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
        }
        Update: {
          cash_session_id?: string | null
          created_at?: string
          currency_code?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          customer_tax_id?: string | null
          device_id?: string | null
          discount_total?: number
          event_id?: string | null
          id?: string
          idempotency_key?: string
          local_created_at?: string
          location_id?: string
          notes?: string | null
          organization_id?: string
          point_of_sale_id?: string
          sale_number?: string
          sold_by?: string | null
          source?: Database["public"]["Enums"]["sale_source"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          synced_at?: string
          tax_total?: number
          total?: number
          updated_at?: string
          void_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      souvenir_templates: {
        Row: {
          code: string
          country_code: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          license_owner: string | null
          name: string
          prompt: string
          style: string
          updated_at: string
        }
        Insert: {
          code: string
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          license_owner?: string | null
          name: string
          prompt: string
          style: string
          updated_at?: string
        }
        Update: {
          code?: string
          country_code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          license_owner?: string | null
          name?: string
          prompt?: string
          style?: string
          updated_at?: string
        }
        Relationships: []
      }
      stock_levels: {
        Row: {
          created_at: string
          damaged_quantity: number
          id: string
          location_id: string
          min_quantity: number
          organization_id: string
          product_id: string
          quantity: number
          reserved_quantity: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          damaged_quantity?: number
          id?: string
          location_id: string
          min_quantity?: number
          organization_id: string
          product_id: string
          quantity?: number
          reserved_quantity?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          damaged_quantity?: number
          id?: string
          location_id?: string
          min_quantity?: number
          organization_id?: string
          product_id?: string
          quantity?: number
          reserved_quantity?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_levels_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_levels_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          device_id: string | null
          id: string
          idempotency_key: string | null
          kind: Database["public"]["Enums"]["stock_movement_kind"]
          location_id: string
          organization_id: string
          product_id: string
          quantity: number
          reason: string | null
          reference: string | null
          sale_id: string | null
          supplier_id: string | null
          target_location_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          id?: string
          idempotency_key?: string | null
          kind: Database["public"]["Enums"]["stock_movement_kind"]
          location_id: string
          organization_id: string
          product_id: string
          quantity: number
          reason?: string | null
          reference?: string | null
          sale_id?: string | null
          supplier_id?: string | null
          target_location_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          id?: string
          idempotency_key?: string | null
          kind?: Database["public"]["Enums"]["stock_movement_kind"]
          location_id?: string
          organization_id?: string
          product_id?: string
          quantity?: number
          reason?: string | null
          reference?: string | null
          sale_id?: string | null
          supplier_id?: string | null
          target_location_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_target_location_id_fkey"
            columns: ["target_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          cost_center: string | null
          country_code: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          legal_name: string | null
          name: string
          organization_id: string
          party_kind: Database["public"]["Enums"]["supplier_party_kind"]
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          cost_center?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          name: string
          organization_id: string
          party_kind?: Database["public"]["Enums"]["supplier_party_kind"]
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_center?: string | null
          country_code?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          legal_name?: string | null
          name?: string
          organization_id?: string
          party_kind?: Database["public"]["Enums"]["supplier_party_kind"]
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "suppliers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_batch_items: {
        Row: {
          attempts: number
          created_at: string
          entity_id: string | null
          entity_type: string
          error_code: string | null
          error_message: string | null
          id: string
          idempotency_key: string
          local_created_at: string | null
          local_sequence: number | null
          server_confirmed_at: string | null
          sync_batch_id: string
          sync_status: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          entity_type: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key: string
          local_created_at?: string | null
          local_sequence?: number | null
          server_confirmed_at?: string | null
          sync_batch_id: string
          sync_status?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          idempotency_key?: string
          local_created_at?: string | null
          local_sequence?: number | null
          server_confirmed_at?: string | null
          sync_batch_id?: string
          sync_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_batch_items_sync_batch_id_fkey"
            columns: ["sync_batch_id"]
            isOneToOne: false
            referencedRelation: "sync_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_batches: {
        Row: {
          business_date: string
          cash_session_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          device_id: string | null
          device_identifier: string | null
          first_sequence: number | null
          id: string
          integrity_hash: string | null
          last_sequence: number | null
          location_id: string | null
          operation_count: number
          organization_id: string | null
          point_of_sale_id: string | null
          started_at: string | null
          status: string
          summary: Json
          totals_by_currency: Json
        }
        Insert: {
          business_date?: string
          cash_session_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          device_identifier?: string | null
          first_sequence?: number | null
          id?: string
          integrity_hash?: string | null
          last_sequence?: number | null
          location_id?: string | null
          operation_count?: number
          organization_id?: string | null
          point_of_sale_id?: string | null
          started_at?: string | null
          status?: string
          summary?: Json
          totals_by_currency?: Json
        }
        Update: {
          business_date?: string
          cash_session_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          device_id?: string | null
          device_identifier?: string | null
          first_sequence?: number | null
          id?: string
          integrity_hash?: string | null
          last_sequence?: number | null
          location_id?: string | null
          operation_count?: number
          organization_id?: string | null
          point_of_sale_id?: string | null
          started_at?: string | null
          status?: string
          summary?: Json
          totals_by_currency?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sync_batches_cash_session_id_fkey"
            columns: ["cash_session_id"]
            isOneToOne: false
            referencedRelation: "cash_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_batches_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "sync_devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_batches_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_batches_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_conflicts: {
        Row: {
          conflict_type: string
          created_at: string
          id: string
          local_version: Json | null
          resolution_notes: string | null
          resolution_status: string
          resolved_at: string | null
          resolved_by: string | null
          server_version: Json | null
          sync_batch_item_id: string | null
        }
        Insert: {
          conflict_type: string
          created_at?: string
          id?: string
          local_version?: Json | null
          resolution_notes?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          server_version?: Json | null
          sync_batch_item_id?: string | null
        }
        Update: {
          conflict_type?: string
          created_at?: string
          id?: string
          local_version?: Json | null
          resolution_notes?: string | null
          resolution_status?: string
          resolved_at?: string | null
          resolved_by?: string | null
          server_version?: Json | null
          sync_batch_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_conflicts_sync_batch_item_id_fkey"
            columns: ["sync_batch_item_id"]
            isOneToOne: false
            referencedRelation: "sync_batch_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_devices: {
        Row: {
          active: boolean
          created_at: string
          device_identifier: string
          id: string
          last_seen_at: string | null
          last_sync_at: string | null
          location_id: string | null
          name: string | null
          organization_id: string | null
          point_of_sale_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          device_identifier: string
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          location_id?: string | null
          name?: string | null
          organization_id?: string | null
          point_of_sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          device_identifier?: string
          id?: string
          last_seen_at?: string | null
          last_sync_at?: string | null
          location_id?: string | null
          name?: string | null
          organization_id?: string | null
          point_of_sale_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_devices_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_devices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_devices_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_memos: {
        Row: {
          amount: number
          cash_source_from_id: string | null
          cash_source_to_id: string | null
          created_at: string
          created_by: string | null
          credit_account_code: string | null
          currency_code: string
          debit_account_code: string | null
          description: string
          id: string
          idempotency_key: string | null
          journal_entry_id: string | null
          location_id: string | null
          memo_type: string
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          cash_source_from_id?: string | null
          cash_source_to_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_account_code?: string | null
          currency_code?: string
          debit_account_code?: string | null
          description: string
          id?: string
          idempotency_key?: string | null
          journal_entry_id?: string | null
          location_id?: string | null
          memo_type: string
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          cash_source_from_id?: string | null
          cash_source_to_id?: string | null
          created_at?: string
          created_by?: string | null
          credit_account_code?: string | null
          currency_code?: string
          debit_account_code?: string | null
          description?: string
          id?: string
          idempotency_key?: string | null
          journal_entry_id?: string | null
          location_id?: string | null
          memo_type?: string
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treasury_memos_cash_source_from_id_fkey"
            columns: ["cash_source_from_id"]
            isOneToOne: false
            referencedRelation: "cash_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_memos_cash_source_to_id_fkey"
            columns: ["cash_source_to_id"]
            isOneToOne: false
            referencedRelation: "cash_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_memos_journal_entry_id_fkey"
            columns: ["journal_entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_memos_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treasury_memos_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_by: string | null
          country_code: string | null
          created_at: string
          id: string
          location_id: string | null
          organization_id: string | null
          point_of_sale_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          role_id: string | null
          user_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          assigned_by?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          point_of_sale_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          user_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          assigned_by?: string | null
          country_code?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          point_of_sale_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          role_id?: string | null
          user_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "user_roles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_point_of_sale_id_fkey"
            columns: ["point_of_sale_id"]
            isOneToOne: false
            referencedRelation: "points_of_sale"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          corporate_client: string | null
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          location_id: string
          name: string
          organization_id: string
          updated_at: string
          venue_type: string
        }
        Insert: {
          corporate_client?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          location_id: string
          name: string
          organization_id: string
          updated_at?: string
          venue_type?: string
        }
        Update: {
          corporate_client?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          location_id?: string
          name?: string
          organization_id?: string
          updated_at?: string
          venue_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_users: { Args: { _user_id: string }; Returns: boolean }
      cash_flow_opening: {
        Args: { _from: string; _loc?: string }
        Returns: number
      }
      cash_flow_summary: {
        Args: { _bucket?: string; _from: string; _loc?: string; _to: string }
        Returns: {
          bucket: string
          currency_code: string
          inflow: number
          outflow: number
          source_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      post_journal_entry: {
        Args: {
          _created_by: string
          _currency: string
          _date: string
          _description: string
          _lines: Json
          _loc: string
          _org: string
          _pos: string
          _session: string
          _source_id: string
          _source_type: string
        }
        Returns: string
      }
      resolve_cash_source: {
        Args: {
          _kind: Database["public"]["Enums"]["payment_kind"]
          _loc: string
          _org: string
          _pos: string
        }
        Returns: string
      }
      user_can_access_location: { Args: { _loc: string }; Returns: boolean }
      user_can_access_org: { Args: { _org: string }; Returns: boolean }
    }
    Enums: {
      ai_job_status:
        | "pendiente"
        | "en_cola"
        | "procesando"
        | "generando_preview"
        | "preview_listo"
        | "aprobado"
        | "generando_final"
        | "completado"
        | "error"
        | "cancelado"
      ai_output_type: "imagen" | "video"
      app_role:
        | "superadmin"
        | "direccion"
        | "administracion"
        | "operaciones"
        | "encargado_sede"
        | "supervisor"
        | "cajero"
        | "fotografo"
        | "deposito"
        | "auditor"
        | "admin"
        | "management"
        | "executive"
        | "seller"
      cash_session_status: "abierta" | "cerrada" | "arqueada"
      checklist_phase: "apertura" | "cierre"
      customer_kind: "corporativo" | "consumidor_final"
      email_ingestion_status:
        | "recibido"
        | "procesando"
        | "procesado"
        | "requiere_revision"
        | "duplicado"
        | "error"
      employment_status:
        | "activo"
        | "licencia"
        | "vacaciones"
        | "suspendido"
        | "baja_programada"
        | "desvinculado"
      finance_doc_category:
        | "proveedor"
        | "servicio"
        | "gasto"
        | "cliente_servicio"
        | "organismo_estatal"
        | "otro"
      finance_doc_kind: "cobrar" | "pagar"
      finance_doc_status:
        | "pendiente"
        | "parcial"
        | "pagado"
        | "vencido"
        | "anulado"
      incident_severity: "baja" | "media" | "alta" | "critica"
      incident_status: "abierto" | "en_curso" | "resuelto"
      invoice_alert_severity: "baja" | "media" | "alta" | "critica"
      invoice_approval_status:
        | "recibida"
        | "procesando"
        | "requiere_revision"
        | "pendiente_aprobacion"
        | "aprobada"
        | "rechazada"
        | "programada_pago"
        | "pagada"
        | "vencida"
        | "posible_duplicado"
      invoice_direction: "proveedor" | "cliente"
      invoice_doc_type:
        | "factura_proveedor"
        | "factura_cliente"
        | "nota_credito_proveedor"
        | "nota_credito_cliente"
        | "nota_debito"
        | "recibo"
        | "comprobante_pago"
        | "orden_compra"
        | "no_reconocido"
      invoice_extraction_status:
        | "pendiente"
        | "procesando"
        | "extraido"
        | "baja_confianza"
        | "error"
      invoice_field_source: "texto" | "xml" | "ocr" | "ia" | "usuario"
      ml_granularity: "diario" | "semanal" | "mensual"
      ml_job_status:
        | "pendiente"
        | "en_cola"
        | "preparando_datos"
        | "entrenando"
        | "evaluando"
        | "generando_informe"
        | "completado"
        | "datos_insuficientes"
        | "error"
        | "cancelado"
      ml_model_kind:
        | "series_temporales"
        | "regresion"
        | "gradient_boosting"
        | "baseline"
        | "clustering"
        | "anomalias"
        | "asociacion"
        | "generativo"
      ml_recommendation_action:
        | "aumentar_stock"
        | "mantener"
        | "reducir"
        | "transferir"
        | "promocion"
        | "revisar_manual"
      ml_recommendation_decision:
        | "pendiente"
        | "aprobada"
        | "descartada"
        | "ajustada"
        | "reposicion_solicitada"
      ml_target_family: "ventas" | "costos" | "productos"
      operational_status:
        | "planificado"
        | "preparacion"
        | "listo"
        | "en_operacion"
        | "incidente"
        | "cerrado"
      payment_kind:
        | "efectivo"
        | "tarjeta_debito"
        | "tarjeta_credito"
        | "qr"
        | "transferencia"
        | "voucher"
        | "otro"
      permission_action:
        | "ver"
        | "crear"
        | "editar"
        | "aprobar"
        | "anular"
        | "exportar"
        | "administrar"
        | "sensible"
      photo_status: "capturada" | "publicada" | "vendida" | "archivada"
      pos_type: "tienda" | "kiosco" | "movil" | "puesto_fotografico"
      product_kind: "fotografia" | "merchandising" | "servicio" | "combo"
      sale_source: "online" | "offline"
      sale_status: "completada" | "anulada"
      souvenir_status:
        | "en_cola"
        | "procesando"
        | "listo"
        | "error"
        | "entregado"
      stock_movement_kind:
        | "recepcion"
        | "ajuste"
        | "transferencia"
        | "venta"
        | "merma"
        | "devolucion"
      supplier_party_kind: "proveedor" | "organismo_estatal" | "otro"
      user_account_status:
        | "invitado"
        | "activo"
        | "suspendido"
        | "baja_programada"
        | "inactivo"
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
      ai_job_status: [
        "pendiente",
        "en_cola",
        "procesando",
        "generando_preview",
        "preview_listo",
        "aprobado",
        "generando_final",
        "completado",
        "error",
        "cancelado",
      ],
      ai_output_type: ["imagen", "video"],
      app_role: [
        "superadmin",
        "direccion",
        "administracion",
        "operaciones",
        "encargado_sede",
        "supervisor",
        "cajero",
        "fotografo",
        "deposito",
        "auditor",
        "admin",
        "management",
        "executive",
        "seller",
      ],
      cash_session_status: ["abierta", "cerrada", "arqueada"],
      checklist_phase: ["apertura", "cierre"],
      customer_kind: ["corporativo", "consumidor_final"],
      email_ingestion_status: [
        "recibido",
        "procesando",
        "procesado",
        "requiere_revision",
        "duplicado",
        "error",
      ],
      employment_status: [
        "activo",
        "licencia",
        "vacaciones",
        "suspendido",
        "baja_programada",
        "desvinculado",
      ],
      finance_doc_category: [
        "proveedor",
        "servicio",
        "gasto",
        "cliente_servicio",
        "organismo_estatal",
        "otro",
      ],
      finance_doc_kind: ["cobrar", "pagar"],
      finance_doc_status: [
        "pendiente",
        "parcial",
        "pagado",
        "vencido",
        "anulado",
      ],
      incident_severity: ["baja", "media", "alta", "critica"],
      incident_status: ["abierto", "en_curso", "resuelto"],
      invoice_alert_severity: ["baja", "media", "alta", "critica"],
      invoice_approval_status: [
        "recibida",
        "procesando",
        "requiere_revision",
        "pendiente_aprobacion",
        "aprobada",
        "rechazada",
        "programada_pago",
        "pagada",
        "vencida",
        "posible_duplicado",
      ],
      invoice_direction: ["proveedor", "cliente"],
      invoice_doc_type: [
        "factura_proveedor",
        "factura_cliente",
        "nota_credito_proveedor",
        "nota_credito_cliente",
        "nota_debito",
        "recibo",
        "comprobante_pago",
        "orden_compra",
        "no_reconocido",
      ],
      invoice_extraction_status: [
        "pendiente",
        "procesando",
        "extraido",
        "baja_confianza",
        "error",
      ],
      invoice_field_source: ["texto", "xml", "ocr", "ia", "usuario"],
      ml_granularity: ["diario", "semanal", "mensual"],
      ml_job_status: [
        "pendiente",
        "en_cola",
        "preparando_datos",
        "entrenando",
        "evaluando",
        "generando_informe",
        "completado",
        "datos_insuficientes",
        "error",
        "cancelado",
      ],
      ml_model_kind: [
        "series_temporales",
        "regresion",
        "gradient_boosting",
        "baseline",
        "clustering",
        "anomalias",
        "asociacion",
        "generativo",
      ],
      ml_recommendation_action: [
        "aumentar_stock",
        "mantener",
        "reducir",
        "transferir",
        "promocion",
        "revisar_manual",
      ],
      ml_recommendation_decision: [
        "pendiente",
        "aprobada",
        "descartada",
        "ajustada",
        "reposicion_solicitada",
      ],
      ml_target_family: ["ventas", "costos", "productos"],
      operational_status: [
        "planificado",
        "preparacion",
        "listo",
        "en_operacion",
        "incidente",
        "cerrado",
      ],
      payment_kind: [
        "efectivo",
        "tarjeta_debito",
        "tarjeta_credito",
        "qr",
        "transferencia",
        "voucher",
        "otro",
      ],
      permission_action: [
        "ver",
        "crear",
        "editar",
        "aprobar",
        "anular",
        "exportar",
        "administrar",
        "sensible",
      ],
      photo_status: ["capturada", "publicada", "vendida", "archivada"],
      pos_type: ["tienda", "kiosco", "movil", "puesto_fotografico"],
      product_kind: ["fotografia", "merchandising", "servicio", "combo"],
      sale_source: ["online", "offline"],
      sale_status: ["completada", "anulada"],
      souvenir_status: ["en_cola", "procesando", "listo", "error", "entregado"],
      stock_movement_kind: [
        "recepcion",
        "ajuste",
        "transferencia",
        "venta",
        "merma",
        "devolucion",
      ],
      supplier_party_kind: ["proveedor", "organismo_estatal", "otro"],
      user_account_status: [
        "invitado",
        "activo",
        "suspendido",
        "baja_programada",
        "inactivo",
      ],
    },
  },
} as const
