'use client'

import { useState, useEffect } from 'react'
import FormField from '@/components/form/shared/FormField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'

import type { ConfigPhase } from '@/types'
import { ArrowRight, Loader2 } from 'lucide-react'

interface RolesSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  industry?: string | null
  phase?: ConfigPhase
}

const CHECKPOINTS = [
  { id: 'fleet_admin_provisioned',  label: 'Fleet-wide admin users provisioned' },
  { id: 'site_users_provisioned',   label: 'Site-level users provisioned with correct data scope' },
  { id: 'dashboards_tested',        label: 'Role-based dashboard views tested per access tier' },
  { id: 'client_admin_trained',     label: 'Client admin user(s) trained on Orchestrator' },
  { id: 'sso_configured',           label: 'SSO / authentication method configured and tested' },
  { id: 'sharing_confirmed',        label: 'Report sharing permissions confirmed' },
]

const LOGIN_METHODS = [
  { value: 'sso_azure',   label: 'SSO via Azure AD' },
  { value: 'sso_google',  label: 'SSO via Google Workspace' },
  { value: 'sso_okta',    label: 'SSO via Okta' },
  { value: 'email',       label: 'Individual email login' },
  { value: 'other',       label: 'Other' },
]

export default function RolesSection({ data = {}, onSave, onAutoSave, isSaving, industry, phase }: RolesSectionProps) {
  const isPost = phase === 'post'
  const [fields, setFields] = useState({
    fleet_wide_recipients:    (data.fleet_wide_recipients    as string) ?? '',
    site_specific_recipients: (data.site_specific_recipients as string) ?? '',
    schedule_amendment_access:(data.schedule_amendment_access as string) ?? '',
    login_method:             (data.login_method             as string) ?? '',
  })
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setFields({
      fleet_wide_recipients:     (data.fleet_wide_recipients     as string) ?? '',
      site_specific_recipients:  (data.site_specific_recipients  as string) ?? '',
      schedule_amendment_access: (data.schedule_amendment_access as string) ?? '',
      login_method:              (data.login_method              as string) ?? '',
    })
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  function setField(key: string, value: string) {
    const updated = { ...fields, [key]: value }
    setFields(updated)
    onAutoSave?.({ ...updated, checkpoints: checked })
  }

  function handleSave(isComplete: boolean) {
    onSave({ ...fields, checkpoints: checked }, isComplete)
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Define who receives fleet-wide vs site-specific reports and configure their access
        tier in Orchestrator.
      </p>

      <SectionDivider label="Report recipients" />

      <FormField
        label="Fleet-wide report recipients"
        type="textarea"
        rows={2}
        placeholder="Names / roles who see all-robot, all-site data"
        value={fields.fleet_wide_recipients}
        onChange={v => setField('fleet_wide_recipients', v)}
        sectionId="roles"
        fieldKey="fleet_wide_recipients"
        industry={industry}
      />

      <FormField
        label="Site-specific / sub-location report recipients"
        type="textarea"
        rows={2}
        placeholder="Roles that see only their own site or sub-location data"
        value={fields.site_specific_recipients}
        onChange={v => setField('site_specific_recipients', v)}
        sectionId="roles"
        fieldKey="site_specific_recipients"
        industry={industry}
      />

      <SectionDivider label="Access & permissions" />

      <FormField
        label="Who can amend robot schedules / settings?"
        type="textarea"
        rows={2}
        placeholder="e.g. Programme Manager (fleet-wide), Site Manager (own site only)"
        value={fields.schedule_amendment_access}
        onChange={v => setField('schedule_amendment_access', v)}
        sectionId="roles"
        fieldKey="schedule_amendment_access"
        industry={industry}
      />

      {/* Login method — Q2 only; SSO config happens in Post-Deploy alongside Integrations */}
      {isPost ? (
        <FormField
          label="Login method"
          type="select"
          options={LOGIN_METHODS}
          value={fields.login_method}
          onChange={v => setField('login_method', v)}
        />
      ) : (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
          background: 'rgba(57,153,254,0.05)', border: '1px solid rgba(57,153,254,0.18)',
        }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--electric-blue)' }}>Post-Deploy only: </span>
            Login method (SSO / email) is configured in the Post-Deployment phase together
            with the Integrations section — IdP credentials and group mapping are required first.
          </p>
        </div>
      )}

      <CheckpointList
        checkpoints={CHECKPOINTS}
        checked={checked}
        onChange={(id, value) => {
          const updated = { ...checked, [id]: value }
          setChecked(updated)
          onAutoSave?.({ ...fields, checkpoints: updated })
        }}
      />

        {/* Save draft */}
        <button
          onClick={() => handleSave(false)}
          disabled={isSaving}
          className={`
            w-full
            py-2.5
            rounded-2xl
            text-sm
            font-semibold
            tracking-wide
            uppercase
            border
            border-slate-500
            text-slate-300
            bg-transparent
            transition-all
            mb-2
            flex
            items-center
            justify-center
            gap-2
            ${isSaving ? "opacity-70 cursor-not-allowed" : "cursor-pointer hover:border-slate-400"}
          `}
        >
          {isSaving ? "Saving..." : "Save draft"}
        </button>

        {/* Save & mark complete */}
      <button
        onClick={() => handleSave(true)}
        disabled={isSaving}
        className={`
          w-full
          py-3
          rounded-2xl
          text-sm
          font-semibold
          flex
          items-center
          justify-center
          gap-2
          transition-all
          text-white
          shadow-md
          bg-violet-500
          hover:bg-violet-700
          ${isSaving ? "opacity-70 cursor-not-allowed" : "cursor-pointer"}
        `}
      >
        {isSaving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            Save & mark complete
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  )
}