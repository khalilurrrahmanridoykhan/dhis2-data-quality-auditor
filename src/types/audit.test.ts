import { defaultLookbackDays, withLookbackDaysDefault, type AuditConfig } from './audit'

// Regression test for a real bug found live, not hypothetical: audits saved
// before lookbackDays existed have no such property in their stored JSON.
// computeStartDate(undefined) produced an Invalid Date whose .toISOString()
// call threw, uncaught, deep inside the per-audit report fetch -- leaving
// the whole app stuck on its loading spinner. See withLookbackDaysDefault's
// own comment in audit.ts for the full story.

function makeAudit(overrides: Partial<AuditConfig> = {}): AuditConfig {
  return {
    id: 'a1',
    name: 'Test',
    description: null,
    dataSetId: 'ds1',
    dataSetName: 'Test dataset',
    periodType: 'Monthly',
    dataElementId: 'de1',
    dataElementName: 'Test indicator',
    orgUnits: [],
    expectedOrgUnitIds: [],
    freshnessMode: 'operational',
    expectedUpdateDays: null,
    lookbackDays: 365,
    sourceName: null,
    sourceUrl: null,
    license: null,
    doi: null,
    outlierDetectionEnabled: false,
    trendChangeThresholdPercent: null,
    comparisonDataElementId: null,
    comparisonDataElementName: null,
    comparisonLabel: null,
    expectedRatioMin: null,
    expectedRatioMax: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    createdBy: 'admin',
    ...overrides,
  }
}

describe('withLookbackDaysDefault', () => {
  test('backfills a missing lookbackDays from a legacy saved record (the real bug case)', () => {
    // Simulates JSON loaded straight off the dataStore, saved before this
    // field existed -- deliberately cast through `any`, since real legacy
    // data on disk has no type-level guarantee either.
    const legacy = makeAudit({ freshnessMode: 'operational' }) as unknown as Record<string, unknown>
    delete legacy.lookbackDays
    const result = withLookbackDaysDefault(legacy as unknown as AuditConfig)
    expect(result.lookbackDays).toBe(defaultLookbackDays('operational'))
  })

  test('backfills using historical default when freshnessMode is historical', () => {
    const legacy = makeAudit({ freshnessMode: 'historical' }) as unknown as Record<string, unknown>
    delete legacy.lookbackDays
    const result = withLookbackDaysDefault(legacy as unknown as AuditConfig)
    expect(result.lookbackDays).toBe(defaultLookbackDays('historical'))
  })

  test('leaves an already-valid lookbackDays untouched', () => {
    const audit = makeAudit({ lookbackDays: 90 })
    expect(withLookbackDaysDefault(audit).lookbackDays).toBe(90)
  })

  test('replaces a NaN lookbackDays rather than propagating it', () => {
    const audit = makeAudit({ lookbackDays: Number('not a number') })
    expect(Number.isNaN(withLookbackDaysDefault(audit).lookbackDays)).toBe(false)
  })
})
