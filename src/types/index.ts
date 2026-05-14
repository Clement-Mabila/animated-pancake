export type ConfigPhase = 'early' | 'pre_deploy' | 'deploy' | 'post'

export type MBodyRole =
  | 'sales'
  | 'account_manager'
  | 'operations'
  | 'engineering'
  | 'finance'
  | 'customer_success'
  /** Internal / Orion Console staff identity for admin-led onboarding flows */
  | 'admin'

export type ConfigScope = 'location' | 'sub_location' | 'mbody_role' | 'user'

export type ConfigStatus = 'draft' | 'client_complete' | 'mbody_complete' | 'live'

export type FieldOwner = 'client' | 'mbody' | 'both'

export type ContactRoleLabel =
  | 'exec'               // Fleet-Wide — CEO, VP Operations, Regional Director
  | 'ops_director'       // Location — Operations Director, Location Manager
  | 'site_manager'       // Sub-Location — Floor/Warehouse/Zone Manager
  | 'it_manager'         // System — IT Director, Systems Admin
  | 'owner'
  | 'supervisor'
  | 'facilities_manager'
  | 'operations_director'
  | 'fleet_wide_manager'
  | 'other'

export type NotificationType =
  | 'client_magic_link'
  | 'client_submitted'
  | 'mbody_completed'
  | 'config_live'

// ── Reference tables ────────────────────────────────────────

export interface Location {
  id:             string
  name:           string
  industry:       string | null
  country:        string | null
  city:           string | null
  assigned_am_id: string | null
  created_at:     string
  updated_at:     string
}

export interface SubLocation {
  id:          string
  location_id: string
  name:        string
  created_at:  string
}

export interface Robot {
  id:              string
  sub_location_id: string
  serial_id:       string
  alias:           string
  map_name:        string
  map_verified:    boolean
  created_at:      string
}

// ── Staff users ─────────────────────────────────────────────

export interface StaffUser {
  id:         string
  email:      string
  full_name:  string
  role:       MBodyRole
  created_at: string
  updated_at: string
}

// ── Staff identity (Phase 1 — entered on form) ───────────────

export interface StaffIdentity {
  fullName: string
  email:    string
  role:     MBodyRole
}

export type ConfigTarget = 'client' | 'my_role' | 'personal'

// ── Configurations ──────────────────────────────────────────

export interface Configuration {
  id:                   string
  location_id:          string | null
  sub_location_id:      string | null
  mbody_role:           MBodyRole | null
  mbody_user_id:        string | null
  staff_user_id:        string | null
  scope:                ConfigScope
  status:               ConfigStatus
  phase:                ConfigPhase
  created_by_staff_id:  string | null
  client_contact_id:    string | null
  last_edited_by:       string | null
  last_edited_at:       string | null
  client_submitted_at:  string | null
  mbody_completed_at:   string | null
  mbody_completed_by:   string | null
  went_live_at:         string | null
  created_at:           string
  updated_at:           string
  // Workflow extensions (added by workflow_migration.sql)
  gate_answers:         Record<string, unknown> | null
  deploy_checklist:     Record<string, boolean>
  workflow_template_id: string | null
}

// ── Workflow ─────────────────────────────────────────────────

export interface WorkflowTemplate {
  id:                 string
  name:               string
  is_active:          boolean
  is_draft:           boolean
  is_archived:        boolean
  is_default:         boolean
  created_at:         string
  updated_at:         string
  description:        string | null
  department:         string | null
  version:            string | null
  tags:               string[]
  color:              string | null
  last_published_at:  string | null
  location_id:        string | null
  contact_role:       ContactRoleLabel | null
  sub_location_group: string[] | null
  starting_phase:     ConfigPhase | null
}

export interface WorkflowSection {
  id:               string
  template_id:      string
  slug:             string
  title:            string
  subtitle:         string | null
  description:      string | null
  sort_order:       number
  checkpoint_count: number
  active:           boolean
  is_deleted:       boolean
  deleted_at:       string | null
}

export interface WorkflowQuestionOption {
  value: string
  label: string
  hint?: string | null
}

export interface WorkflowQuestion {
  id:                      string
  template_id:             string
  section_slug:            string
  field_key:               string
  label:                   string | null
  placeholder:             string | null
  field_type:              string
  visible_in_phases:       ConfigPhase[]
  options:                 WorkflowQuestionOption[] | null
  is_partial:              boolean
  instruction_pre_deploy:  string | null
  instruction_post_deploy: string | null
  dummy_value:             string | null
  dummy_tooltip:           string | null
  sort_order:              number
  active:                  boolean
  display_group:           string | null
  divider_before:          string | null
  is_deleted:              boolean
  deleted_at:              string | null
}

export interface WorkflowDeployTask {
  id:          string
  template_id: string
  task_key:    string
  title:       string
  description: string | null
  sort_order:  number
}

