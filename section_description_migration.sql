-- Adds description column to workflow_sections and seeds copy for the 6 default sections.
-- Safe to run multiple times.

ALTER TABLE public.workflow_sections
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

UPDATE public.workflow_sections SET description = 'Establish the client''s baseline costs and target outcomes to calibrate Orchestrator reporting benchmarks across the robot deployment.'
WHERE slug = 'roi';

UPDATE public.workflow_sections SET description = 'Select the KPIs to display on fleet-wide and per-location dashboards, and set target thresholds for each. These will drive Orchestrator alerts and reporting benchmarks.'
WHERE slug = 'kpis';

UPDATE public.workflow_sections SET description = 'Define who receives fleet-wide vs site-specific reports and configure their access tier in Orchestrator.'
WHERE slug = 'roles';

UPDATE public.workflow_sections SET description = 'Configure how work orders are created, assessed, approved, and closed for robots at this client''s sites. These settings govern SLA behaviour, billing classification, approval workflows, and warranty alerting.'
WHERE slug = 'fsm';

UPDATE public.workflow_sections SET description = 'Select the report components and KPIs to include in each location insight report. Confirm targets, recipients, and cadence before go-live.'
WHERE slug = 'insight';

UPDATE public.workflow_sections SET description = 'Set regional time zones, business hours, and the automated report delivery schedule for every site.'
WHERE slug = 'timezone';
