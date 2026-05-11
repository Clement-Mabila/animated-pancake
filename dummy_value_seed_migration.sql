-- Seed system default (dummy) values for workflow questions
-- These are applied at export time when a client leaves a field empty.
-- Values sourced from: MBody Orchestrator Onboarding Data Map v3 — Column F (Can use dummy?) + Column L (Notes)
-- Idempotent — safe to run multiple times. Applies to all templates.

-- ── ROI ───────────────────────────────────────────────────────────────────
UPDATE public.workflow_questions SET dummy_value = '$17/hr + 20% overhead'
  WHERE section_slug = 'roi' AND field_key = 'baseline_annual_cost';
UPDATE public.workflow_questions SET dummy_value = '25–30%'
  WHERE section_slug = 'roi' AND field_key = 'target_cost_reduction';
UPDATE public.workflow_questions SET dummy_value = '18–24 months'
  WHERE section_slug = 'roi' AND field_key = 'target_payback_period';
UPDATE public.workflow_questions SET dummy_value = 'Use standard MBody methodology'
  WHERE section_slug = 'roi' AND field_key = 'roi_measurement_method';
UPDATE public.workflow_questions SET dummy_value = '8 hrs/day utilization × robot speed'
  WHERE section_slug = 'roi' AND field_key = 'target_sqft_per_robot_day';
UPDATE public.workflow_questions SET dummy_value = '8 hrs/day'
  WHERE section_slug = 'roi' AND field_key = 'target_util_hours_per_day';

-- ── KPIs ──────────────────────────────────────────────────────────────────
UPDATE public.workflow_questions SET dummy_value = 'Avg Coverage'
  WHERE section_slug = 'kpis' AND field_key = 'headline_kpi';
UPDATE public.workflow_questions SET dummy_value = 'Real-time + daily + weekly + monthly'
  WHERE section_slug = 'kpis' AND field_key = 'reporting_frequency';
UPDATE public.workflow_questions SET dummy_value = 'None'
  WHERE section_slug = 'kpis' AND field_key = 'custom_kpi_formula';
UPDATE public.workflow_questions SET dummy_value = 'Industry benchmarks — refine post-deploy'
  WHERE section_slug = 'kpis' AND field_key = 'kpi_targets';

-- ── Roles ─────────────────────────────────────────────────────────────────
UPDATE public.workflow_questions SET dummy_value = 'Individual email login (revisit SSO in Q2)'
  WHERE section_slug = 'roles' AND field_key = 'login_method';

-- ── FSM ───────────────────────────────────────────────────────────────────
UPDATE public.workflow_questions SET dummy_value = '$70/hr/robot'
  WHERE section_slug = 'fsm' AND field_key = 'sla_credit_rate';
UPDATE public.workflow_questions SET dummy_value = 'Email sign-off'
  WHERE section_slug = 'fsm' AND field_key = 'breakfix_approval_method';
UPDATE public.workflow_questions SET dummy_value = 'No portal'
  WHERE section_slug = 'fsm' AND field_key = 'client_portal_access';
UPDATE public.workflow_questions SET dummy_value = 'Opt-in'
  WHERE section_slug = 'fsm' AND field_key = 'csat_optin';
UPDATE public.workflow_questions SET dummy_value = 'Use standard MBody process explanation'
  WHERE section_slug = 'fsm' AND field_key = 'damage_classification';
UPDATE public.workflow_questions SET dummy_value = 'Every 14 days'
  WHERE section_slug = 'fsm' AND field_key = 'pm_schedule_recurrence';
UPDATE public.workflow_questions SET dummy_value = 'Use standard MBody process (real contact still required)'
  WHERE section_slug = 'fsm' AND field_key = 'defective_parts_handover';

-- ── Insight ───────────────────────────────────────────────────────────────
UPDATE public.workflow_questions SET dummy_value = 'Daily email + weekly PDF + monthly deep-dive'
  WHERE section_slug = 'insight' AND field_key = 'report_frequency';
UPDATE public.workflow_questions SET dummy_value = 'Email digest + dashboard'
  WHERE section_slug = 'insight' AND field_key = 'report_format';
UPDATE public.workflow_questions SET dummy_value = 'vs prior period'
  WHERE section_slug = 'insight' AND field_key = 'benchmarking';
UPDATE public.workflow_questions SET dummy_value = 'Industry benchmarks — refine post-deploy'
  WHERE section_slug = 'insight' AND field_key = 'kpi_targets';

-- ── Timezone ──────────────────────────────────────────────────────────────
UPDATE public.workflow_questions SET dummy_value = 'Mon–Fri 06:00–22:00'
  WHERE section_slug = 'timezone' AND field_key = 'business_hours';
UPDATE public.workflow_questions SET dummy_value = '07:00 local'
  WHERE section_slug = 'timezone' AND field_key = 'daily_report_time';
UPDATE public.workflow_questions SET dummy_value = 'Monday 07:30'
  WHERE section_slug = 'timezone' AND field_key = 'weekly_report_schedule';
UPDATE public.workflow_questions SET dummy_value = '1st of month, 08:00'
  WHERE section_slug = 'timezone' AND field_key = 'monthly_report_schedule';

-- ── Verification (uncomment to check) ─────────────────────────────────────
-- SELECT section_slug, field_key, field_type, dummy_value
-- FROM public.workflow_questions
-- WHERE dummy_value IS NOT NULL AND is_partial = false
-- ORDER BY section_slug, field_key;
