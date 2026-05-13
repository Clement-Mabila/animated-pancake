'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const DOC_KEY_SAFE = z.string().min(1).max(64).regex(/^[a-z0-9_]+$/)

const MAX_BYTES = 35 * 1024 * 1024

const ALLOWED_EXT = new Set([
  'pdf', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'csv', 'txt', 'zip',
  'doc', 'docx', 'xls', 'xlsx', 'dwg', 'dxf',
])

function bucketName(): string {
  return process.env.SUPABASE_ONBOARDING_DOCS_BUCKET?.trim() || 'onboarding-documents'
}

function sanitizeBaseName(name: string): string {
  const base = (name.split(/[/\\]/).pop() ?? name).trim() || 'file'
  return base.replace(/[^\w.\-()+ ]/g, '_').slice(0, 180) || 'file'
}

export type OnboardingDocumentUploadMeta = {
  path: string
  name: string
  size: number
  content_type: string
  uploaded_at: string
}

export async function uploadOnboardingDocumentAction(
  formData: FormData,
): Promise<{ ok: true; meta: OnboardingDocumentUploadMeta } | { ok: false; error: string }> {
  const rawConfig = formData.get('configurationId')
  const rawKey = formData.get('docKey')
  const rawPrev = formData.get('previousStoragePath')
  const file = formData.get('file')
  if (typeof rawConfig !== 'string' || typeof rawKey !== 'string' || !(file instanceof File)) {
    return { ok: false, error: 'Missing file or parameters' }
  }
  const configParse = z.string().uuid().safeParse(rawConfig)
  const keyParse = DOC_KEY_SAFE.safeParse(rawKey)
  if (!configParse.success || !keyParse.success) {
    return { ok: false, error: 'Invalid configuration or document key' }
  }
  const configurationId = configParse.data
  const docKey = keyParse.data

  if (file.size <= 0) return { ok: false, error: 'Empty file' }
  if (file.size > MAX_BYTES) return { ok: false, error: `File too large (max ${Math.round(MAX_BYTES / 1024 / 1024)} MB)` }

  const ext = (file.name.split('.').pop() ?? '').toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    return { ok: false, error: `File type .${ext || '?'} not allowed` }
  }

  const admin = createAdminClient()
  const bucket = bucketName()

  if (typeof rawPrev === 'string' && rawPrev.length > 2) {
    const expectedPrefix = `${configurationId}/${docKey}/`
    if (rawPrev.startsWith(expectedPrefix)) {
      await admin.storage.from(bucket).remove([rawPrev]).catch(() => {})
    }
  }

  const safeName = sanitizeBaseName(file.name)
  const objectPath = `${configurationId}/${docKey}/${Date.now()}-${safeName}`

  const buf = Buffer.from(await file.arrayBuffer())

  const { error: upErr } = await admin.storage.from(bucket).upload(objectPath, buf, {
    contentType: file.type || 'application/octet-stream',
    upsert: false,
  })
  if (upErr) {
    return { ok: false, error: upErr.message || 'Upload failed — check Storage bucket exists' }
  }

  const meta: OnboardingDocumentUploadMeta = {
    path: objectPath,
    name: file.name,
    size: file.size,
    content_type: file.type || 'application/octet-stream',
    uploaded_at: new Date().toISOString(),
  }
  return { ok: true, meta }
}

export async function removeOnboardingDocumentAction(params: {
  configurationId: string
  storagePath: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const idParse = z.string().uuid().safeParse(params.configurationId)
  const pathParse = z.string().min(3).max(512).safeParse(params.storagePath)
  if (!idParse.success || !pathParse.success) return { ok: false, error: 'Invalid parameters' }
  const prefix = `${idParse.data}/`
  if (!pathParse.data.startsWith(prefix)) {
    return { ok: false, error: 'Invalid file path' }
  }

  const admin = createAdminClient()
  const bucket = bucketName()
  const { error } = await admin.storage.from(bucket).remove([pathParse.data])
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function getOnboardingDocumentSignedUrlAction(params: {
  configurationId: string
  storagePath: string
  expiresIn?: number
}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const idParse = z.string().uuid().safeParse(params.configurationId)
  const pathParse = z.string().min(3).max(512).safeParse(params.storagePath)
  if (!idParse.success || !pathParse.success) return { ok: false, error: 'Invalid parameters' }
  const prefix = `${idParse.data}/`
  if (!pathParse.data.startsWith(prefix)) {
    return { ok: false, error: 'Invalid file path' }
  }

  const admin = createAdminClient()
  const bucket = bucketName()
  const expiresIn = Math.min(Math.max(params.expiresIn ?? 120, 30), 3600)

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUrl(pathParse.data, expiresIn)

  if (error || !data?.signedUrl) {
    return { ok: false, error: error?.message ?? 'Could not create download link' }
  }
  return { ok: true, url: data.signedUrl }
}
