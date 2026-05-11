'use client'

import { useState, useEffect } from 'react'
import FormField from '@/components/form/shared/FormField'
import CheckpointList from '@/components/form/shared/CheckpointList'
import SectionDivider from '@/components/form/shared/SectionDivider'

import type { ConfigPhase } from '@/types'
import { ArrowRight, Loader2 } from 'lucide-react'

interface IntegrationsSectionProps {
  data?: Record<string, unknown>
  onSave: (data: Record<string, unknown>, isComplete: boolean) => void
  onAutoSave?: (data: Record<string, unknown>) => void
  isSaving?: boolean
  isComplete?: boolean
  industry?: string | null
  phase?: ConfigPhase
}

type IntegrationStatus = 'not-required' | 'required' | 'in-scope'

const INTEGRATIONS = [
  {
    id: 'sso',
    badge: 'SSO / Identity',
    badgeColor: '#0057B8',
    badgeBg: 'rgba(0,129,255,0.10)',
    badgeBorder: 'rgba(0,129,255,0.25)',
    desc: 'Identity provider configuration for Orchestrator user authentication.',
    fields: [
      { id: 'idp',            label: 'Identity provider (IdP)',     placeholder: 'e.g. Azure Active Directory, Okta, Google Workspace, ADFS' },
      { id: 'protocol',       label: 'SSO protocol',                placeholder: 'e.g. SAML 2.0, OpenID Connect (OIDC), OAuth 2.0' },
      { id: 'tenant',         label: 'Tenant ID / domain',          placeholder: 'e.g. contoso.onmicrosoft.com' },
      { id: 'provisioning',   label: 'User provisioning method',    placeholder: 'e.g. Manual invite, SCIM auto-provisioning, JIT' },
      { id: 'role_mapping',   label: 'Group / role mapping',        placeholder: 'How do IdP groups map to Orchestrator roles?', textarea: true },
      { id: 'it_contact',     label: 'IT contact for SSO setup',    placeholder: 'Name, email, phone' },
    ],
    checkpoints: [
      { id: 'metadata_provided',    label: 'IdP metadata / federation XML provided to MBody AI' },
      { id: 'app_registered',       label: 'Orchestrator SAML / OIDC app registered in client IdP' },
      { id: 'role_mapping_tested',  label: 'Group-to-role mapping documented and tested' },
      { id: 'test_login',           label: 'Test user login confirmed end-to-end' },
      { id: 'scim_tested',          label: 'SCIM provisioning tested (if applicable)' },
      { id: 'mfa_confirmed',        label: 'MFA policy confirmed and compatible' },
    ],
  },
  {
    id: 'task',
    badge: 'Task management',
    badgeColor: '#7B1FA2',
    badgeBg: 'rgba(165,42,225,0.08)',
    badgeBorder: 'rgba(165,42,225,0.25)',
    desc: 'Integration with client task or work order management systems.',
    fields: [
      { id: 'platform',       label: 'Task / CAFM / CMMS platform', placeholder: 'e.g. ServiceNow, Planon, Maximo, Jira Service Management' },
      { id: 'method',         label: 'Integration method',           placeholder: 'e.g. REST API, webhook, email-to-ticket, CSV export' },
      { id: 'endpoint',       label: 'API endpoint / base URL',      placeholder: 'e.g. https://client.service-now.com/api/...' },
      { id: 'auth',           label: 'Authentication method',        placeholder: 'e.g. API key, OAuth 2.0 client credentials' },
      { id: 'events',         label: 'Which robot events create tasks?', placeholder: 'e.g. Maintenance alert → work order; stuck robot → incident ticket', textarea: true },
      { id: 'priority_map',   label: 'Task priority mapping',        placeholder: 'e.g. Orchestrator Critical → P1; High → P2', textarea: true },
      { id: 'routing',        label: 'Task assignee / queue routing', placeholder: "e.g. All robot tasks → 'Facilities Tech' queue at relevant site", textarea: true },
      { id: 'status_sync',    label: 'Completion status sync back?', placeholder: 'e.g. Yes — closed tasks update robot maintenance log' },
    ],
    checkpoints: [
      { id: 'credentials',      label: 'Task platform API credentials / webhook URL provided' },
      { id: 'mapping_agreed',   label: 'Event-to-task mapping documented and agreed' },
      { id: 'priority_tested',  label: 'Priority mapping tested end-to-end' },
      { id: 'routing_verified', label: 'Task routing to correct site queue verified' },
      { id: 'sync_tested',      label: 'Completion status sync tested (if bidirectional)' },
    ],
  },
  {
    id: 'facilities',
    badge: 'Facilities Management',
    badgeColor: '#1B6B45',
    badgeBg: 'rgba(27,138,90,0.10)',
    badgeBorder: 'rgba(27,138,90,0.25)',
    desc: 'Integration with elevators and access control areas.',
    fields: [
      { id: 'elevator_vendor',  label: 'Elevator system / vendor',           placeholder: 'e.g. KONE, Otis, Schindler — model and integration capability' },
      { id: 'access_control',   label: 'Access control / door system',       placeholder: 'e.g. Genetec, Lenel, HID, Brivo' },
      { id: 'method',           label: 'Integration method',                 placeholder: 'e.g. REST API, BACnet, vendor SDK, cloud webhook' },
      { id: 'auth',             label: 'Authentication method',              placeholder: 'e.g. API key, OAuth 2.0, certificate-based' },
      { id: 'elevator_zones',   label: 'Floors / zones requiring elevator',  placeholder: 'List sites and floors where robots need elevator integration', textarea: true },
      { id: 'door_zones',       label: 'Doors / restricted areas',           placeholder: 'List doors, gates, or zones robots need to traverse', textarea: true },
      { id: 'failover',         label: 'Failover behaviour',                 placeholder: 'e.g. If elevator API fails, robot waits at landing and alerts site manager' },
      { id: 'facilities_contact', label: 'Facilities / building services contact', placeholder: 'Name, email, phone — owns the elevator / access system' },
    ],
    checkpoints: [
      { id: 'elevator_confirmed',   label: 'Elevator vendor and integration capability confirmed' },
      { id: 'access_confirmed',     label: 'Access control system and integration method confirmed' },
      { id: 'credentials_provided', label: 'API credentials / certificates provided' },
      { id: 'zones_mapped',         label: 'Floors and zones requiring integration mapped per site' },
      { id: 'test_verified',        label: 'Test ride / door-open sequence verified end-to-end' },
      { id: 'failover_tested',      label: 'Failover behaviour configured and tested' },
    ],
  },
  {
    id: 'other',
    badge: 'Other integrations',
    badgeColor: 'var(--text-muted)',
    badgeBg: 'var(--bg-elevated)',
    badgeBorder: 'rgba(146,140,227,0.2)',
    desc: 'Client-requested integrations not covered above.',
    fields: [
      { id: 'platforms',  label: 'Additional platform(s)',       placeholder: 'e.g. Power BI, Tableau, BACnet BMS, Genetec, Teams, Slack' },
      { id: 'purpose',    label: 'Integration purpose',          placeholder: 'What data flows where, and why?', textarea: true },
      { id: 'method',     label: 'Integration method',           placeholder: 'e.g. API, webhook, embedded dashboard, data feed' },
      { id: 'contacts',   label: 'Technical contact for each',   placeholder: 'Name, system, email', textarea: true },
    ],
    checkpoints: [
      { id: 'scoped',       label: 'Additional integrations scoped and prioritised' },
      { id: 'contacts_id',  label: 'Technical contacts identified per system' },
      { id: 'added_to_plan',label: 'Integration requirements added to project plan' },
    ],
  },
]

