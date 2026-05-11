'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  getConfiguration,
  getAllConfigSections,
  getInheritableConfig,
  resolveTemplateForSession,
} from '@/lib/supabase/queries'
import {
  upsertStaffUserAction               as upsertStaffUser,
  createConfigurationAction           as createConfiguration,
  createPhaseConfigurationAction,
  upsertClientContactAction,
  advanceConfigPhaseAction,
  upsertConfigSectionAction           as upsertConfigSection,
  updateConfigurationLastEditedAction as updateConfigurationLastEdited,
  updateConfigurationStatusAction     as updateConfigurationStatus,
} from '@/app/actions/session'
import { PHASE_SECTIONS } from '@/lib/phases'
import type { ContactPanelResult } from '@/components/form/ClientContactPanel'
import type {
  Configuration,
  ConfigurationWithStaff,
  ConfigSection,
  ConfigPhase,
  SectionId,
  StaffIdentity,
  ConfigTarget,
} from '@/types'

interface UseSessionOptions {
  onAutoSave?:    () => void
  phaseSections?: Record<ConfigPhase, SectionId[]>
  templateId?:    string
  noNavigate?:    boolean
}

export function useSession({ onAutoSave, phaseSections: providedPhaseSections, templateId, noNavigate }: UseSessionOptions = {}) {
  const router      = useRouter()
  const searchParams = useSearchParams()

  const [configuration, setConfiguration]   = useState<ConfigurationWithStaff | null>(null)
  const [sections, setSections]             = useState<Record<string, ConfigSection>>({})
  const [loading, setLoading]               = useState(false)
  const [saving, setSaving]                 = useState(false)
  const [inheritableConfig, setInheritableConfig] = useState<Configuration | null>(null)

  // Derived identity — restored from DB on load
  const [identity, setIdentity] = useState<StaffIdentity | null>(null)

  // Auto-save refs
  const autoSaveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const pendingData    = useRef<Record<string, { data: Record<string, unknown>; isComplete: boolean }>>({})

  // Latest-value refs — break stale closures in debounce timers
  const configRef     = useRef(configuration)
  configRef.current   = configuration
  const onAutoSaveRef = useRef(onAutoSave)
  onAutoSaveRef.current = onAutoSave

  // Load config from URL on mount
  useEffect(() => {
    const configId = searchParams.get('config')
    if (configId) loadConfiguration(configId)
  }, [searchParams])

  async function loadConfiguration(configId: string) {
    setLoading(true)
    try {
      const c = await getConfiguration(configId)
      if (!c) return
      setConfiguration(c)

      // Restore identity from the joined staff_user record
      if (c.staff_user) {
        setIdentity({
          fullName: c.staff_user.full_name,
          email:    c.staff_user.email,
          role:     c.staff_user.role,
        })
      }

      const s = await getAllConfigSections(configId)
      const mapped = s.reduce((acc, sec) => {
        acc[sec.section_id] = sec
        return acc
      }, {} as Record<string, ConfigSection>)
      setSections(mapped)
    } finally {
      setLoading(false)
    }
  }

  // Start a new configuration
  async function startConfiguration(
    id:             StaffIdentity,
    target:         ConfigTarget,
    locationId?:    string,
    subLocationId?: string,
    contact?:       ContactPanelResult['contact'],
    phase?:         ConfigPhase,
  ) {
    setLoading(true)
    try {
      const staffUser = await upsertStaffUser(id)
      setIdentity(id)

      let scope: Configuration['scope'] = 'user'
      if (target === 'client' && locationId) {
        scope = subLocationId ? 'sub_location' : 'location'
      } else if (target === 'my_role') {
        scope = 'mbody_role'
      }

      let config: Configuration

      if (target === 'client' && contact && phase) {
        // 1. Upsert the client contact
        const clientContact = await upsertClientContactAction({
          fullName:            contact.fullName,
          email:               contact.email,
          phone:               contact.phone || undefined,
          roleLabel:           contact.roleLabel,
          roleLabelCustom:     contact.roleLabelCustom || undefined,
          locationId:          locationId!,
          subLocationId:       subLocationId,
          orchestratorUserId:  contact.orchestratorUserId || undefined,
        })

        // 2. Resolve the workflow template: explicit > location+role > location > null
        let resolvedTemplateId = templateId || undefined
        if (!resolvedTemplateId && locationId) {
          const resolved = await resolveTemplateForSession({
            locationId,
            contactRole: contact.roleLabel,
          })
          resolvedTemplateId = resolved ?? undefined
        }

        // 3. Create phase-linked configuration
        config = await createPhaseConfigurationAction({
          scope,
          staffUserId:        staffUser.id,
          clientContactId:    clientContact.id,
          phase,
          locationId,
          subLocationId,
          email:              id.email,
          workflowTemplateId: resolvedTemplateId,
        })
      } else {
        // Non-client targets (my_role, personal)
        const inheritable = await getInheritableConfig({
          locationId:    target === 'client' ? locationId : undefined,
          subLocationId: target === 'client' ? subLocationId : undefined,
          mbodyRole:     target === 'personal' ? id.role : undefined,
        })
        if (inheritable) setInheritableConfig(inheritable)

        config = await createConfiguration({
          scope,
          staffUserId:   staffUser.id,
          locationId:    target === 'client' ? locationId    : undefined,
          subLocationId: target === 'client' ? subLocationId : undefined,
          mbodyRole:     target === 'my_role' ? id.role      : undefined,
          email:         id.email,
        })
      }

      await loadConfiguration(config.id)
      if (!noNavigate) router.push(`/onboarding?config=${config.id}`)
    } finally {
      setLoading(false)
    }
  }

  // Advance or roll back the configuration's phase by one step
  async function advancePhase(newPhase: ConfigPhase) {
    if (!configuration) return
    setLoading(true)
    try {
      await advanceConfigPhaseAction(configuration.id, newPhase)
      await loadConfiguration(configuration.id)
    } finally {
      setLoading(false)
    }
  }

  // Resume an existing configuration
  async function resumeConfiguration(configId: string) {
    await loadConfiguration(configId)
    if (!noNavigate) router.push(`/onboarding?config=${configId}`)
  }

  // Apply inherited config sections as starting point
  async function applyInheritedConfig() {
    if (!configuration || !inheritableConfig) return
    const s = await getAllConfigSections(inheritableConfig.id)
    for (const sec of s) {
      await upsertConfigSection(
        configuration.id,
        sec.section_id as SectionId,
        sec.data,
        false,
        undefined
      )
    }
    await loadConfiguration(configuration.id)
    setInheritableConfig(null)
  }

  // Core persist — shared by manual and auto save
  const persistSection = useCallback(async (
    configId: string,
    sectionId: SectionId,
    data: Record<string, unknown>,
    isComplete: boolean,
    email: string
  ) => {
    await upsertConfigSection(configId, sectionId, data, isComplete, email)
    await updateConfigurationLastEdited(configId, email)
    setSections(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        configuration_id: configId,
        section_id:       sectionId,
        data,
        is_complete:      isComplete,
        saved_at:         new Date().toISOString(),
      } as ConfigSection,
    }))
  }, [])

  // Manual save
  const saveSection = useCallback(async (
    sectionId: SectionId,
    data: Record<string, unknown>,
    isComplete: boolean,
    email: string
  ) => {
    const config = configRef.current
    if (!config) return

    if (autoSaveTimers.current[sectionId]) {
      clearTimeout(autoSaveTimers.current[sectionId])
      delete autoSaveTimers.current[sectionId]
      delete pendingData.current[sectionId]
    }

    setSaving(true)
    try {
      await persistSection(config.id, sectionId, data, isComplete, email)
    } finally {
      setSaving(false)
    }
  }, [persistSection])

  // Auto-save with 3s debounce
  const queueAutoSave = useCallback((
    sectionId: SectionId,
    data: Record<string, unknown>,
    email: string,
    isComplete: boolean = false
  ) => {
    if (!configRef.current) return

    pendingData.current[sectionId] = { data, isComplete }

    if (autoSaveTimers.current[sectionId]) {
      clearTimeout(autoSaveTimers.current[sectionId])
    }

    autoSaveTimers.current[sectionId] = setTimeout(async () => {
      const pending = pendingData.current[sectionId]
      if (!pending) return
      delete pendingData.current[sectionId]
      delete autoSaveTimers.current[sectionId]

      const config = configRef.current
      if (!config) return

      try {
        await persistSection(config.id, sectionId, pending.data, pending.isComplete, email)
        onAutoSaveRef.current?.()
      } catch {
        // Silent fail
      }
    }, 3000)
  }, [persistSection])

  // Submit client portion
  async function submitClientConfig(email: string) {
    if (!configuration) return
    await updateConfigurationStatus(configuration.id, 'client_complete', email)
    setConfiguration(prev => prev ? { ...prev, status: 'client_complete' } : prev)
  }

  // MBody staff marks complete
  async function completeConfig(email: string) {
    if (!configuration) return
    await updateConfigurationStatus(configuration.id, 'mbody_complete', email)
    setConfiguration(prev => prev ? { ...prev, status: 'mbody_complete' } : prev)
  }

  // Cleanup timers on unmount
  useEffect(() => {
    return () => { Object.values(autoSaveTimers.current).forEach(clearTimeout) }
  }, [])

  // Phase-aware progress — denominator is sections in current phase, not all 10
  const activeSectionIds   = configuration ? (providedPhaseSections ?? PHASE_SECTIONS)[configuration.phase] : []
  const completedSections  = activeSectionIds.filter(id => sections[id]?.is_complete).length
  const progress           = activeSectionIds.length > 0
    ? Math.round((completedSections / activeSectionIds.length) * 100)
    : 0

  return {
    configuration,
    sections,
    loading,
    saving,
    identity,
    inheritableConfig,
    activeSectionIds,
    industry: configuration?.location?.industry ?? null,
    startConfiguration,
    resumeConfiguration,
    applyInheritedConfig,
    saveSection,
    queueAutoSave,
    submitClientConfig,
    completeConfig,
    advancePhase,
    completedSections,
    progress,
  }
}