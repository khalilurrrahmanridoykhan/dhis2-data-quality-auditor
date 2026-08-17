// Runtime, admin-defined replacement for OneHealth Data Trust's static,
// hand-compiled config/programmes.ts. Every AuditConfig is created, edited,
// and persisted at runtime through this app's own UI -- nothing here is
// bundled or instance-specific. See lib/dataStore.ts for how the AuditConfig[]
// array is persisted.

export type FreshnessMode = 'operational' | 'historical'

// Deliberately a subset of DHIS2's full period-type list (excludes BiWeekly,
// WeeklyWednesday/Thursday/Saturday/Sunday, Financial* variants, and
// SixMonthlyApril -- see lib/period.ts). Datasets using an unsupported period
// type are blocked at picker time in AuditForm, not silently mis-parsed.
export type PeriodType = 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'SixMonthly' | 'Yearly'

export interface AuditOrgUnit {
  id: string
  name: string
}

export interface AuditConfig {
  id: string
  name: string
  description: string | null

  dataSetId: string
  dataSetName: string
  periodType: PeriodType

  dataElementId: string
  dataElementName: string

  orgUnits: AuditOrgUnit[]
  // Subset of orgUnits.id expected to always have a value -- feeds the
  // declared_location_coverage check. Defaults to "all selected org units".
  expectedOrgUnitIds: string[]

  freshnessMode: FreshnessMode
  expectedUpdateDays: number | null
  // How far back audit queries (dataValueSets, outlierDetection) look --
  // replaces a previously hardcoded, unbounded startDate=2000-01-01.
  // Not nullable: always has a concrete bound. Defaulted from freshnessMode
  // via defaultLookbackDays() below, independently editable per audit.
  lookbackDays: number

  sourceName: string | null
  sourceUrl: string | null
  license: string | null
  doi: string | null

  // v1.1 -- public-health-grade advanced checks. All optional/nullable: an
  // audit created before these existed, or one that never sets them, behaves
  // exactly like a plain v1 core audit (additive, not a breaking redesign).
  outlierDetectionEnabled: boolean
  trendChangeThresholdPercent: number | null

  comparisonDataElementId: string | null
  comparisonDataElementName: string | null
  comparisonLabel: string | null
  expectedRatioMin: number | null
  expectedRatioMax: number | null

  createdAt: string
  updatedAt: string
  createdBy: string
}

export const SUPPORTED_PERIOD_TYPES: PeriodType[] = ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'SixMonthly', 'Yearly']

export const NUMERIC_VALUE_TYPES = ['INTEGER', 'INTEGER_POSITIVE', 'INTEGER_ZERO_OR_POSITIVE', 'NUMBER'] as const

// Default lookback window, keyed off freshnessMode -- an operational
// (regularly-updating) dataset only needs a recent window; a historical
// (fixed, closed) dataset needs a much wider one. Still independently
// editable per audit (see AuditForm's "Lookback window" field).
export function defaultLookbackDays(mode: FreshnessMode): number {
  return mode === 'operational' ? 365 : 1825
}

// Real bug found live, not hypothetical: lookbackDays was added as a
// non-nullable field, but audits saved before this field existed have no
// such property in their stored JSON. Reading one straight off the
// dataStore left `lookbackDays` as `undefined` at runtime despite the type
// claiming `number` -- computeStartDate(undefined) then produced an
// Invalid Date, and calling .toISOString() on it threw a RangeError deep
// inside the per-audit report fetch, which never got caught by the caller,
// leaving the whole app stuck on its loading spinner forever. Fixed at the
// single point every audit is read from the dataStore (useAudits.ts),
// rather than defending every consumer -- every AuditConfig the rest of
// the app ever sees is guaranteed complete from here on.
export function withLookbackDaysDefault(audit: AuditConfig): AuditConfig {
  if (typeof audit.lookbackDays === 'number' && !Number.isNaN(audit.lookbackDays)) return audit
  return { ...audit, lookbackDays: defaultLookbackDays(audit.freshnessMode) }
}

export function newAuditDefaults(): Pick<
  AuditConfig,
  | 'outlierDetectionEnabled'
  | 'trendChangeThresholdPercent'
  | 'comparisonDataElementId'
  | 'comparisonDataElementName'
  | 'comparisonLabel'
  | 'expectedRatioMin'
  | 'expectedRatioMax'
> {
  return {
    outlierDetectionEnabled: false,
    trendChangeThresholdPercent: null,
    comparisonDataElementId: null,
    comparisonDataElementName: null,
    comparisonLabel: null,
    expectedRatioMin: null,
    expectedRatioMax: null,
  }
}
