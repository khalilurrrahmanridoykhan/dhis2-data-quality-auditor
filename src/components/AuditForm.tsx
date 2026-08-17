import {
  Button,
  ButtonStrip,
  CheckboxField,
  CircularLoader,
  InputField,
  Modal,
  ModalActions,
  ModalContent,
  ModalTitle,
  MultiSelectField,
  MultiSelectOption,
  NoticeBox,
  OrganisationUnitTree,
  Radio,
  SimpleSingleSelectField,
} from '@dhis2/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDataSetDetail, isNumericValueType } from '../hooks/useDataSetDetail'
import { useDataSets } from '../hooks/useDataSets'
import { useOrgUnitRoots } from '../hooks/useOrgUnitRoots'
import i18n from '../locales'
import { AMR_PRESETS, type AuditPreset } from '../lib/presets'
import {
  SUPPORTED_PERIOD_TYPES,
  defaultLookbackDays,
  newAuditDefaults,
  type AuditConfig,
  type FreshnessMode,
  type PeriodType,
} from '../types/audit'

// This app's first-ever form UI -- OneHealth Data Trust uses zero @dhis2/ui
// form components today. The whole point of this form is the metadata-picker
// flow: dataset search -> one dataset-detail call feeds both the data-element
// and org-unit pickers (see useDataSetDetail), rather than three separate
// round trips.

function todayIso(): string {
  return new Date().toISOString()
}

interface Props {
  audit: AuditConfig | null // null = creating a new audit
  currentUsername: string
  onClose: () => void
  onSave: (audit: AuditConfig) => Promise<void>
}