// Configuration with staff user joined
export interface ConfigurationWithStaff extends Configuration {
  staff_user: StaffUser | null
  location:   { industry: string | null } | null
}

// Configuration with all relations joined (for phase-aware resume panel)
export interface ConfigurationWithRelations extends ConfigurationWithStaff {
  client_contact: ClientContact | null
}

export interface ConfigSection {
  id:               string
  configuration_id: string
  section_id:       string
  data:             Record<string, unknown>
  is_complete:      boolean
  completed_by:     string | null
  saved_at:         string
}

// ── Field ownership ─────────────────────────────────────────

export interface FieldOwnership {
  id:         string
  section_id: string
  field_key:  string
  owner:      FieldOwner
  updated_by: string | null
  updated_at: string
}

// ── Client contacts ─────────────────────────────────────────

export interface ClientContact {
  id:                   string
  location_id:          string | null
  sub_location_id:      string | null
  full_name:            string
  email:                string
  phone:                string | null
  role_label:           ContactRoleLabel
  role_label_custom:    string | null
  orchestrator_user_id: string | null
  magic_token:          string | null
  token_expires_at:     string | null
  last_accessed_at:     string | null
  created_at:           string
}

// ── Config persons (section 4 contacts + section 5 recipients) ──

export type OrchestratorAccessScope = 'fleet_wide' | 'location' | 'sub_location'

export interface ConfigPerson {
  id:                  string
  configuration_id:    string
  full_name:           string
  email:               string
  phone:               string | null
  contact_roles:       string[]               // section-4 role IDs, empty for report-only persons
  access_scope:        OrchestratorAccessScope | null  // null = section-4 only, not yet a recipient
  sub_location_ids:    string[]
  can_amend_schedules: boolean
  created_at:          string
}

// ── Suggestions ─────────────────────────────────────────────

export interface ConfigSuggestion {
  id:               string
  section_id:       string
  field_key:        string
  value:            string
  usage_count:      number
  is_mbody_default: boolean
  industry:         string | null
  created_at:       string
  updated_at:       string
}

// ── Notifications ────────────────────────────────────────────

export interface Notification {
  id:               string
  configuration_id: string
  type:             NotificationType
  recipient_email:  string
  sent_at:          string
  opened_at:        string | null
  metadata:         Record<string, unknown>
}

// ── Section IDs ──────────────────────────────────────────────

export type SectionId =
  | 'roi'
  | 'kpis'
  | 'fleet'
  | 'contacts'
  | 'roles'
  | 'alerts'
  | 'integrations'
  | 'fsm'
  | 'insight'
  | 'timezone'
  | 'docs'

// ── Orchestrator config view ─────────────────────────────────

export interface OrchestratorConfig {
  sub_location_id:   string
  sub_location_name: string
  location_id:       string
  location_name:     string
  configuration_id:  string | null
  status:            ConfigStatus | null
  config_source:     'sub_location' | 'location'
  last_updated:      string | null
}

// ── Admin panel ──────────────────────────────────────────────

export type AdminApprovalStatus = 'pending_email_verify' | 'awaiting_approval' | 'active'

export interface AdminUser {
  user_id:           string
  email:             string
  full_name:         string | null
  created_at:        string
  approval_status:   AdminApprovalStatus
  skip_otp:          boolean
  /** When present on `admin_users`, used to pre-fill onboarding role for init-token flows. */
  mbody_role?:       MBodyRole | null
}

export interface AdminAuditEntry {
  id:            string
  admin_user_id: string
  occurred_at:   string
  action:        string
  entity_type:   string
  entity_id:     string | null
  before:        Record<string, unknown> | null
  after:         Record<string, unknown> | null
  diff:          Record<string, unknown> | null
  ip:            string | null
}

export interface ExportVersion {
  id:                   string
  admin_user_id:        string
  scope:                'one' | 'many' | 'all'
  configuration_ids:  string[]
  generated_at:         string
  version:              number
  payload_sha256:       string
  payload_size_bytes:   number
  included_incomplete:  boolean
}

export type ConfigBucketTab = 'draft' | 'in_progress' | 'complete' | 'all'

// ── Integration block types (used by IntegrationsSection) ────────────────────

export interface IntegrationField {
  key:      string
  label:    string
  type:     'text' | 'textarea' | 'select'
  options?: string[]
}

export interface IntegrationCheckpoint {
  key:   string
  label: string
}

export interface IntegrationBlockOptions {
  description: string
  color:       string
  bg:          string
  border:      string
  fields:      IntegrationField[]
  checkpoints: IntegrationCheckpoint[]
}

// ── Contact picker types (used by ContactsSection) ────────────────────────────

export interface ContactPickerOption {
  id:       string
  label:    string
  category: string
  required: boolean
}