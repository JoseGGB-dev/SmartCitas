export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type AppRole = "admin" | "auditor" | "doctor" | "operator" | "patient" | "medico" | "paciente";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  document_type: string | null;
  document_number: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

type UserRole = {
  id: string;
  user_id: string;
  role: AppRole;
};

type Catalog = {
  id: number;
  code: string;
  name: string;
  description: string | null;
  address?: string | null;
  active: boolean;
};

type Patient = {
  id: string;
  profile_id: string | null;
  insurance_number: string | null;
  first_name: string | null;
  last_name: string | null;
  document_number: string | null;
  email: string | null;
  birth_date: string | null;
  sex: string | null;
  phone: string | null;
  address: string | null;
  district: string | null;
  preferred_contact_channel: string | null;
  disease: string | null;
  chronic_condition: boolean;
  vulnerability_condition: boolean;
  priority_points: number;
  priority_level: "Alta" | "Media" | "Baja";
  registered_at: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type Doctor = {
  id: string;
  profile_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  professional_license: string | null;
  facility_id: number | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type MedicalSlot = {
  id: string;
  doctor_id: string | null;
  facility_id: number;
  specialty_id: number;
  start_datetime: string;
  end_datetime: string;
  status: "AVAILABLE" | "RESERVED" | "FULL" | "CANCELLED" | "COMPLETED";
  capacity: number;
  available_capacity: number;
  version: number;
  created_at: string;
  updated_at: string;
};

type AppointmentRequest = {
  id: string;
  patient_id: string;
  specialty_id: number;
  preferred_facility_id: number | null;
  preferred_date_from: string | null;
  preferred_date_to: string | null;
  preferred_time_range: string | null;
  request_date: string;
  status: "DRAFT" | "SUBMITTED" | "WAITING" | "OFFERED" | "SCHEDULED" | "CANCELLED" | "CLOSED";
  created_at: string;
  updated_at: string;
};

type WaitingListEntry = {
  id: string;
  appointment_request_id: string;
  patient_id: string;
  specialty_id: number;
  status: "ACTIVE" | "TEMPORARILY_OFFERED" | "ASSIGNED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  waiting_since: string;
  current_position: number | null;
  created_at: string;
  updated_at: string;
};

type PriorityEvaluation = {
  id: string;
  waiting_list_entry_id: string;
  rules_version: string;
  age_points: number;
  chronic_condition_points: number;
  waiting_days_points: number;
  additional_points: number;
  total_score: number;
  explanation: Json;
  evaluated_at: string;
};

type Appointment = {
  id: string;
  patient_id: string;
  medical_slot_id: string;
  appointment_request_id: string | null;
  status: "PENDING_CONFIRMATION" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  confirmation_date: string | null;
  cancellation_date: string | null;
  cancellation_reason: string | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
};

type SlotOffer = {
  id: string;
  medical_slot_id: string;
  waiting_list_entry_id: string;
  patient_id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  offered_at: string;
  expires_at: string;
  responded_at: string | null;
  unique_token: string;
  created_at: string;
};

type AuditLog = {
  id: string;
  actor_user_id: string | null;
  actor_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  previous_value: Json;
  new_value: Json;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      profiles: Table<Profile, Partial<Profile> & { id: string }, Partial<Profile>>;
      user_roles: Table<
        UserRole,
        Partial<UserRole> & { user_id: string; role: AppRole },
        Partial<UserRole>
      >;
      specialties: Table<
        Catalog,
        Partial<Catalog> & { code: string; name: string },
        Partial<Catalog>
      >;
      facilities: Table<
        Catalog,
        Partial<Catalog> & { code: string; name: string },
        Partial<Catalog>
      >;
      patients: Table<Patient, Partial<Patient>, Partial<Patient>>;
      doctors: Table<Doctor, Partial<Doctor>, Partial<Doctor>>;
      doctor_specialties: Table<{ doctor_id: string; specialty_id: number }>;
      medical_slots: Table<
        MedicalSlot,
        Partial<MedicalSlot> & {
          facility_id: number;
          specialty_id: number;
          start_datetime: string;
          end_datetime: string;
          capacity: number;
          available_capacity: number;
          status: MedicalSlot["status"];
        },
        Partial<MedicalSlot>
      >;
      appointment_requests: Table<
        AppointmentRequest,
        Partial<AppointmentRequest> & {
          patient_id: string;
          specialty_id: number;
          request_date: string;
          status: AppointmentRequest["status"];
        },
        Partial<AppointmentRequest>
      >;
      waiting_list_entries: Table<
        WaitingListEntry,
        Partial<WaitingListEntry> & {
          appointment_request_id: string;
          patient_id: string;
          specialty_id: number;
          status: WaitingListEntry["status"];
          waiting_since: string;
        },
        Partial<WaitingListEntry>
      >;
      priority_evaluations: Table<
        PriorityEvaluation,
        Partial<PriorityEvaluation> & {
          waiting_list_entry_id: string;
          rules_version: string;
          total_score: number;
          explanation: Json;
          evaluated_at: string;
        },
        Partial<PriorityEvaluation>
      >;
      appointments: Table<
        Appointment,
        Partial<Appointment> & {
          patient_id: string;
          medical_slot_id: string;
          status: Appointment["status"];
        },
        Partial<Appointment>
      >;
      slot_offers: Table<
        SlotOffer,
        Partial<SlotOffer> & {
          medical_slot_id: string;
          waiting_list_entry_id: string;
          patient_id: string;
          status: SlotOffer["status"];
          offered_at: string;
          expires_at: string;
          unique_token: string;
        },
        Partial<SlotOffer>
      >;
      notification_attempts: Table<Record<string, unknown>>;
      audit_logs: Table<
        AuditLog,
        Partial<AuditLog> & { action: string; entity_type: string },
        Partial<AuditLog>
      >;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_patient_priority_board: {
        Args: Record<PropertyKey, never>;
        Returns: {
          id: string;
          position: number;
          patient_name: string;
          disease: string | null;
          chronic_condition: boolean;
          vulnerability_condition: boolean;
          age: number | null;
          waiting_days: number;
          points: number;
          priority_level: "Alta" | "Media" | "Baja";
          status:
            | "ACTIVE"
            | "TEMPORARILY_OFFERED"
            | "ASSIGNED"
            | "REJECTED"
            | "EXPIRED"
            | "CANCELLED"
            | "SIN_SOLICITUD";
          registered_at: string;
          is_current_patient: boolean;
        }[];
      };
      recalculate_patient_priority: {
        Args: {
          _patient_id: string;
        };
        Returns: undefined;
      };
      has_role: {
        Args: {
          _role: AppRole;
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: {
      [_ in never]: never;
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
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Insert: infer I }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends { Update: infer U }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "auditor", "doctor", "operator", "patient", "medico", "paciente"],
    },
  },
} as const;