export function AuditForm({ audit, currentUsername, onClose, onSave }: Props) {
  const isEditing = audit !== null

  const [name, setName] = useState(audit?.name ?? '')
  const [description, setDescription] = useState(audit?.description ?? '')

  const [datasetSearchTerm, setDatasetSearchTerm] = useState('')
  const [dataSetId, setDataSetId] = useState<string | null>(audit?.dataSetId ?? null)
  const [dataSetName, setDataSetName] = useState(audit?.dataSetName ?? '')

  const [dataElementId, setDataElementId] = useState<string | null>(audit?.dataElementId ?? null)
  const [dataElementName, setDataElementName] = useState(audit?.dataElementName ?? '')

  // OrganisationUnitTree selects by path ("id/id/id"), not a bare id array
  // -- orgUnitIds is derived from it, not stored directly, so every other
  // consumer below (validate(), selectedOrgUnits, the save payload) keeps
  // working unchanged against a plain string[] of ids.
  const [orgUnitPaths, setOrgUnitPaths] = useState<string[]>([])
  const orgUnitIds = useMemo(() => orgUnitPaths.map((p) => p.split('/').pop()!), [orgUnitPaths])
  const [orgUnitNamesById, setOrgUnitNamesById] = useState<Record<string, string>>(
    Object.fromEntries((audit?.orgUnits ?? []).map((ou) => [ou.id, ou.name])),
  )
  const seededOrgUnitPathsRef = useRef(false)
  const [requireAllOrgUnits, setRequireAllOrgUnits] = useState(
    audit ? audit.expectedOrgUnitIds.length === audit.orgUnits.length : true,
  )
  const [expectedOrgUnitIds, setExpectedOrgUnitIds] = useState<string[]>(audit?.expectedOrgUnitIds ?? [])

  const [freshnessMode, setFreshnessMode] = useState<FreshnessMode>(audit?.freshnessMode ?? 'operational')
  const [expectedUpdateDays, setExpectedUpdateDays] = useState(
    audit?.expectedUpdateDays !== null && audit?.expectedUpdateDays !== undefined ? String(audit.expectedUpdateDays) : '',
  )
  const [lookbackDays, setLookbackDays] = useState(
    String(audit?.lookbackDays ?? defaultLookbackDays(freshnessMode, audit?.periodType ?? null)),
  )
  const lookbackDaysTouchedRef = useRef(audit !== null)

  const [sourceName, setSourceName] = useState(audit?.sourceName ?? '')
  const [sourceUrl, setSourceUrl] = useState(audit?.sourceUrl ?? '')
  const [license, setLicense] = useState(audit?.license ?? '')
  const [doi, setDoi] = useState(audit?.doi ?? '')

  const defaults = newAuditDefaults()
  const [outlierDetectionEnabled, setOutlierDetectionEnabled] = useState(
    audit?.outlierDetectionEnabled ?? defaults.outlierDetectionEnabled,
  )
  const [trendChangeThresholdPercent, setTrendChangeThresholdPercent] = useState(
    audit?.trendChangeThresholdPercent !== null && audit?.trendChangeThresholdPercent !== undefined
      ? String(audit.trendChangeThresholdPercent)
      : '',
  )
  const [comparisonDataElementId, setComparisonDataElementId] = useState<string | null>(
    audit?.comparisonDataElementId ?? defaults.comparisonDataElementId,
  )
  const [comparisonDataElementName, setComparisonDataElementName] = useState(
    audit?.comparisonDataElementName ?? '',
  )
  const [comparisonLabel, setComparisonLabel] = useState(audit?.comparisonLabel ?? '')
  const [expectedRatioMin, setExpectedRatioMin] = useState(
    audit?.expectedRatioMin !== null && audit?.expectedRatioMin !== undefined ? String(audit.expectedRatioMin) : '',
  )
  const [expectedRatioMax, setExpectedRatioMax] = useState(
    audit?.expectedRatioMax !== null && audit?.expectedRatioMax !== undefined ? String(audit.expectedRatioMax) : '',
  )

  const [presetId, setPresetId] = useState<string | null>(null)

  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Presets only ever prefill non-identifying fields -- thresholds, freshness
  // cadence, source attribution, comparison label/range. They never touch
  // dataSetId/dataElementId/orgUnits/comparisonDataElementId: those UIDs are
  // instance-specific and always come from this instance's own metadata
  // picker below, regardless of which preset (if any) was applied first.
  function applyPreset(preset: AuditPreset) {
    setPresetId(preset.id)
    setDescription(preset.description)
    setFreshnessMode(preset.freshnessMode)
    setExpectedUpdateDays(String(preset.expectedUpdateDays))
    setSourceName(preset.sourceName)
    setSourceUrl(preset.sourceUrl ?? '')
    setOutlierDetectionEnabled(preset.outlierDetectionEnabled)
    setTrendChangeThresholdPercent(String(preset.trendChangeThresholdPercent))
    setComparisonLabel(preset.comparisonLabel ?? '')
    setExpectedRatioMin(preset.expectedRatioMin !== null ? String(preset.expectedRatioMin) : '')
    setExpectedRatioMax(preset.expectedRatioMax !== null ? String(preset.expectedRatioMax) : '')
  }

  const { dataSets, loading: dataSetsLoading } = useDataSets(datasetSearchTerm)
  const { detail, loading: detailLoading } = useDataSetDetail(dataSetId)
  const { roots: orgUnitRoots, loading: orgUnitRootsLoading } = useOrgUnitRoots()

  const periodType = (detail?.periodType ?? audit?.periodType ?? null) as PeriodType | null

  // Reset picks that depend on the dataset whenever it changes.
  useEffect(() => {
    if (!isEditing) {
      setDataElementId(null)
      setDataElementName('')
      setOrgUnitPaths([])
      setExpectedOrgUnitIds([])
      setComparisonDataElementId(null)
      setComparisonDataElementName('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataSetId])

  // Pre-seed the tree's selected paths once, when editing an existing audit
  // and the dataset detail (which now carries `path`) has loaded. Guarded to
  // run only once per form mount so it never stomps the user's own
  // subsequent selection changes. An org unit no longer assigned to the
  // dataset since this audit was last saved simply won't resolve a path --
  // matches the old flat picker's existing behavior of only ever offering
  // currently-assigned org units.
  useEffect(() => {
    if (!isEditing || !audit || !detail || seededOrgUnitPathsRef.current) return
    const savedIds = new Set(audit.orgUnits.map((ou) => ou.id))
    const paths = detail.organisationUnits.filter((ou) => savedIds.has(ou.id)).map((ou) => ou.path)
    setOrgUnitPaths(paths)
    seededOrgUnitPathsRef.current = true
  }, [isEditing, audit, detail])

  // Keep the lookback window's default in sync with freshness mode and the
  // selected dataset's period cadence, but only until the user edits it
  // themselves -- same "default, then independently overridable" pattern
  // this form already uses for expectedUpdateDays/trendChangeThresholdPercent.
  useEffect(() => {
    if (!lookbackDaysTouchedRef.current) setLookbackDays(String(defaultLookbackDays(freshnessMode, periodType)))
  }, [freshnessMode, periodType])

  const numericDataElements = useMemo(
    () => (detail?.dataElements ?? []).filter((de) => isNumericValueType(de.valueType)),
    [detail],
  )

  const periodTypeSupported = periodType !== null && SUPPORTED_PERIOD_TYPES.includes(periodType)

  const orgUnitOptions = detail?.organisationUnits ?? audit?.orgUnits ?? []
  const selectedOrgUnits = orgUnitOptions.filter((ou) => orgUnitIds.includes(ou.id))

  function handleSelectOrgUnitPaths(paths: string[]) {
    setOrgUnitPaths(paths)
    const ids = paths.map((p) => p.split('/').pop()!)
    if (requireAllOrgUnits) setExpectedOrgUnitIds(ids)
    else setExpectedOrgUnitIds((prev) => prev.filter((id) => ids.includes(id)))
  }

  function handleToggleRequireAll(checked: boolean) {
    setRequireAllOrgUnits(checked)
    if (checked) setExpectedOrgUnitIds(orgUnitIds)
  }

  function validate(): string | null {
    if (!name.trim()) return i18n.t('Name is required.')
    if (!dataSetId) return i18n.t('Select a dataset.')
    if (!dataElementId) return i18n.t('Select a data element.')
    if (orgUnitIds.length === 0) return i18n.t('Select at least one org unit.')
    // The tree browses the whole instance hierarchy (it has no concept of
    // "only this dataset's org units"), so this is where that constraint is
    // actually enforced -- the same correctness property the old flat
    // picker had implicitly, by only ever listing assignable org units.
    if (detail) {
      const assignedIds = new Set(detail.organisationUnits.map((ou) => ou.id))
      const invalidIds = orgUnitIds.filter((id) => !assignedIds.has(id))
      if (invalidIds.length > 0) {
        const invalidLabel = invalidIds.map((id) => orgUnitNamesById[id] ?? id).join(', ')
        return i18n.t("These selected org units aren't assigned to this dataset -- {{invalidLabel}}. Deselect them in the tree above.", {
          invalidLabel,
        })
      }
    }
    if (!periodTypeSupported) {
      return i18n.t("This dataset's period type ({{periodType}}) is not supported yet. Supported types -- {{supported}}.", {
        periodType: detail?.periodType ?? i18n.t('unknown'),
        supported: SUPPORTED_PERIOD_TYPES.join(', '),
      })
    }
    if (freshnessMode === 'operational' && expectedUpdateDays && Number.isNaN(Number(expectedUpdateDays))) {
      return i18n.t('Expected update cycle must be a number.')
    }
    if (!lookbackDays.trim() || Number.isNaN(Number(lookbackDays)) || Number(lookbackDays) <= 0) {
      return i18n.t('Lookback window must be a positive number of days.')
    }
    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) {
      setFormError(validationError)
      return
    }
    setFormError(null)
    setSaving(true)

    const next: AuditConfig = {
      id: audit?.id ?? crypto.randomUUID(),
      name: name.trim(),
      description: description.trim() || null,
      dataSetId: dataSetId!,
      dataSetName,
      periodType: periodType!,
      dataElementId: dataElementId!,
      dataElementName,
      orgUnits: selectedOrgUnits,
      expectedOrgUnitIds: requireAllOrgUnits ? orgUnitIds : expectedOrgUnitIds,
      freshnessMode,
      expectedUpdateDays: freshnessMode === 'operational' && expectedUpdateDays ? Number(expectedUpdateDays) : null,
      lookbackDays: Number(lookbackDays),
      sourceName: sourceName.trim() || null,
      sourceUrl: sourceUrl.trim() || null,
      license: license.trim() || null,
      doi: doi.trim() || null,
      outlierDetectionEnabled,
      trendChangeThresholdPercent: trendChangeThresholdPercent ? Number(trendChangeThresholdPercent) : null,
      comparisonDataElementId,
      comparisonDataElementName: comparisonDataElementId ? comparisonDataElementName : null,
      comparisonLabel: comparisonDataElementId ? comparisonLabel.trim() || null : null,
      expectedRatioMin: comparisonDataElementId && expectedRatioMin ? Number(expectedRatioMin) : null,
      expectedRatioMax: comparisonDataElementId && expectedRatioMax ? Number(expectedRatioMax) : null,
      createdAt: audit?.createdAt ?? todayIso(),
      updatedAt: todayIso(),
      createdBy: audit?.createdBy ?? currentUsername,
    }

    try {
      await onSave(next)
      onClose()
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error))
    } finally {
      setSaving(false)
    }
  }

  const comparisonOptions = numericDataElements.filter((de) => de.id !== dataElementId)

  return (
    <Modal onClose={onClose} large>
      <ModalTitle>{isEditing ? i18n.t('Edit audit') : i18n.t('Add audit')}</ModalTitle>
      <ModalContent>
        {formError && (
          <div style={{ marginBottom: 16 }}>
            <NoticeBox error title={i18n.t('Could not save this audit')}>
              {formError}
            </NoticeBox>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InputField
            label={i18n.t('Name')}
            required
            value={name}
            onChange={({ value }) => setName(value ?? '')}
            placeholder={i18n.t('e.g. Malaria confirmed cases, Northern region')}
          />

          {!isEditing && (
            <SimpleSingleSelectField
              name="preset"
              label={i18n.t('Start from a preset (optional)')}
              clearable
              clearText={i18n.t('None -- plain audit')}
              helpText={i18n.t(
                'Prefills freshness cadence, thresholds, and source attribution for a known surveillance domain. You still pick the actual dataset, data element, and org units for your instance below -- presets never assume a UID.',
              )}
              options={AMR_PRESETS.map((p) => ({ label: p.label, value: p.id }))}
              value={presetId ?? ''}
              onChange={(value) => {
                if (!value) {
                  setPresetId(null)
                  return
                }
                const chosen = AMR_PRESETS.find((p) => p.id === value)
                if (chosen) applyPreset(chosen)
              }}
            />
          )}

          <SimpleSingleSelectField
            name="dataset"
            label={i18n.t('Dataset')}
            required
            filterable
            filterPlaceholder={i18n.t('Search datasets by name...')}
            filterValue={datasetSearchTerm}
            onFilterChange={setDatasetSearchTerm}
            loading={dataSetsLoading}
            noMatchText={i18n.t('No datasets match this search.')}
            options={dataSets.map((ds) => ({ label: `${ds.name} (${ds.periodType})`, value: ds.id }))}
            value={dataSetId ?? ''}
            valueLabel={dataSetName || undefined}
            onChange={(value) => {
              const chosen = dataSets.find((ds) => ds.id === value)
              setDataSetId(value)
              setDataSetName(chosen?.name ?? dataSetName)
            }}
          />

          {dataSetId && (
            <>
              <SimpleSingleSelectField
                name="dataElement"
                label={i18n.t('Data element')}
                required
                loading={detailLoading}
                filterable
                filterPlaceholder={i18n.t('Filter data elements...')}
                noMatchText={i18n.t('No numeric data elements found in this dataset.')}
                empty={i18n.t('This dataset has no numeric data elements to audit.')}
                options={numericDataElements.map((de) => ({ label: de.name, value: de.id }))}
                value={dataElementId ?? ''}
                valueLabel={dataElementName || undefined}
                onChange={(value) => {
                  const chosen = numericDataElements.find((de) => de.id === value)
                  setDataElementId(value)
                  setDataElementName(chosen?.name ?? dataElementName)
                }}
              />

              {detail && (
                <div style={{ fontSize: 13, color: '#6e7a89' }}>
                  {i18n.t('Period type:')} <strong>{detail.periodType}</strong>
                  {!periodTypeSupported && (
                    <span style={{ color: '#c22a2a' }}>
                      {' '}
                      {i18n.t('-- not supported yet. Supported -- {{supported}}.', { supported: SUPPORTED_PERIOD_TYPES.join(', ') })}
                    </span>
                  )}
                </div>
              )}

              <div>
                <div style={{ marginBottom: 8, fontWeight: 500 }}>{i18n.t('Org units to query')} *</div>
                <div style={{ fontSize: 12, color: '#6e7a89', marginBottom: 8 }}>
                  {i18n.t(
                    "Browses the whole instance hierarchy -- selecting an org unit not assigned to this dataset will block saving below.",
                  )}
                </div>
                {orgUnitRootsLoading || detailLoading ? (
                  <CircularLoader small />
                ) : (
                  <div
                    style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid #dbe4ea', borderRadius: 4, padding: 8 }}
                  >
                    <OrganisationUnitTree
                      roots={orgUnitRoots}
                      selected={orgUnitPaths}
                      onChange={(payload) => {
                        setOrgUnitNamesById((prev) => ({ ...prev, [payload.id]: payload.displayName }))
                        handleSelectOrgUnitPaths(payload.selected)
                      }}
                    />
                  </div>
                )}
              </div>

              <CheckboxField
                label={i18n.t('Require all selected org units to report (recommended)')}
                checked={requireAllOrgUnits}
                onChange={({ checked }) => handleToggleRequireAll(checked)}
                helpText={i18n.t('Unchecked lets you narrow which org units are actually expected to have data -- feeds the coverage check.')}
              />

              {!requireAllOrgUnits && orgUnitIds.length > 0 && (
                <MultiSelectField
                  label={i18n.t('Org units actually expected to report')}
                  selected={expectedOrgUnitIds}
                  onChange={({ selected }) => setExpectedOrgUnitIds(selected)}
                >
                  {selectedOrgUnits.map((ou) => (
                    <MultiSelectOption key={ou.id} label={ou.name} value={ou.id} />
                  ))}
                </MultiSelectField>
              )}
            </>
          )}

          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>{i18n.t('Freshness')}</div>
            <div style={{ display: 'flex', gap: 24 }}>
              <Radio
                label={i18n.t('Operational (should update regularly)')}
                checked={freshnessMode === 'operational'}
                onChange={() => setFreshnessMode('operational')}
              />
              <Radio
                label={i18n.t('Historical (a fixed, closed dataset)')}
                checked={freshnessMode === 'historical'}
                onChange={() => setFreshnessMode('historical')}
              />
            </div>
          </div>

          {freshnessMode === 'operational' && (
            <InputField
              label={i18n.t('Expected update cycle (days)')}
              type="number"
              value={expectedUpdateDays}
              onChange={({ value }) => setExpectedUpdateDays(value ?? '')}
              helpText={i18n.t('How many days can pass before this audit is considered stale.')}
            />
          )}

          <InputField
            label={i18n.t('Lookback window (days)')}
            type="number"
            value={lookbackDays}
            onChange={({ value }) => {
              lookbackDaysTouchedRef.current = true
              setLookbackDays(value ?? '')
            }}
            helpText={i18n.t(
              'How far back audit queries look. Defaults from the freshness mode above -- shorten it for a large, high-frequency dataset, or lengthen it for a dataset with sparse historical reporting.',
            )}
          />

          <InputField label={i18n.t('Description / notes (optional)')} value={description} onChange={({ value }) => setDescription(value ?? '')} />
          <InputField label={i18n.t('Source name (optional)')} value={sourceName} onChange={({ value }) => setSourceName(value ?? '')} />
          <InputField label={i18n.t('Source URL (optional)')} value={sourceUrl} onChange={({ value }) => setSourceUrl(value ?? '')} />
          <InputField label={i18n.t('License (optional)')} value={license} onChange={({ value }) => setLicense(value ?? '')} />
          <InputField label={i18n.t('DOI (optional)')} value={doi} onChange={({ value }) => setDoi(value ?? '')} />

          <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: 16, marginTop: 8 }}>
            <h4 style={{ margin: '0 0 12px' }}>{i18n.t('Advanced (public-health-grade checks)')}</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <CheckboxField
                label={i18n.t('Enable outlier detection')}
                checked={outlierDetectionEnabled}
                onChange={({ checked }) => setOutlierDetectionEnabled(checked)}
                helpText={i18n.t("Uses this instance's native outlier-detection analysis where available, otherwise an interquartile-range check.")}
              />

              <InputField
                label={i18n.t('Flag period-over-period changes larger than (%)')}
                type="number"
                value={trendChangeThresholdPercent}
                onChange={({ value }) => setTrendChangeThresholdPercent(value ?? '')}
                helpText={i18n.t('Leave blank to disable trend/spike-drop detection.')}
              />

              {dataSetId && (
                <SimpleSingleSelectField
                  name="comparisonDataElement"
                  label={i18n.t('Compare against a second data element (optional)')}
                  clearable
                  clearText={i18n.t('None')}
                  loading={detailLoading}
                  filterable
                  filterPlaceholder={i18n.t('Filter data elements...')}
                  noMatchText={i18n.t('No other numeric data elements found.')}
                  options={comparisonOptions.map((de) => ({ label: de.name, value: de.id }))}
                  value={comparisonDataElementId ?? ''}
                  valueLabel={comparisonDataElementName || undefined}
                  onChange={(value) => {
                    if (!value) {
                      setComparisonDataElementId(null)
                      setComparisonDataElementName('')
                      return
                    }
                    const chosen = comparisonOptions.find((de) => de.id === value)
                    setComparisonDataElementId(value)
                    setComparisonDataElementName(chosen?.name ?? comparisonDataElementName)
                  }}
                />
              )}

              {comparisonDataElementId && (
                <>
                  <InputField
                    label={i18n.t('Ratio label')}
                    value={comparisonLabel}
                    onChange={({ value }) => setComparisonLabel(value ?? '')}
                    placeholder={i18n.t('e.g. positivity rate')}
                  />
                  <div style={{ display: 'flex', gap: 16 }}>
                    <InputField
                      label={i18n.t('Expected ratio minimum')}
                      type="number"
                      value={expectedRatioMin}
                      onChange={({ value }) => setExpectedRatioMin(value ?? '')}
                    />
                    <InputField
                      label={i18n.t('Expected ratio maximum')}
                      type="number"
                      value={expectedRatioMax}
                      onChange={({ value }) => setExpectedRatioMax(value ?? '')}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </ModalContent>
      <ModalActions>
        <ButtonStrip end>
          <Button onClick={onClose} disabled={saving}>
            {i18n.t('Cancel')}
          </Button>
          <Button primary onClick={handleSave} loading={saving}>
            {isEditing ? i18n.t('Save changes') : i18n.t('Add audit')}
          </Button>
        </ButtonStrip>
      </ModalActions>
    </Modal>
  )
}
