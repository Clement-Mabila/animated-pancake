-- Copies all seeded individual questions from the original template (11111111-...)
-- into the current active non-draft template.
-- Safe to run multiple times — ON CONFLICT DO NOTHING skips existing rows.
-- Skips __all__ section-gate questions (already cloned) and kpi_test (already added manually).

INSERT INTO public.workflow_questions (
  template_id,
  section_slug,
  field_key,
  label,
  field_type,
  visible_in_phases,
  options,
  is_partial,
  instruction_pre_deploy,
  instruction_post_deploy,
  dummy_value,
  dummy_tooltip,
  active,
  sort_order
)
SELECT
  (
    SELECT id
    FROM public.workflow_templates
    WHERE is_active = true
      AND is_draft  = false
    ORDER BY created_at DESC
    LIMIT 1
  )                          AS template_id,
  section_slug,
  field_key,
  label,
  field_type,
  visible_in_phases,
  options,
  is_partial,
  instruction_pre_deploy,
  instruction_post_deploy,
  dummy_value,
  dummy_tooltip,
  active,
  sort_order
FROM public.workflow_questions
WHERE
  template_id = '11111111-1111-1111-1111-111111111111'
  AND field_key != '__all__'   -- skip section gates (already cloned)
ON CONFLICT (template_id, section_slug, field_key) DO NOTHING;
