-- Dynamic placeholders migration
-- Adds placeholder column to workflow_questions and seeds system defaults
-- from the original mbody-onboarding-checklist-v1.1.html
-- Idempotent — safe to run multiple times

-- ── Schema change ──────────────────────────────────────────────────────────
ALTER TABLE public.workflow_questions
  ADD COLUMN IF NOT EXISTS placeholder TEXT DEFAULT NULL;

-- ── Seed defaults (all templates) ─────────────────────────────────────────
-- ROI
UPDATE public.workflow_questions SET placeholder = 'e.g. Reduce manual cleaning labour cost by 30%, increase hygiene consistency across all floors'
  WHERE section_slug = 'roi' AND field_key = 'primary_roi_objective';
UPDATE public.workflow_questions SET placeholder = 'e.g. 480,000'
  WHERE section_slug = 'roi' AND field_key = 'baseline_annual_cost';
UPDATE public.workflow_questions SET placeholder = 'e.g. 28%'
  WHERE section_slug = 'roi' AND field_key = 'target_cost_reduction';
UPDATE public.workflow_questions SET placeholder = 'e.g. 18 months'
  WHERE section_slug = 'roi' AND field_key = 'target_payback_period';
UPDATE public.workflow_questions SET placeholder = 'e.g. Improved audit scores, reduced staff injury, 24/7 coverage without shift premium'
  WHERE section_slug = 'roi' AND field_key = 'non_financial_roi_goals';
UPDATE public.workflow_questions SET placeholder = 'e.g. Monthly labour hour comparison, hygiene audit pass rate, downtime hours avoided'
  WHERE section_slug = 'roi' AND field_key = 'roi_measurement_method';
UPDATE public.workflow_questions SET placeholder = 'e.g. 18,000 ft² / robot / day'
  WHERE section_slug = 'roi' AND field_key = 'target_sqft_per_robot_day';
UPDATE public.workflow_questions SET placeholder = 'e.g. 6.5 hrs / robot / day'
  WHERE section_slug = 'roi' AND field_key = 'target_util_hours_per_day';

-- KPIs
UPDATE public.workflow_questions SET placeholder = 'e.g. Avg Coverage — the single most important metric for this client'
  WHERE section_slug = 'kpis' AND field_key = 'headline_kpi';
UPDATE public.workflow_questions SET placeholder = 'e.g. Real-time dashboard + daily digest + weekly summary'
  WHERE section_slug = 'kpis' AND field_key = 'reporting_frequency';
UPDATE public.workflow_questions SET placeholder = 'e.g. ROI < $20/hr, Avg Area Cleaned > 16,000 sq ft/robot/day, Utilization > 4 hrs/day/robot...'
  WHERE section_slug = 'kpis' AND field_key = 'kpi_targets';
UPDATE public.workflow_questions SET placeholder = 'e.g. Hygiene score = (coverage % × task completion %) weighted by floor priority'
  WHERE section_slug = 'kpis' AND field_key = 'custom_kpi_formula';

-- Roles
UPDATE public.workflow_questions SET placeholder = 'Names / roles who see all-robot, all-site data'
  WHERE section_slug = 'roles' AND field_key = 'fleet_wide_recipients';
UPDATE public.workflow_questions SET placeholder = 'Roles that see only their own site or sub-location data'
  WHERE section_slug = 'roles' AND field_key = 'site_specific_recipients';
UPDATE public.workflow_questions SET placeholder = 'e.g. Programme Manager (fleet-wide), Site Manager (own site only)'
  WHERE section_slug = 'roles' AND field_key = 'schedule_amendment_access';

-- FSM
UPDATE public.workflow_questions SET placeholder = 'Standard £70/hr/robot for downtime exceeding resolution SLA — confirm if client has a negotiated rate'
  WHERE section_slug = 'fsm' AND field_key = 'sla_credit_rate';
UPDATE public.workflow_questions SET placeholder = 'e.g. Email sign-off, client portal, digital signature, verbal + email follow-up'
  WHERE section_slug = 'fsm' AND field_key = 'breakfix_approval_method';
UPDATE public.workflow_questions SET placeholder = 'Name / role who approves and target response time — default approval window aligns to Resolution SLA'
  WHERE section_slug = 'fsm' AND field_key = 'breakfix_approval_contact';
