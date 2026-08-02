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
          document_number: string | null
          due_on: string | null
          id: string
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
          document_number?: string | null
          due_on?: string | null
          id?: string
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
          document_number?: string | null
          due_on?: string | null
          id?: string
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
      photo_consents: {
        Row: {
          accepts_image_use: boolean
          accepts_marketing: boolean
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
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
          created_at: string
          default_location_id: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          language: string
          organization_id: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_location_id?: string | null
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          language?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_location_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          language?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
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
          created_at: string
          currency_code: string
          id: string
          method_name: string
          payment_method_id: string | null
          received_at: string
          reference: string | null
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_code: string
          id?: string
          method_name: string
          payment_method_id?: string | null
          received_at?: string
          reference?: string | null
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_code?: string
          id?: string
          method_name?: string
          payment_method_id?: string | null
          received_at?: string
          reference?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_currency_code_fkey"
            columns: ["currency_code"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "sale_payments_payment_method_id_fkey"
            columns: ["payment_method_id"]
            isOneToOne: false
            referencedRelation: "payment_methods"
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
      user_roles: {
        Row: {
          country_code: string | null
          created_at: string
          id: string
          location_id: string | null
          organization_id: string | null
          point_of_sale_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          point_of_sale_id?: string | null
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          organization_id?: string | null
          point_of_sale_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
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
      cash_session_status: "abierta" | "cerrada" | "arqueada"
      checklist_phase: "apertura" | "cierre"
      customer_kind: "corporativo" | "consumidor_final"
      finance_doc_kind: "cobrar" | "pagar"
      finance_doc_status:
        | "pendiente"
        | "parcial"
        | "pagado"
        | "vencido"
        | "anulado"
      incident_severity: "baja" | "media" | "alta" | "critica"
      incident_status: "abierto" | "en_curso" | "resuelto"
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
      ],
      cash_session_status: ["abierta", "cerrada", "arqueada"],
      checklist_phase: ["apertura", "cierre"],
      customer_kind: ["corporativo", "consumidor_final"],
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
    },
  },
} as const
