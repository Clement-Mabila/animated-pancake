-- Dynamic question renderer migration
-- 1. Adds options JSONB column to workflow_questions
-- 2. Seeds all individual field + checkpoint questions for the 6 dynamic sections:
--    roi, kpis, roles, fsm, insight, timezone
-- Idempotent — safe to run multiple times

-- ── Schema change ────────────────────────────────────────────
ALTER TABLE public.workflow_questions
  ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL;

-- ─────────────────────────────────────────────────────────────
-- ROI  (visible: early + pre_deploy)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.workflow_questions
  (template_id, section_slug, field_key, label, field_type, visible_in_phases, options, is_partial, sort_order, active)
VALUES
  ('11111111-1111-1111-1111-111111111111','roi','primary_roi_objective',    'Primary ROI objective',              'textarea',   ARRAY['early','pre_deploy']::config_phase[], NULL, false,  1, true),
  ('11111111-1111-1111-1111-111111111111','roi','baseline_annual_cost',     'Baseline annual cost (£)',            'text',       ARRAY['early','pre_deploy']::config_phase[], NULL, false,  2, true),
  ('11111111-1111-1111-1111-111111111111','roi','target_cost_reduction',    'Target cost reduction (%)',           'text',       ARRAY['early','pre_deploy']::config_phase[], NULL, false,  3, true),
  ('11111111-1111-1111-1111-111111111111','roi','target_payback_period',    'Target payback period',               'text',       ARRAY['early','pre_deploy']::config_phase[], NULL, false,  4, true),
  ('11111111-1111-1111-1111-111111111111','roi','non_financial_roi_goals',  'Non-financial ROI goals',             'textarea',   ARRAY['early','pre_deploy']::config_phase[], NULL, false,  5, true),
  ('11111111-1111-1111-1111-111111111111','roi','roi_measurement_method',   'ROI measurement method',              'textarea',   ARRAY['early','pre_deploy']::config_phase[], NULL, false,  6, true),
  ('11111111-1111-1111-1111-111111111111','roi','target_sqft_per_robot_day','Target sq ft per robot per day',      'text',       ARRAY['early','pre_deploy']::config_phase[], NULL, false,  7, true),
  ('11111111-1111-1111-1111-111111111111','roi','target_util_hours_per_day','Target utilisation hours per day',    'text',       ARRAY['early','pre_deploy']::config_phase[], NULL, false,  8, true),
  -- checkpoints
  ('11111111-1111-1111-1111-111111111111','roi','baseline_provided',        'Baseline annual costs provided and validated',                      'checkpoint', ARRAY['early','pre_deploy']::config_phase[], NULL, false,  9, true),
  ('11111111-1111-1111-1111-111111111111','roi','roi_agreed',               'ROI targets agreed and signed off by client stakeholder',           'checkpoint', ARRAY['early','pre_deploy']::config_phase[], NULL, false, 10, true),
  ('11111111-1111-1111-1111-111111111111','roi','measurement_documented',   'ROI measurement method documented and verified',                    'checkpoint', ARRAY['early','pre_deploy']::config_phase[], NULL, false, 11, true),
  ('11111111-1111-1111-1111-111111111111','roi','review_cadence',           'Review cadence for ROI tracking agreed and scheduled',             'checkpoint', ARRAY['early','pre_deploy']::config_phase[], NULL, false, 12, true)
ON CONFLICT (template_id, section_slug, field_key) DO UPDATE SET
  label             = EXCLUDED.label,
  field_type        = EXCLUDED.field_type,
  visible_in_phases = EXCLUDED.visible_in_phases,
  options           = EXCLUDED.options,
  sort_order        = EXCLUDED.sort_order,
  active            = EXCLUDED.active;

-- ─────────────────────────────────────────────────────────────
-- TIMEZONE  (visible: early + pre_deploy)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.workflow_questions
  (template_id, section_slug, field_key, label, field_type, visible_in_phases, options, is_partial, sort_order, active)
