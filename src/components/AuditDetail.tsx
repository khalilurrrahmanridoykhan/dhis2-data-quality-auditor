import { Button, ButtonStrip, Card, CircularLoader, NoticeBox } from '@dhis2/ui'
import type { ReactNode } from 'react'
import { useAuditReports } from '../context/AuditReportsContext'
import i18n from '../locales'
import type { AuditConfig } from '../types/audit'
import { FreshnessTag, QualityTag } from './StatusTag'

function humanize(value: string): string {
  return value.replace(/_/g, ' ').replace(/^./, (letter: string) => letter.toUpperCase())
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e0e0e0' }}>
      <span style={{ color: '#6e7a89' }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export function AuditDetail({
  audit,
  canManage,
  onEdit,
  onDelete,
}: {
  audit: AuditConfig
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const { reportsByAuditId, refresh } = useAuditReports()
  const state = reportsByAuditId[audit.id]

  if (!state || state.loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <CircularLoader />
      </div>
    )
  }

  if (state.error || !state.report) {
    return (
      <NoticeBox error title={i18n.t("Could not load this audit's data")}>
        {state.error ?? i18n.t('No response was returned by this DHIS2 instance.')}
      </NoticeBox>
    )
  }

  const { coverage, freshness, provenance, quality } = state.report

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: '0 0 4px' }}>{audit.name}</h2>
          <p style={{ margin: 0, color: '#6e7a89' }}>
            {audit.dataElementName} · {audit.dataSetName}
          </p>
        </div>
        <ButtonStrip>
          <Button small onClick={() => refresh(audit.id)}>
            {i18n.t('Refresh')}
          </Button>
          {canManage && (
            <>
              <Button small onClick={onEdit}>
                {i18n.t('Edit')}
              </Button>
              <Button small destructive onClick={onDelete}>
                {i18n.t('Delete')}
              </Button>
            </>
          )}
        </ButtonStrip>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <QualityTag status={quality.status} />
        <FreshnessTag status={freshness.status} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
        <Card>
          <div style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{i18n.t('Coverage')}</h3>
            <SummaryRow
              label={i18n.t('Date range')}
              value={coverage.startDate ? `${coverage.startDate} – ${coverage.endDate}` : i18n.t('No data')}
            />
            <SummaryRow label={i18n.t('Data values')} value={coverage.recordCount} />
            <SummaryRow label={i18n.t('Org units reporting')} value={coverage.locationCount} />
            <SummaryRow label={i18n.t('Distinct periods')} value={coverage.periodCount} />
          </div>
        </Card>

        <Card>
          <div style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{i18n.t('Freshness')}</h3>
            <SummaryRow label={i18n.t('Status')} value={humanize(freshness.status)} />
            <SummaryRow label={i18n.t('Latest period end')} value={freshness.latestPeriodEnd ?? i18n.t('Unknown')} />
            <SummaryRow
              label={i18n.t('Age')}
              value={freshness.ageDays === null ? i18n.t('Unknown') : i18n.t('{{days}} days', { days: freshness.ageDays })}
            />
            <SummaryRow
              label={i18n.t('Expected update cycle')}
              value={
                freshness.expectedUpdateDays === null
                  ? i18n.t('Not specified')
                  : i18n.t('Every {{days}} days', { days: freshness.expectedUpdateDays })
              }
            />
          </div>
        </Card>

        <Card>
          <div style={{ padding: 16 }}>
            <h3 style={{ marginTop: 0 }}>{i18n.t('Provenance')}</h3>
            <SummaryRow
              label={i18n.t('Source')}
              value={
                provenance.sourceUrl ? (
                  <a href={provenance.sourceUrl} target="_blank" rel="noreferrer">
                    {provenance.sourceName ?? provenance.sourceUrl}
                  </a>
                ) : (
                  provenance.sourceName ?? i18n.t('Not specified')
                )
              }
            />
            <SummaryRow label={i18n.t('License')} value={provenance.license ?? i18n.t('Not specified')} />
            <SummaryRow label={i18n.t('DOI')} value={provenance.doi ?? i18n.t('Not specified')} />
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>
            {i18n.t('Quality checks')}{' '}
            <span style={{ fontWeight: 400, color: '#6e7a89' }}>{i18n.t('({{count}} issues)', { count: quality.issueCount })}</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {quality.checks.map((check) => (
              <div key={check.code} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <QualityTag status={check.status} />
                <span>
                  <strong>{humanize(check.code)}</strong>{' '}
                  <span style={{ color: '#6e7a89', fontSize: 12 }}>({check.dimension})</span>
                  <br />
                  <span style={{ color: '#6e7a89' }}>{check.message}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {audit.description && <NoticeBox title={i18n.t('Notes')}>{audit.description}</NoticeBox>}

      <p style={{ fontSize: 12, color: '#a0a7ae', margin: 0 }}>
        {i18n.t('Values are summed across all category option combinations for this data element.')}
      </p>
    </div>
  )
}
