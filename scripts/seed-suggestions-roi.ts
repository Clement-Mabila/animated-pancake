/**
 * seed-suggestions-roi.ts
 *
 * Run once to insert MBody default suggestions for the ROI section.
 * Safe to re-run — uses upsert on (section_id, field_key, value).
 *
 * Usage:
 *   npx tsx scripts/seed-suggestions-roi.ts
 *
 * Or call seedROISuggestions() from your admin panel / migration script.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,   // needs service role to bypass RLS
)

// ─── Suggestion definitions ──────────────────────────────────────────────────

const ROI_SUGGESTIONS = [

  // ── primary_roi_objective ────────────────────────────────────────────────
  {
    section_id: 'roi', field_key: 'primary_roi_objective', industry: null,
    value: 'Reduce manual cleaning labour cost by 30% within 18 months',
  },
  {
    section_id: 'roi', field_key: 'primary_roi_objective', industry: null,
    value: 'Replace 2–3 FTE cleaning roles through robot deployment across all floors',
  },
  {
    section_id: 'roi', field_key: 'primary_roi_objective', industry: null,
    value: 'Achieve 24/7 floor coverage without overnight shift premiums',
  },
  {
    section_id: 'roi', field_key: 'primary_roi_objective', industry: null,
    value: 'Increase hygiene audit pass rate from current baseline to 95%+',
  },
  {
    section_id: 'roi', field_key: 'primary_roi_objective', industry: null,
    value: 'Reduce slip-and-fall incidents by 40% through consistent floor maintenance',
  },
  // Industry-specific
  {
    section_id: 'roi', field_key: 'primary_roi_objective', industry: 'healthcare',
    value: 'Meet NHS infection control standards through consistent robot-led disinfection runs',
  },
  {
    section_id: 'roi', field_key: 'primary_roi_objective', industry: 'retail',
    value: 'Maintain customer-facing floor cleanliness during peak trading hours without staff redeployment',
  },
  {
    section_id: 'roi', field_key: 'primary_roi_objective', industry: 'logistics',
    value: 'Eliminate manual floor cleaning shifts from night warehouse operations',
  },

  // ── baseline_annual_cost ─────────────────────────────────────────────────
  {
    section_id: 'roi', field_key: 'baseline_annual_cost', industry: null,
    value: '120,000',
  },
  {
    section_id: 'roi', field_key: 'baseline_annual_cost', industry: null,
    value: '240,000',
  },
  {
    section_id: 'roi', field_key: 'baseline_annual_cost', industry: null,
    value: '360,000',
  },
  {
    section_id: 'roi', field_key: 'baseline_annual_cost', industry: null,
    value: '480,000',
  },
  {
    section_id: 'roi', field_key: 'baseline_annual_cost', industry: null,
    value: '750,000',
  },
  {
    section_id: 'roi', field_key: 'baseline_annual_cost', industry: null,
    value: '1,200,000',
  },

  // ── target_cost_reduction ────────────────────────────────────────────────
  {
    section_id: 'roi', field_key: 'target_cost_reduction', industry: null,
    value: '20%',
  },
  {
    section_id: 'roi', field_key: 'target_cost_reduction', industry: null,
    value: '25%',
  },
  {
    section_id: 'roi', field_key: 'target_cost_reduction', industry: null,
    value: '30%',
  },
  {
    section_id: 'roi', field_key: 'target_cost_reduction', industry: null,
    value: '35%',
  },
  {
    section_id: 'roi', field_key: 'target_cost_reduction', industry: null,
    value: '40%',
  },
  {
    section_id: 'roi', field_key: 'target_cost_reduction', industry: null,
    value: '50%',
  },

  // ── target_payback_period ────────────────────────────────────────────────
  {
    section_id: 'roi', field_key: 'target_payback_period', industry: null,
    value: '12 months',
  },
  {
    section_id: 'roi', field_key: 'target_payback_period', industry: null,
    value: '18 months',
  },
  {
    section_id: 'roi', field_key: 'target_payback_period', industry: null,
    value: '24 months',
  },
  {
    section_id: 'roi', field_key: 'target_payback_period', industry: null,
    value: '30 months',
  },
  {
    section_id: 'roi', field_key: 'target_payback_period', industry: null,
    value: '36 months',
  },

  // ── non_financial_roi_goals ──────────────────────────────────────────────
  {
    section_id: 'roi', field_key: 'non_financial_roi_goals', industry: null,
    value: 'Improved hygiene audit scores and regulatory compliance ratings',
  },
  {
    section_id: 'roi', field_key: 'non_financial_roi_goals', industry: null,
    value: 'Reduced staff injury and manual handling claims',
  },
  {
    section_id: 'roi', field_key: 'non_financial_roi_goals', industry: null,
    value: 'Consistent cleaning quality independent of staff availability or turnover',
  },
  {
    section_id: 'roi', field_key: 'non_financial_roi_goals', industry: null,
    value: 'ESG reporting improvement through reduced chemical and water usage',
  },
  {
    section_id: 'roi', field_key: 'non_financial_roi_goals', industry: null,
    value: 'Redeployment of cleaning staff to higher-value tasks',
  },
  {
    section_id: 'roi', field_key: 'non_financial_roi_goals', industry: null,
    value: 'Improved Net Promoter Score (NPS) driven by visible facility cleanliness',
  },
  {
    section_id: 'roi', field_key: 'non_financial_roi_goals', industry: 'healthcare',
    value: 'Reduction in hospital-acquired infection (HAI) rates tracked via clinical audits',
  },
  {
    section_id: 'roi', field_key: 'non_financial_roi_goals', industry: 'retail',
    value: 'Customer satisfaction uplift measured via post-visit survey scores',
  },

  // ── roi_measurement_method ───────────────────────────────────────────────
  {
    section_id: 'roi', field_key: 'roi_measurement_method', industry: null,
    value: 'Monthly labour hour comparison against pre-deployment baseline, reviewed in steering committee',
  },
  {
    section_id: 'roi', field_key: 'roi_measurement_method', industry: null,
    value: 'Orchestrator utilisation reports reviewed monthly; hygiene audit pass rate tracked quarterly',
  },
  {
    section_id: 'roi', field_key: 'roi_measurement_method', industry: null,
    value: 'KPI dashboard reviewed monthly with client facilities manager; annual third-party audit benchmark',
  },
  {
    section_id: 'roi', field_key: 'roi_measurement_method', industry: null,
    value: 'Quarterly cost-per-clean comparison (robot vs. manual) with payback calculation updated',
  },
  {
    section_id: 'roi', field_key: 'roi_measurement_method', industry: null,
    value: 'Weekly robot run completion rate; monthly cost savings report issued by MBody CSM',
  },
  {
    section_id: 'roi', field_key: 'roi_measurement_method', industry: 'healthcare',
    value: 'Infection control audit scores reviewed bi-monthly; robot run logs cross-referenced with ward inspection reports',
  },

  // ── target_sqft_per_robot_day ────────────────────────────────────────────
  {
    section_id: 'roi', field_key: 'target_sqft_per_robot_day', industry: null,
    value: '10,000 ft² / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_sqft_per_robot_day', industry: null,
    value: '15,000 ft² / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_sqft_per_robot_day', industry: null,
    value: '18,000 ft² / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_sqft_per_robot_day', industry: null,
    value: '22,000 ft² / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_sqft_per_robot_day', industry: null,
    value: '25,000 ft² / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_sqft_per_robot_day', industry: null,
    value: '30,000 ft² / robot / day',
  },

  // ── target_util_hours_per_day ────────────────────────────────────────────
  {
    section_id: 'roi', field_key: 'target_util_hours_per_day', industry: null,
    value: '4 hrs / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_util_hours_per_day', industry: null,
    value: '6 hrs / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_util_hours_per_day', industry: null,
    value: '6.5 hrs / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_util_hours_per_day', industry: null,
    value: '8 hrs / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_util_hours_per_day', industry: null,
    value: '10 hrs / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_util_hours_per_day', industry: null,
    value: '12 hrs / robot / day',
  },
  {
    section_id: 'roi', field_key: 'target_util_hours_per_day', industry: 'logistics',
    value: '16 hrs / robot / day (dual-shift warehouse)',
  },
  {
    section_id: 'roi', field_key: 'target_util_hours_per_day', industry: 'logistics',
    value: '20 hrs / robot / day (near-continuous operation)',
  },
]

// ─── Upsert runner ───────────────────────────────────────────────────────────

export async function seedROISuggestions() {
  const rows = ROI_SUGGESTIONS.map(s => ({
    ...s,
    is_mbody_default: true,
    usage_count:      0,
  }))

  // Batch in chunks of 50 to avoid request size limits
  const CHUNK = 50
  let inserted = 0
  let skipped  = 0

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { data, error } = await supabase
      .from('config_suggestions')
      .upsert(chunk, {
        onConflict:        'section_id,field_key,value',
        ignoreDuplicates:  true,    // don't overwrite usage_count on existing rows
      })
      .select('id')

    if (error) {
      console.error(`Chunk ${i / CHUNK + 1} error:`, error.message)
    } else {
      inserted += data?.length ?? 0
      skipped  += chunk.length - (data?.length ?? 0)
    }
  }

  console.log(`✅  ROI suggestions seeded — ${inserted} inserted, ${skipped} already existed`)
}

// ─── CLI entry-point ─────────────────────────────────────────────────────────
// Run directly: npx tsx scripts/seed-suggestions-roi.ts

if (require.main === module) {
  seedROISuggestions()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1) })
}