VALUES
  ('11111111-1111-1111-1111-111111111111','timezone','primary_timezone',         'Primary timezone',              'select',   ARRAY['early','pre_deploy']::config_phase[],
   '[{"value":"America/New_York","label":"Eastern Time (ET) — UTC-5/4"},{"value":"America/Chicago","label":"Central Time (CT) — UTC-6/5"},{"value":"America/Denver","label":"Mountain Time (MT) — UTC-7/6"},{"value":"America/Los_Angeles","label":"Pacific Time (PT) — UTC-8/7"},{"value":"America/Anchorage","label":"Alaska Time (AKT) — UTC-9/8"},{"value":"Pacific/Honolulu","label":"Hawaii Time (HAT) — UTC-10"},{"value":"Europe/London","label":"Greenwich Mean Time (GMT/BST) — UTC+0/1"},{"value":"Europe/Paris","label":"Central European Time (CET/CEST) — UTC+1/2"},{"value":"Asia/Dubai","label":"Gulf Standard Time (GST) — UTC+4"},{"value":"Asia/Singapore","label":"Singapore Time (SGT) — UTC+8"},{"value":"Australia/Sydney","label":"Australian Eastern Time (AEST/AEDT) — UTC+10/11"}]'::jsonb,
   false, 1, true),
  ('11111111-1111-1111-1111-111111111111','timezone','additional_timezones',     'Additional timezones',          'text',     ARRAY['early','pre_deploy']::config_phase[], NULL, false, 2, true),
  ('11111111-1111-1111-1111-111111111111','timezone','business_hours',           'Business hours',                'text',     ARRAY['early','pre_deploy']::config_phase[], NULL, false, 3, true),
  ('11111111-1111-1111-1111-111111111111','timezone','daily_report_time',        'Daily report time',             'text',     ARRAY['early','pre_deploy']::config_phase[], NULL, false, 4, true),
  ('11111111-1111-1111-1111-111111111111','timezone','weekly_report_schedule',   'Weekly report schedule',        'text',     ARRAY['early','pre_deploy']::config_phase[], NULL, false, 5, true),
  ('11111111-1111-1111-1111-111111111111','timezone','monthly_report_schedule',  'Monthly report schedule',       'text',     ARRAY['early','pre_deploy']::config_phase[], NULL, false, 6, true),
  -- checkpoints
  ('11111111-1111-1111-1111-111111111111','timezone','primary_tz_set',           'Primary timezone set and confirmed in Orchestrator',          'checkpoint', ARRAY['early','pre_deploy']::config_phase[], NULL, false,  7, true),
  ('11111111-1111-1111-1111-111111111111','timezone','dst_confirmed',            'DST handling confirmed and tested',                           'checkpoint', ARRAY['early','pre_deploy']::config_phase[], NULL, false,  8, true),
  ('11111111-1111-1111-1111-111111111111','timezone','multiregion_tested',       'Multi-region timezone support tested',                        'checkpoint', ARRAY['early','pre_deploy']::config_phase[], NULL, false,  9, true),
  ('11111111-1111-1111-1111-111111111111','timezone','schedule_activated',       'Report schedule activated and time confirmed',                'checkpoint', ARRAY['early','pre_deploy']::config_phase[], NULL, false, 10, true),
  ('11111111-1111-1111-1111-111111111111','timezone','first_report',             'First scheduled report sent and verified',                    'checkpoint', ARRAY['early','pre_deploy']::config_phase[], NULL, false, 11, true)
ON CONFLICT (template_id, section_slug, field_key) DO UPDATE SET
  label             = EXCLUDED.label,
  field_type        = EXCLUDED.field_type,
  visible_in_phases = EXCLUDED.visible_in_phases,
  options           = EXCLUDED.options,
  sort_order        = EXCLUDED.sort_order,
  active            = EXCLUDED.active;

