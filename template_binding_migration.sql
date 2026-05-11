ALTER TABLE workflow_templates
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_role contact_role_label,
  ADD COLUMN IF NOT EXISTS sub_location_group uuid[];
