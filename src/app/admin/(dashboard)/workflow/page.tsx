import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminSession } from '@/lib/admin/requireAdminSession'
import WorkflowBuilder from '@/components/admin/workflow/WorkflowBuilder'

export const dynamic  = 'force-dynamic'
export const metadata = { title: 'Workflow Builder — Orion Admin' }

export default async function WorkflowPage() {
  await requireAdminSession()
  const db = createAdminClient()

  const [templatesRes, sectionsRes, questionsRes, tasksRes, deletedSectionsRes, deletedQuestionsRes] = await Promise.all([
    db.from('workflow_templates').select('*').order('created_at', { ascending: false }),
    db.from('workflow_sections').select('*').eq('is_deleted', false).order('sort_order'),
    db.from('workflow_questions').select('*').eq('is_deleted', false).order('sort_order'),
    db.from('workflow_deploy_tasks').select('*').order('sort_order'),
    db.from('workflow_sections').select('*').eq('is_deleted', true),
    db.from('workflow_questions').select('*').eq('is_deleted', true),
  ])

  return (
    <WorkflowBuilder
      templates={templatesRes.data ?? []}
      allSections={sectionsRes.data ?? []}
      allQuestions={questionsRes.data ?? []}
      allDeployTasks={tasksRes.data ?? []}
      allDeletedSections={deletedSectionsRes.data ?? []}
      allDeletedQuestions={deletedQuestionsRes.data ?? []}
    />
  )
}