UPDATE public.workflow_questions SET placeholder = 'Does the client want access to view live WO status, service history, and open estimates via the client portal?'
  WHERE section_slug = 'fsm' AND field_key = 'client_portal_access';
UPDATE public.workflow_questions SET placeholder = 'e.g. Site Manager + Ops Director — PM completion reports go to Property Operator'
  WHERE section_slug = 'fsm' AND field_key = 'wo_report_delivery';
UPDATE public.workflow_questions SET placeholder = 'Confirm client opts in to post-WO service rating requests. Ratings ≤ 2 auto-alert hub manager.'
  WHERE section_slug = 'fsm' AND field_key = 'csat_optin';
UPDATE public.workflow_questions SET placeholder = 'Employee Damage / Guest Damage (client-chargeable) vs Third-Party Damage — who on client side verifies damage type?'
  WHERE section_slug = 'fsm' AND field_key = 'damage_classification';
UPDATE public.workflow_questions SET placeholder = 'Standard PM cycle is every 14 days per robot — confirm if client requires a different cadence or PM scope'
  WHERE section_slug = 'fsm' AND field_key = 'pm_schedule_recurrence';
UPDATE public.workflow_questions SET placeholder = 'e.g. Property Operator, Facilities Manager, H&S Officer'
  WHERE section_slug = 'fsm' AND field_key = 'pm_completion_recipient';
UPDATE public.workflow_questions SET placeholder = 'Who coordinates defective part handover for OEM collection? Parts not collected within 30 days are flagged to hub manager.'
  WHERE section_slug = 'fsm' AND field_key = 'defective_parts_handover';
UPDATE public.workflow_questions SET placeholder = 'Who on the client side is present for new robot commissioning WOs? Name, role, site'
  WHERE section_slug = 'fsm' AND field_key = 'commissioning_contact';

-- Insight
UPDATE public.workflow_questions SET placeholder = 'e.g. Coverage > 85%, Utilization > 4 hrs/day, ROI < $20/hr — set per site'
  WHERE section_slug = 'insight' AND field_key = 'kpi_targets';
UPDATE public.workflow_questions SET placeholder = 'e.g. Daily email + weekly PDF + monthly deep-dive'
  WHERE section_slug = 'insight' AND field_key = 'report_frequency';
UPDATE public.workflow_questions SET placeholder = 'e.g. Site Manager, Cleaning Supervisor, Area Director'
  WHERE section_slug = 'insight' AND field_key = 'report_recipients';
UPDATE public.workflow_questions SET placeholder = 'e.g. Email digest, in-app dashboard, exported PDF, BI data feed'
  WHERE section_slug = 'insight' AND field_key = 'report_format';
UPDATE public.workflow_questions SET placeholder = 'e.g. Power BI, Tableau — API or CSV feed?'
  WHERE section_slug = 'insight' AND field_key = 'bi_integration';
UPDATE public.workflow_questions SET placeholder = 'vs other sites? vs industry benchmark? vs previous period?'
  WHERE section_slug = 'insight' AND field_key = 'benchmarking';

-- Timezone
UPDATE public.workflow_questions SET placeholder = 'e.g. US/Eastern for East Coast offices'
  WHERE section_slug = 'timezone' AND field_key = 'additional_timezones';
UPDATE public.workflow_questions SET placeholder = 'e.g. Mon–Fri 06:00–22:00, Sat 07:00–18:00'
  WHERE section_slug = 'timezone' AND field_key = 'business_hours';
UPDATE public.workflow_questions SET placeholder = 'e.g. 07:00 local — shift handover summary'
  WHERE section_slug = 'timezone' AND field_key = 'daily_report_time';
UPDATE public.workflow_questions SET placeholder = 'e.g. Monday 07:30 — prior week performance'
  WHERE section_slug = 'timezone' AND field_key = 'weekly_report_schedule';
UPDATE public.workflow_questions SET placeholder = 'e.g. 1st of month, 08:00 — full monthly review pack'
  WHERE section_slug = 'timezone' AND field_key = 'monthly_report_schedule';

-- ── Verification (uncomment to check) ─────────────────────────────────────
-- SELECT section_slug, field_key, placeholder
-- FROM public.workflow_questions
-- WHERE placeholder IS NOT NULL
-- ORDER BY section_slug, field_key;
