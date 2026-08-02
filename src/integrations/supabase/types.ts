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
    }
    Enums: {
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
      pos_type: "tienda" | "kiosco" | "movil" | "puesto_fotografico"
      product_kind: "fotografia" | "merchandising" | "servicio" | "combo"
      sale_source: "online" | "offline"
      sale_status: "completada" | "anulada"
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
      pos_type: ["tienda", "kiosco", "movil", "puesto_fotografico"],
      product_kind: ["fotografia", "merchandising", "servicio", "combo"],
      sale_source: ["online", "offline"],
      sale_status: ["completada", "anulada"],
    },
  },
} as const