const OVERALL_CHECKPOINTS = [
  { id: 'all_identified',   label: 'All required integrations identified and scoped' },
  { id: 'owners_confirmed', label: 'Integration owners confirmed on client side' },
  { id: 'security_review',  label: 'Security / InfoSec review completed for each integration' },
  { id: 'dpa_signed',       label: 'Data sharing agreements / DPA addendums signed' },
  { id: 'staging_tested',   label: 'Full integration test completed in staging environment' },
  { id: 'golive_signoff',   label: 'Go-live sign-off obtained from client IT' },
]

export default function IntegrationsSection({ data = {}, onSave, onAutoSave, isSaving, phase }: IntegrationsSectionProps) {
  const isPost = phase === 'post'
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>(
    (data.statuses as Record<string, IntegrationStatus>) ?? {}
  )
  const [intFields, setIntFields] = useState<Record<string, Record<string, string>>>(
    (data.int_fields as Record<string, Record<string, string>>) ?? {}
  )
  const [intChecked, setIntChecked] = useState<Record<string, Record<string, boolean>>>(
    (data.int_checked as Record<string, Record<string, boolean>>) ?? {}
  )
  const [checked, setChecked] = useState<Record<string, boolean>>(
    (data.checkpoints as Record<string, boolean>) ?? {}
  )

  useEffect(() => {
    if (Object.keys(data).length === 0) return
    setStatuses((data.statuses as Record<string, IntegrationStatus>) ?? {})
    setIntFields((data.int_fields as Record<string, Record<string, string>>) ?? {})
    setIntChecked((data.int_checked as Record<string, Record<string, boolean>>) ?? {})
    setChecked((data.checkpoints as Record<string, boolean>) ?? {})
  }, [data])

  function setStatus(id: string, status: IntegrationStatus) {
    const updated = { ...statuses, [id]: status }
    setStatuses(updated)
    onAutoSave?.({ statuses: updated, int_fields: intFields, int_checked: intChecked, checkpoints: checked })
  }

  function setIntField(intId: string, fieldId: string, value: string) {
    const updated = { ...intFields, [intId]: { ...(intFields[intId] ?? {}), [fieldId]: value } }
    setIntFields(updated)
    onAutoSave?.({ statuses, int_fields: updated, int_checked: intChecked, checkpoints: checked })
  }

  function toggleIntCheck(intId: string, checkId: string, value: boolean) {
    const updated = { ...intChecked, [intId]: { ...(intChecked[intId] ?? {}), [checkId]: value } }
    setIntChecked(updated)
    onAutoSave?.({ statuses, int_fields: intFields, int_checked: updated, checkpoints: checked })
  }

  function handleSave(isComplete: boolean) {
    onSave({ statuses, int_fields: intFields, int_checked: intChecked, checkpoints: checked }, isComplete)
  }

  return (
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-body)', lineHeight: 1.65, marginBottom: '20px' }}>
        Document every third-party system Orchestrator needs to connect with — authentication,
        task management, facilities, and any other client-requested platforms.
      </p>

      {INTEGRATIONS.map(int => {
        const status = statuses[int.id] ?? 'not-required'
        const isActive = status !== 'not-required'

        return (
          <div
            key={int.id}
            style={{
              border: 'var(--border-subtle)',
              borderRadius: '8px',
              background: 'var(--bg-elevated)',
              marginBottom: '10px',
              overflow: 'hidden',
              transition: 'border-color 0.2s',
            }}
          >
            {/* Integration header */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '12px 14px',
              borderBottom: isActive ? 'var(--border-subtle)' : 'none',
              background: 'var(--bg-surface)',
            }}>
              <span style={{
                fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
                padding: '4px 10px', borderRadius: '20px',
                textTransform: 'uppercase', whiteSpace: 'nowrap',
                color: int.badgeColor,
                background: int.badgeBg,
                border: `1px solid ${int.badgeBorder}`,
              }}>
                {int.badge}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-body)', flex: 1 }}>
                {int.desc}
              </span>
            </div>

            {/* Status buttons */}
            <div style={{ padding: '12px 14px 4px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: 'var(--text-muted)', marginBottom: '8px',
              }}>
                Integration required?
              </label>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
                {([
                  { val: 'required' as IntegrationStatus,     label: 'Required',        activeStyle: { background: 'rgba(0,129,255,0.08)', borderColor: 'rgba(0,129,255,0.4)', color: 'var(--electric-blue)' } },
                  { val: 'in-scope' as IntegrationStatus,     label: 'In scope — TBC',  activeStyle: { background: 'rgba(245,124,0,0.08)', borderColor: 'rgba(245,124,0,0.35)', color: '#E65100' } },
                  { val: 'not-required' as IntegrationStatus, label: 'Not required',    activeStyle: { background: 'var(--bg-elevated)', borderColor: 'rgba(146,140,227,0.2)', color: 'var(--text-muted)' } },
                ]).map(btn => {
                  const isActive = status === btn.val
                  return (
                    <button
                      key={btn.val}
                      onClick={() => setStatus(int.id, btn.val)}
                      style={{
                        fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em',
                        padding: '5px 12px', borderRadius: '20px',
                        cursor: 'pointer', fontFamily: 'var(--font-family)',
                        transition: 'all 0.15s',
                        background: 'var(--bg-surface)',
                        border: `1.5px solid rgba(146,140,227,0.2)`,
                        color: 'var(--text-muted)',
                        ...(isActive ? btn.activeStyle : {}),
                      }}
                    >
                      {btn.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Integration body — gate-only in pre_deploy; full config in post */}
            {isActive && (
              <div style={{ padding: '0 14px 14px' }}>
                {isPost ? (
                  <>
                    {int.fields.map(f => (
                      f.textarea ? (
                        <FormField
                          key={f.id}
                          label={f.label}
                          type="textarea"
                          rows={2}
                          placeholder={f.placeholder}
                          value={intFields[int.id]?.[f.id] ?? ''}
                          onChange={v => setIntField(int.id, f.id, v)}
                        />
                      ) : (
                        <FormField
                          key={f.id}
                          label={f.label}
                          placeholder={f.placeholder}
                          value={intFields[int.id]?.[f.id] ?? ''}
                          onChange={v => setIntField(int.id, f.id, v)}
                        />
                      )
                    ))}

                    <CheckpointList
                      label="Integration checkpoints"
                      checkpoints={int.checkpoints}
                      checked={intChecked[int.id] ?? {}}
                      onChange={(id, value) => toggleIntCheck(int.id, id, value)}
                    />
                  </>
                ) : (
                  <div style={{
                    padding: '10px 2px 4px',
                  }}>
                    <p style={{
                      fontSize: '11px', color: 'var(--text-muted)', margin: 0,
                      padding: '8px 12px', borderRadius: '6px',
                      background: 'rgba(57,153,254,0.05)',
                      border: '1px solid rgba(57,153,254,0.18)',
                    }}>
                      <span style={{ fontWeight: 600, color: 'var(--electric-blue)' }}>Scoped for Post-Deploy: </span>
                      Full configuration details (credentials, endpoints, mappings) are collected
                      in the Post-Deployment phase. Marking this as Required ensures it is prioritised.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      <SectionDivider label="Overall sign-off" />

      <CheckpointList
        label="Overall integration sign-off"
        checkpoints={OVERALL_CHECKPOINTS}
        checked={checked}
        onChange={(id, value) => {
          const updated = { ...checked, [id]: value }
          setChecked(updated)
          onAutoSave?.({ statuses, int_fields: intFields, int_checked: intChecked, checkpoints: updated })
        }}
      />

      {/* Save actions */}
      <div className="flex flex-col">

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
          {isSaving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </>
          ) : (
            "Save draft"
          )}
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
    </div>
  )
}