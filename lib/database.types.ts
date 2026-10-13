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
      order_items: {
        Row: {
          created_at: string | null
          depleted_at: string | null
          id: string
          modifiers: Json | null
          order_id: string | null
          product_id: string | null
          quantity: number
          status: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          depleted_at?: string | null
          id?: string
          modifiers?: Json | null
          order_id?: string | null
          product_id?: string | null
          quantity: number
          status?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          depleted_at?: string | null
          id?: string
          modifiers?: Json | null
          order_id?: string | null
          product_id?: string | null
          quantity?: number
          status?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_table_claims: {
        Row: {
          claimed_at: string
          last_seen_at: string
          session_id: string
          table_id: string
        }
        Insert: {
          claimed_at?: string
          last_seen_at?: string
          session_id: string
          table_id: string
        }
        Update: {
          claimed_at?: string
          last_seen_at?: string
          session_id?: string
          table_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_table_claims_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: true
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          accepted_at: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          created_at: string | null
          customer_info: Json | null
          delivery_fee: number
          discount: number | null
          id: string
          notes: string | null
          order_number: number
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          ready_at: string | null
          source: string
          staff_id: string | null
          status: string | null
          subtotal: number | null
          table_id: string | null
          tax: number | null
          total: number | null
          type: string | null
          waiter_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_info?: Json | null
          delivery_fee?: number
          discount?: number | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          ready_at?: string | null
          source?: string
          staff_id?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          tax?: number | null
          total?: number | null
          type?: string | null
          waiter_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string | null
          customer_info?: Json | null
          delivery_fee?: number
          discount?: number | null
          id?: string
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          ready_at?: string | null
          source?: string
          staff_id?: string | null
          status?: string | null
          subtotal?: number | null
          table_id?: string | null
          tax?: number | null
          total?: number | null
          type?: string | null
          waiter_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_waiter_id_fkey"
            columns: ["waiter_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          available: boolean | null
          basePrice: number
          category: string
          created_at: string
          description: string | null
          extras: Json | null
          hasExtras: boolean | null
          hasSauces: boolean | null
          hasSizes: boolean | null
          hasSpiceLevel: boolean | null
          id: string
          image: string | null
          is_active: boolean | null
          name: string
          preparationTime: number | null
          sauces: Json | null
          sizes: Json | null
          spiceLevels: Json | null
        }
        Insert: {
          available?: boolean | null
          basePrice: number
          category: string
          created_at?: string
          description?: string | null
          extras?: Json | null
          hasExtras?: boolean | null
          hasSauces?: boolean | null
          hasSizes?: boolean | null
          hasSpiceLevel?: boolean | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name: string
          preparationTime?: number | null
          sauces?: Json | null
          sizes?: Json | null
          spiceLevels?: Json | null
        }
        Update: {
          available?: boolean | null
          basePrice?: number
          category?: string
          created_at?: string
          description?: string | null
          extras?: Json | null
          hasExtras?: boolean | null
          hasSauces?: boolean | null
          hasSizes?: boolean | null
          hasSpiceLevel?: boolean | null
          id?: string
          image?: string | null
          is_active?: boolean | null
          name?: string
          preparationTime?: number | null
          sauces?: Json | null
          sizes?: Json | null
          spiceLevels?: Json | null
        }
        Relationships: []
      }
      recipes: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          size_id: string | null
          supply_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          size_id?: string | null
          supply_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          size_id?: string | null
          supply_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipes_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_config: {
        Row: {
          address: string
          brand_colors: Json
          channels: Json
          closed_until: string | null
          created_at: string | null
          hero_slides: Json
          id: string
          logo_url: string | null
          maps_embed_url: string | null
          name: string
          ops: Json
          phone: string
          razon_social: string | null
          rfc: string | null
          schedule: Json
          sillas_respaldo: number
          slogan: string
          socials: Json
          tax_enabled: boolean
          tax_label: string
          tax_rate: number | null
          ticket_footer: string
          timezone: string
          total_mesas: number
          total_sillas: number
          updated_at: string | null
          web_orders_enabled: boolean
          whatsapp_number: string | null
        }
        Insert: {
          address?: string
          brand_colors?: Json
          channels?: Json
          closed_until?: string | null
          created_at?: string | null
          hero_slides?: Json
          id?: string
          logo_url?: string | null
          maps_embed_url?: string | null
          name?: string
          ops?: Json
          phone?: string
          razon_social?: string | null
          rfc?: string | null
          schedule?: Json
          sillas_respaldo?: number
          slogan?: string
          socials?: Json
          tax_enabled?: boolean
          tax_label?: string
          tax_rate?: number | null
          ticket_footer?: string
          timezone?: string
          total_mesas?: number
          total_sillas?: number
          updated_at?: string | null
          web_orders_enabled?: boolean
          whatsapp_number?: string | null
        }
        Update: {
          address?: string
          brand_colors?: Json
          channels?: Json
          closed_until?: string | null
          created_at?: string | null
          hero_slides?: Json
          id?: string
          logo_url?: string | null
          maps_embed_url?: string | null
          name?: string
          ops?: Json
          phone?: string
          razon_social?: string | null
          rfc?: string | null
          schedule?: Json
          sillas_respaldo?: number
          slogan?: string
          socials?: Json
          tax_enabled?: boolean
          tax_label?: string
          tax_rate?: number | null
          ticket_footer?: string
          timezone?: string
          total_mesas?: number
          total_sillas?: number
          updated_at?: string | null
          web_orders_enabled?: boolean
          whatsapp_number?: string | null
        }
        Relationships: []
      }
      staff_users: {
        Row: {
          auth_email: string | null
          auth_id: string | null
          avatar_url: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          pin: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          auth_email?: string | null
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          pin: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          auth_email?: string | null
          auth_id?: string | null
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          pin?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      supplies: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          stock_current: number
          stock_min: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          stock_current?: number
          stock_min?: number
          unit: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          stock_current?: number
          stock_min?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      supply_movements: {
        Row: {
          created_at: string
          id: string
          order_item_id: string | null
          quantity: number
          reason: string | null
          staff_id: string | null
          stock_after: number
          supply_id: string
          type: Database["public"]["Enums"]["supply_movement_type"]
        }
        Insert: {
          created_at?: string
          id?: string
          order_item_id?: string | null
          quantity: number
          reason?: string | null
          staff_id?: string | null
          stock_after: number
          supply_id: string
          type: Database["public"]["Enums"]["supply_movement_type"]
        }
        Update: {
          created_at?: string
          id?: string
          order_item_id?: string | null
          quantity?: number
          reason?: string | null
          staff_id?: string | null
          stock_after?: number
          supply_id?: string
          type?: Database["public"]["Enums"]["supply_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "supply_movements_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_movements_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supply_movements_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          base_seats: number | null
          capacity: number
          created_at: string | null
          current_guests: number | null
          currentOrderId: string | null
          id: string
          is_active: boolean | null
          isJoined: boolean | null
          joinedTableIds: string[] | null
          number: string
          originalConfig: Json | null
          position: Json | null
          section: string | null
          status: Database["public"]["Enums"]["table_status"] | null
          totalCuenta: number | null
        }
        Insert: {
          base_seats?: number | null
          capacity?: number
          created_at?: string | null
          current_guests?: number | null
          currentOrderId?: string | null
          id?: string
          is_active?: boolean | null
          isJoined?: boolean | null
          joinedTableIds?: string[] | null
          number: string
          originalConfig?: Json | null
          position?: Json | null
          section?: string | null
          status?: Database["public"]["Enums"]["table_status"] | null
          totalCuenta?: number | null
        }
        Update: {
          base_seats?: number | null
          capacity?: number
          created_at?: string | null
          current_guests?: number | null
          currentOrderId?: string | null
          id?: string
          is_active?: boolean | null
          isJoined?: boolean | null
          joinedTableIds?: string[] | null
          number?: string
          originalConfig?: Json | null
          position?: Json | null
          section?: string | null
          status?: Database["public"]["Enums"]["table_status"] | null
          totalCuenta?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_order_items: {
        Args: { p_items: Json; p_order_id: string }
        Returns: undefined
      }
      add_supply_movement: {
        Args: {
          p_quantity: number
          p_reason?: string
          p_staff_id?: string
          p_supply_id: string
          p_type: Database["public"]["Enums"]["supply_movement_type"]
        }
        Returns: number
      }
      cancel_order_items: { Args: { p_item_ids: string[] }; Returns: undefined }
      complete_checkout: {
        Args: {
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_table_id: string
        }
        Returns: undefined
      }
      complete_order_checkout: {
        Args: {
          p_order_id: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
        }
        Returns: undefined
      }
      create_staff_user: {
        Args: {
          p_auth_email: string
          p_auth_id: string
          p_name: string
          p_pin: string
          p_role: Database["public"]["Enums"]["user_role"]
        }
        Returns: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      deplete_order_item_stock: {
        Args: { p_item_id: string }
        Returns: undefined
      }
      get_staff_by_pin: {
        Args: { p_pin: string }
        Returns: {
          auth_email: string
          auth_id: string
          id: string
          is_active: boolean
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      initialize_tables: {
        Args: { p_tables_json: Json }
        Returns: {
          base_seats: number | null
          capacity: number
          created_at: string | null
          current_guests: number | null
          currentOrderId: string | null
          id: string
          is_active: boolean | null
          isJoined: boolean | null
          joinedTableIds: string[] | null
          number: string
          originalConfig: Json | null
          position: Json | null
          section: string | null
          status: Database["public"]["Enums"]["table_status"] | null
          totalCuenta: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "tables"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      is_staff_authenticated: { Args: never; Returns: boolean }
      reopen_order: { Args: { p_order_id: string }; Returns: undefined }
      revert_order_item_stock: {
        Args: { p_item_id: string }
        Returns: undefined
      }
      set_product_recipe: {
        Args: { p_lines: Json; p_product_id: string }
        Returns: undefined
      }
      set_staff_pin: {
        Args: { p_pin: string; p_staff_id: string }
        Returns: undefined
      }
      set_supply_stock: {
        Args: {
          p_counted: number
          p_reason?: string
          p_staff_id?: string
          p_supply_id: string
        }
        Returns: number
      }
      transition_order: {
        Args: {
          p_cancel_reason?: string
          p_expected_status: string
          p_order_id: string
          p_target_status: string
        }
        Returns: undefined
      }
      update_table_distribution: {
        Args: {
          p_capacity: number
          p_cascade_capacities: number[]
          p_cascade_ids: string[]
          p_cascade_is_active: boolean[]
          p_config_id: string
          p_current_guests: number
          p_section: string
          p_sillas_respaldo: number
          p_table_id: string
        }
        Returns: undefined
      }
      demo_claim_table: {
        Args: { p_session: string }
        Returns: {
          table_id: string
          table_number: string
        }[]
      }
      demo_gc: { Args: never; Returns: undefined }
      demo_release_table: { Args: { p_session: string }; Returns: undefined }
    }
    Enums: {
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "ready"
        | "on-the-way"
        | "delivered"
        | "completed"
        | "cancelled"
      order_type: "dine-in" | "delivery" | "take-away" | "pickup"
      payment_method: "cash" | "card" | "transfer"
      payment_status: "pending" | "paid" | "refunded" | "partially_paid"
      supply_movement_type: "in" | "out" | "waste" | "adjust"
      table_status: "free" | "occupied" | "billing" | "reserved" | "closed"
      user_role: "waiter" | "cashier" | "kitchen" | "admin"
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
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "on-the-way",
        "delivered",
        "completed",
        "cancelled",
      ],
      order_type: ["dine-in", "delivery", "take-away", "pickup"],
      payment_method: ["cash", "card", "transfer"],
      payment_status: ["pending", "paid", "refunded", "partially_paid"],
      supply_movement_type: ["in", "out", "waste", "adjust"],
      table_status: ["free", "occupied", "billing", "reserved", "closed"],
      user_role: ["waiter", "cashier", "kitchen", "admin"],
    },
  },
} as const