-- ─────────────────────────────────────────────────────────────
-- ROLES  (visible: pre_deploy + post; login_method post-only)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.workflow_questions
  (template_id, section_slug, field_key, label, field_type, visible_in_phases, options, is_partial, sort_order, active)
VALUES
  ('11111111-1111-1111-1111-111111111111','roles','fleet_wide_recipients',    'Fleet-wide report recipients',    'textarea', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 1, true),
  ('11111111-1111-1111-1111-111111111111','roles','site_specific_recipients', 'Site-specific report recipients', 'textarea', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 2, true),
  ('11111111-1111-1111-1111-111111111111','roles','schedule_amendment_access','Schedule amendment access',       'textarea', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 3, true),
  ('11111111-1111-1111-1111-111111111111','roles','login_method',             'Login method',                    'select',   ARRAY['post']::config_phase[],
   '[{"value":"sso_azure","label":"SSO via Azure AD"},{"value":"sso_google","label":"SSO via Google Workspace"},{"value":"sso_okta","label":"SSO via Okta"},{"value":"email","label":"Individual email login"},{"value":"other","label":"Other"}]'::jsonb,
   false, 4, true),
  -- checkpoints
  ('11111111-1111-1111-1111-111111111111','roles','fleet_admin_provisioned',  'Fleet admin accounts provisioned',                                             'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  5, true),
  ('11111111-1111-1111-1111-111111111111','roles','site_users_provisioned',   'Site-level users provisioned',                                                 'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  6, true),
  ('11111111-1111-1111-1111-111111111111','roles','dashboards_tested',        'Dashboards tested with each user level',                                       'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  7, true),
  ('11111111-1111-1111-1111-111111111111','roles','client_admin_trained',     'Client administrator trained on user management',                              'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  8, true),
  ('11111111-1111-1111-1111-111111111111','roles','sso_configured',           'SSO configured and tested (if applicable)',                                     'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  9, true),
  ('11111111-1111-1111-1111-111111111111','roles','sharing_confirmed',        'Report sharing / distribution confirmed per site',                             'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 10, true)
ON CONFLICT (template_id, section_slug, field_key) DO UPDATE SET
  label             = EXCLUDED.label,
  field_type        = EXCLUDED.field_type,
  visible_in_phases = EXCLUDED.visible_in_phases,
  options           = EXCLUDED.options,
  sort_order        = EXCLUDED.sort_order,
  active            = EXCLUDED.active;

-- ─────────────────────────────────────────────────────────────
-- FSM  (visible: pre_deploy only)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.workflow_questions
  (template_id, section_slug, field_key, label, field_type, visible_in_phases, options, is_partial, sort_order, active)
VALUES
  ('11111111-1111-1111-1111-111111111111','fsm','sla_tier',                  'SLA tier',                              'select',   ARRAY['pre_deploy']::config_phase[],
   '[{"value":"p1","label":"P1 — Critical: 2hr response / 8hr resolution"},{"value":"p2","label":"P2 — High: 4hr response / 24hr resolution"},{"value":"p3","label":"P3 — Medium: 8hr response / 48hr resolution"},{"value":"custom","label":"Custom (specify below)"}]'::jsonb,
   false,  1, true),
  ('11111111-1111-1111-1111-111111111111','fsm','sla_credit_rate',           'SLA credit rate',                       'text',     ARRAY['pre_deploy']::config_phase[], NULL, false,  2, true),
  ('11111111-1111-1111-1111-111111111111','fsm','breakfix_approval_method',  'Break/Fix approval method',             'text',     ARRAY['pre_deploy']::config_phase[], NULL, false,  3, true),
  ('11111111-1111-1111-1111-111111111111','fsm','breakfix_approval_contact', 'Break/Fix approval contact',            'text',     ARRAY['pre_deploy']::config_phase[], NULL, false,  4, true),
  ('11111111-1111-1111-1111-111111111111','fsm','client_portal_access',      'Client portal access',                  'text',     ARRAY['pre_deploy']::config_phase[], NULL, false,  5, true),
  ('11111111-1111-1111-1111-111111111111','fsm','wo_report_delivery',        'WO service report delivery',            'textarea', ARRAY['pre_deploy']::config_phase[], NULL, false,  6, true),
  ('11111111-1111-1111-1111-111111111111','fsm','csat_optin',                'CSAT opt-in',                           'text',     ARRAY['pre_deploy']::config_phase[], NULL, false,  7, true),
  ('11111111-1111-1111-1111-111111111111','fsm','damage_classification',     'Damage classification process',         'textarea', ARRAY['pre_deploy']::config_phase[], NULL, false,  8, true),
  ('11111111-1111-1111-1111-111111111111','fsm','pm_schedule_recurrence',    'PM schedule recurrence',                'text',     ARRAY['pre_deploy']::config_phase[], NULL, false,  9, true),
  ('11111111-1111-1111-1111-111111111111','fsm','pm_completion_recipient',   'PM completion report recipient',        'text',     ARRAY['pre_deploy']::config_phase[], NULL, false, 10, true),
  ('11111111-1111-1111-1111-111111111111','fsm','defective_parts_handover',  'Defective parts handover process',      'textarea', ARRAY['pre_deploy']::config_phase[], NULL, false, 11, true),
  ('11111111-1111-1111-1111-111111111111','fsm','commissioning_contact',     'New robot commissioning contact',       'text',     ARRAY['pre_deploy']::config_phase[], NULL, false, 12, true),
  -- checkpoints
  ('11111111-1111-1111-1111-111111111111','fsm','sla_confirmed',             'SLA tier confirmed and matches signed contract',                                'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 13, true),
  ('11111111-1111-1111-1111-111111111111','fsm','credit_rate_confirmed',     'SLA service credit rate confirmed (£70/hr/robot or negotiated rate)',           'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 14, true),
  ('11111111-1111-1111-1111-111111111111','fsm','breakfix_documented',       'Break/Fix approval method and contact documented',                             'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 15, true),
  ('11111111-1111-1111-1111-111111111111','fsm','portal_provisioned',        'Client portal access provisioned (if required)',                               'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 16, true),
  ('11111111-1111-1111-1111-111111111111','fsm','wo_recipients_set',         'WO service report recipients set per site in Orchestrator',                    'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 17, true),
  ('11111111-1111-1111-1111-111111111111','fsm','pm_recipient_confirmed',    'PM completion report recipient confirmed',                                     'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 18, true),
  ('11111111-1111-1111-1111-111111111111','fsm','csat_enabled',              'Client feedback / CSAT requests enabled and tested',                           'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 19, true),
  ('11111111-1111-1111-1111-111111111111','fsm','damage_explained',          'Damage classification process explained and client contact confirmed',         'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 20, true),
  ('11111111-1111-1111-1111-111111111111','fsm','pm_schedule_configured',    'PM 14-day recurrence schedule configured per robot',                           'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 21, true),
  ('11111111-1111-1111-1111-111111111111','fsm','parts_contact_confirmed',   'Defective parts handover contact confirmed per site',                          'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 22, true),
  ('11111111-1111-1111-1111-111111111111','fsm','commissioning_confirmed',   'New robot commissioning contact confirmed',                                    'checkpoint', ARRAY['pre_deploy']::config_phase[], NULL, false, 23, true)
ON CONFLICT (template_id, section_slug, field_key) DO UPDATE SET
  label             = EXCLUDED.label,
  field_type        = EXCLUDED.field_type,
  visible_in_phases = EXCLUDED.visible_in_phases,
  options           = EXCLUDED.options,
  sort_order        = EXCLUDED.sort_order,
  active            = EXCLUDED.active;

-- ─────────────────────────────────────────────────────────────
-- KPIS  (visible: pre_deploy + post; custom_kpi_formula post-only)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.workflow_questions
  (template_id, section_slug, field_key, label, field_type, visible_in_phases, options, is_partial, sort_order, active)
VALUES
  ('11111111-1111-1111-1111-111111111111','kpis','selected_kpis',       'KPI selection',                 'multiselect', ARRAY['pre_deploy','post']::config_phase[],
   '[{"value":"fleet-subloc-roi","label":"Fleet and Sub-Location ROI","hint":"Derived"},{"value":"total-area","label":"Total Area Cleaned","hint":"Direct"},{"value":"avg-area-per-robot-day","label":"Avg Area Cleaned by Robot per Day","hint":"Derived"},{"value":"avg-cleaning-time-per-day","label":"Avg Cleaning Time by Robot per Day","hint":"Derived"},{"value":"robot-cost-per-hour","label":"Robot Cost per Hour","hint":"Derived"}]'::jsonb,
   false, 1, true),
  ('11111111-1111-1111-1111-111111111111','kpis','headline_kpi',        'Headline KPI',                  'text',        ARRAY['pre_deploy','post']::config_phase[], NULL, false, 2, true),
  ('11111111-1111-1111-1111-111111111111','kpis','reporting_frequency', 'Reporting frequency',           'text',        ARRAY['pre_deploy','post']::config_phase[], NULL, false, 3, true),
  ('11111111-1111-1111-1111-111111111111','kpis','kpi_targets',         'KPI targets and thresholds',    'textarea',    ARRAY['pre_deploy','post']::config_phase[], NULL, false, 4, true),
  ('11111111-1111-1111-1111-111111111111','kpis','custom_kpi_formula',  'Custom KPI formula',            'textarea',    ARRAY['post']::config_phase[],              NULL, false, 5, true),
  -- checkpoints
  ('11111111-1111-1111-1111-111111111111','kpis','kpi_confirmed',       'KPI selection confirmed with client stakeholders',                   'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  6, true),
  ('11111111-1111-1111-1111-111111111111','kpis','targets_set',         'Targets and thresholds set per KPI',                                 'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  7, true),
  ('11111111-1111-1111-1111-111111111111','kpis','headline_agreed',     'Top headline KPI agreed and configured in Orchestrator',             'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  8, true),
  ('11111111-1111-1111-1111-111111111111','kpis','baseline_loaded',     'Benchmark baseline data loaded for trend comparison',                'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  9, true),
  ('11111111-1111-1111-1111-111111111111','kpis','custom_tested',       'Custom formula documented and tested (if applicable)',               'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 10, true)
ON CONFLICT (template_id, section_slug, field_key) DO UPDATE SET
  label             = EXCLUDED.label,
  field_type        = EXCLUDED.field_type,
  visible_in_phases = EXCLUDED.visible_in_phases,
  options           = EXCLUDED.options,
  sort_order        = EXCLUDED.sort_order,
  active            = EXCLUDED.active;

-- ─────────────────────────────────────────────────────────────
-- INSIGHT  (visible: pre_deploy + post; bi_integration + benchmarking post-only)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.workflow_questions
  (template_id, section_slug, field_key, label, field_type, visible_in_phases, options, is_partial, sort_order, active)
VALUES
  ('11111111-1111-1111-1111-111111111111','insight','selected_components', 'Report components',             'multiselect', ARRAY['pre_deploy','post']::config_phase[],
   '[{"value":"smart-text","label":"Smart Text","hint":"AI narrative"},{"value":"kpi-grid","label":"KPI Grid","hint":"Trend metrics"},{"value":"area-day","label":"Area by Day","hint":"Daily trend"},{"value":"breakeven","label":"Breakeven Trend","hint":"ROI trend"},{"value":"area-location","label":"Area by Location","hint":"Cross-site"},{"value":"problem-areas","label":"Problem Areas","hint":"AI anomalies"},{"value":"forecast","label":"Forecast","hint":"Predictive"},{"value":"consumables","label":"Consumables","hint":"Usage"},{"value":"key-takeaways","label":"Key Takeaways","hint":"AI synthesis"},{"value":"time-area","label":"Time & Area by Robot","hint":"Robot compare"}]'::jsonb,
   false, 1, true),
  ('11111111-1111-1111-1111-111111111111','insight','selected_kpis',      'KPIs in report',                'multiselect', ARRAY['pre_deploy','post']::config_phase[],
   '[{"value":"total-jobs","label":"Total Jobs","hint":"Direct"},{"value":"jobs-completed","label":"Jobs Completed","hint":"Direct"},{"value":"success-rate","label":"Success Rate","hint":"Derived"},{"value":"total-area","label":"Total Area Cleaned","hint":"Direct"},{"value":"total-time","label":"Total Time","hint":"Direct"},{"value":"productivity","label":"Productivity","hint":"Derived"},{"value":"avg-coverage","label":"Avg Coverage","hint":"Direct"},{"value":"avg-job-duration","label":"Avg Job Duration","hint":"Direct"},{"value":"availability","label":"Availability %","hint":"Derived"},{"value":"utilization","label":"Utilization %","hint":"Derived"}]'::jsonb,
   false, 2, true),
  ('11111111-1111-1111-1111-111111111111','insight','kpi_targets',         'KPI targets and benchmarks',    'textarea',    ARRAY['pre_deploy','post']::config_phase[], NULL, false, 3, true),
  ('11111111-1111-1111-1111-111111111111','insight','report_frequency',    'Report frequency',              'text',        ARRAY['pre_deploy','post']::config_phase[], NULL, false, 4, true),
  ('11111111-1111-1111-1111-111111111111','insight','report_recipients',   'Report recipients',             'text',        ARRAY['pre_deploy','post']::config_phase[], NULL, false, 5, true),
  ('11111111-1111-1111-1111-111111111111','insight','report_format',       'Report format / delivery',      'text',        ARRAY['pre_deploy','post']::config_phase[], NULL, false, 6, true),
  ('11111111-1111-1111-1111-111111111111','insight','bi_integration',      'BI / data integration',         'text',        ARRAY['post']::config_phase[],              NULL, false, 7, true),
  ('11111111-1111-1111-1111-111111111111','insight','benchmarking',        'Benchmarking notes',            'textarea',    ARRAY['post']::config_phase[],              NULL, false, 8, true),
  -- checkpoints
  ('11111111-1111-1111-1111-111111111111','insight','components_confirmed', 'Report components selected and confirmed with client',             'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false,  9, true),
  ('11111111-1111-1111-1111-111111111111','insight','kpi_targets_set',     'KPI targets and thresholds set per site',                          'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 10, true),
  ('11111111-1111-1111-1111-111111111111','insight','template_confirmed',  'Per-site insight report template confirmed',                       'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 11, true),
  ('11111111-1111-1111-1111-111111111111','insight','recipients_set',      'Report recipients set at site level in Orchestrator',              'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 12, true),
  ('11111111-1111-1111-1111-111111111111','insight','bi_tested',           'BI / data integration tested (if applicable)',                     'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 13, true),
  ('11111111-1111-1111-1111-111111111111','insight','first_report_sent',   'First automated report sent and signed off by client',             'checkpoint', ARRAY['pre_deploy','post']::config_phase[], NULL, false, 14, true)
ON CONFLICT (template_id, section_slug, field_key) DO UPDATE SET
  label             = EXCLUDED.label,
  field_type        = EXCLUDED.field_type,
  visible_in_phases = EXCLUDED.visible_in_phases,
  options           = EXCLUDED.options,
  sort_order        = EXCLUDED.sort_order,
  active            = EXCLUDED.active;

-- ── Verification ─────────────────────────────────────────────
-- SELECT section_slug, field_key, field_type, visible_in_phases, sort_order
-- FROM public.workflow_questions
-- WHERE template_id = '11111111-1111-1111-1111-111111111111'
--   AND field_key != '__all__'
-- ORDER BY section_slug, sort_order;
