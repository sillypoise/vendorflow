export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    public: {
        Tables: {
            organization_memberships: {
                Row: {
                    active: boolean;
                    created_at: string;
                    display_name: string;
                    organization_id: string;
                    role: Database["public"]["Enums"]["membership_role"];
                    user_id: string;
                };
                Insert: {
                    active?: boolean;
                    created_at?: string;
                    display_name: string;
                    organization_id: string;
                    role: Database["public"]["Enums"]["membership_role"];
                    user_id: string;
                };
                Update: {
                    active?: boolean;
                    created_at?: string;
                    display_name?: string;
                    organization_id?: string;
                    role?: Database["public"]["Enums"]["membership_role"];
                    user_id?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "organization_memberships_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: false;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    },
                ];
            };
            organizations: {
                Row: {
                    created_at: string;
                    id: string;
                    name: string;
                };
                Insert: {
                    created_at?: string;
                    id?: string;
                    name: string;
                };
                Update: {
                    created_at?: string;
                    id?: string;
                    name?: string;
                };
                Relationships: [];
            };
            vendor_request_audit_events: {
                Row: {
                    action: Database["public"]["Enums"]["workflow_action"];
                    actor_role: Database["public"]["Enums"]["membership_role"];
                    actor_user_id: string;
                    created_at: string;
                    current_state: Database["public"]["Enums"]["vendor_request_state"];
                    id: string;
                    organization_id: string;
                    previous_state: Database["public"]["Enums"]["vendor_request_state"] | null;
                    reason: string | null;
                    request_id: string;
                    resulting_revision: number;
                };
                Insert: {
                    action: Database["public"]["Enums"]["workflow_action"];
                    actor_role: Database["public"]["Enums"]["membership_role"];
                    actor_user_id: string;
                    created_at?: string;
                    current_state: Database["public"]["Enums"]["vendor_request_state"];
                    id?: string;
                    organization_id: string;
                    previous_state?: Database["public"]["Enums"]["vendor_request_state"] | null;
                    reason?: string | null;
                    request_id: string;
                    resulting_revision: number;
                };
                Update: {
                    action?: Database["public"]["Enums"]["workflow_action"];
                    actor_role?: Database["public"]["Enums"]["membership_role"];
                    actor_user_id?: string;
                    created_at?: string;
                    current_state?: Database["public"]["Enums"]["vendor_request_state"];
                    id?: string;
                    organization_id?: string;
                    previous_state?: Database["public"]["Enums"]["vendor_request_state"] | null;
                    reason?: string | null;
                    request_id?: string;
                    resulting_revision?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: "vendor_request_audit_events_organization_id_fkey";
                        columns: ["organization_id"];
                        isOneToOne: false;
                        referencedRelation: "organizations";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "vendor_request_audit_events_request_id_fkey";
                        columns: ["request_id"];
                        isOneToOne: false;
                        referencedRelation: "vendor_requests";
                        referencedColumns: ["id"];
                    },
                ];
            };
            vendor_requests: {
                Row: {
                    annual_spend_minor_units: number | null;
                    business_justification: string | null;
                    created_at: string;
                    currency_code: string | null;
                    id: string;
                    organization_id: string;
                    owner_user_id: string;
                    receives_confidential_data: boolean | null;
                    reviewer_user_id: string | null;
                    revision: number;
                    service_category: Database["public"]["Enums"]["vendor_service_category"] | null;
                    state: Database["public"]["Enums"]["vendor_request_state"];
                    supports_critical_process: boolean | null;
                    updated_at: string;
                    vendor_legal_name: string | null;
                    vendor_website: string | null;
                };
                Insert: {
                    annual_spend_minor_units?: number | null;
                    business_justification?: string | null;
                    created_at?: string;
                    currency_code?: string | null;
                    id?: string;
                    organization_id: string;
                    owner_user_id: string;
                    receives_confidential_data?: boolean | null;
                    reviewer_user_id?: string | null;
                    revision?: number;
                    service_category?:
                        | Database["public"]["Enums"]["vendor_service_category"]
                        | null;
                    state?: Database["public"]["Enums"]["vendor_request_state"];
                    supports_critical_process?: boolean | null;
                    updated_at?: string;
                    vendor_legal_name?: string | null;
                    vendor_website?: string | null;
                };
                Update: {
                    annual_spend_minor_units?: number | null;
                    business_justification?: string | null;
                    created_at?: string;
                    currency_code?: string | null;
                    id?: string;
                    organization_id?: string;
                    owner_user_id?: string;
                    receives_confidential_data?: boolean | null;
                    reviewer_user_id?: string | null;
                    revision?: number;
                    service_category?:
                        | Database["public"]["Enums"]["vendor_service_category"]
                        | null;
                    state?: Database["public"]["Enums"]["vendor_request_state"];
                    supports_critical_process?: boolean | null;
                    updated_at?: string;
                    vendor_legal_name?: string | null;
                    vendor_website?: string | null;
                };
                Relationships: [
                    {
                        foreignKeyName: "vendor_requests_organization_id_owner_user_id_fkey";
                        columns: ["organization_id", "owner_user_id"];
                        isOneToOne: false;
                        referencedRelation: "organization_memberships";
                        referencedColumns: ["organization_id", "user_id"];
                    },
                    {
                        foreignKeyName: "vendor_requests_organization_id_reviewer_user_id_fkey";
                        columns: ["organization_id", "reviewer_user_id"];
                        isOneToOne: false;
                        referencedRelation: "organization_memberships";
                        referencedColumns: ["organization_id", "user_id"];
                    },
                ];
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            assign_vendor_request: {
                Args: {
                    p_expected_revision: number;
                    p_request_id: string;
                    p_reviewer_user_id: string;
                };
                Returns: Database["public"]["CompositeTypes"]["vendor_request_transition_result"];
                SetofOptions: {
                    from: "*";
                    to: "vendor_request_transition_result";
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            create_vendor_request: {
                Args: {
                    p_draft: Database["public"]["CompositeTypes"]["vendor_request_draft_input"];
                };
                Returns: {
                    annual_spend_minor_units: number | null;
                    business_justification: string | null;
                    created_at: string;
                    currency_code: string | null;
                    id: string;
                    organization_id: string;
                    owner_user_id: string;
                    receives_confidential_data: boolean | null;
                    reviewer_user_id: string | null;
                    revision: number;
                    service_category: Database["public"]["Enums"]["vendor_service_category"] | null;
                    state: Database["public"]["Enums"]["vendor_request_state"];
                    supports_critical_process: boolean | null;
                    updated_at: string;
                    vendor_legal_name: string | null;
                    vendor_website: string | null;
                };
                SetofOptions: {
                    from: "vendor_request_draft_input";
                    to: "vendor_requests";
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            review_vendor_request: {
                Args: {
                    p_decision: string;
                    p_expected_revision: number;
                    p_reason?: string;
                    p_request_id: string;
                };
                Returns: Database["public"]["CompositeTypes"]["vendor_request_transition_result"];
                SetofOptions: {
                    from: "*";
                    to: "vendor_request_transition_result";
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            submit_vendor_request: {
                Args: { p_expected_revision: number; p_request_id: string };
                Returns: Database["public"]["CompositeTypes"]["vendor_request_transition_result"];
                SetofOptions: {
                    from: "*";
                    to: "vendor_request_transition_result";
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
            update_vendor_request: {
                Args: {
                    p_draft: Database["public"]["CompositeTypes"]["vendor_request_draft_input"];
                    p_expected_revision: number;
                    p_request_id: string;
                };
                Returns: {
                    annual_spend_minor_units: number | null;
                    business_justification: string | null;
                    created_at: string;
                    currency_code: string | null;
                    id: string;
                    organization_id: string;
                    owner_user_id: string;
                    receives_confidential_data: boolean | null;
                    reviewer_user_id: string | null;
                    revision: number;
                    service_category: Database["public"]["Enums"]["vendor_service_category"] | null;
                    state: Database["public"]["Enums"]["vendor_request_state"];
                    supports_critical_process: boolean | null;
                    updated_at: string;
                    vendor_legal_name: string | null;
                    vendor_website: string | null;
                };
                SetofOptions: {
                    from: "*";
                    to: "vendor_requests";
                    isOneToOne: true;
                    isSetofReturn: false;
                };
            };
        };
        Enums: {
            membership_role: "requester" | "reviewer" | "administrator";
            vendor_request_state:
                | "draft"
                | "submitted"
                | "in_review"
                | "changes_requested"
                | "approved"
                | "rejected";
            vendor_service_category:
                | "software"
                | "professional_services"
                | "facilities"
                | "logistics"
                | "other";
            workflow_action:
                | "created"
                | "submitted"
                | "assigned"
                | "approved"
                | "rejected"
                | "requested_changes"
                | "resubmitted";
        };
        CompositeTypes: {
            vendor_request_draft_input: {
                vendor_legal_name: string | null;
                vendor_website: string | null;
                service_category: string | null;
                business_justification: string | null;
                annual_spend_minor_units: number | null;
                currency_code: string | null;
                receives_confidential_data: boolean | null;
                supports_critical_process: boolean | null;
            };
            vendor_request_transition_result: {
                request_id: string | null;
                previous_state: Database["public"]["Enums"]["vendor_request_state"] | null;
                current_state: Database["public"]["Enums"]["vendor_request_state"] | null;
                new_revision: number | null;
                audit_event_id: string | null;
                transitioned_at: string | null;
            };
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
            DefaultSchema["Views"])
      ? (DefaultSchema["Tables"] &
            DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema["Tables"]
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends (DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
      ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema["Enums"]
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends (DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
        : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
      ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema["CompositeTypes"]
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
        : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
      ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    public: {
        Enums: {
            membership_role: ["requester", "reviewer", "administrator"],
            vendor_request_state: [
                "draft",
                "submitted",
                "in_review",
                "changes_requested",
                "approved",
                "rejected",
            ],
            vendor_service_category: [
                "software",
                "professional_services",
                "facilities",
                "logistics",
                "other",
            ],
            workflow_action: [
                "created",
                "submitted",
                "assigned",
                "approved",
                "rejected",
                "requested_changes",
                "resubmitted",
            ],
        },
    },
} as const;
