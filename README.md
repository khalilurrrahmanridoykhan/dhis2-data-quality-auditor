# Data Quality Auditor

Save data quality audits for any dataset on your DHIS2 instance, and get a live report on coverage, freshness, provenance, and quality checks whenever you open one.

## What it does

You define an **audit** once: a dataset, one numeric data element, the org units to look at, and how often the data should be updated. The audit is saved on your instance. Each time you open it, the app queries your instance and reports:

| Report section | Shows |
|---|---|
| Coverage | Date range, number of data values, org units reporting, distinct periods |
| Freshness | Whether the latest period is current, stale, or historical, and its age in days |
| Provenance | The source, license, and DOI you entered for the data |
| Quality checks | The result of each check listed [below](#quality-checks), with the issues found |

Nothing is bundled. Every dataset, data element, and org unit comes from your own instance, so the app works with any dataset DHIS2 holds: health, WASH, education, or anything else.

## Requirements

- DHIS2 2.40 or later.
- To add, edit, or delete audits, a user needs the **ALL** authority or the **App Management** authority (`M_dhis-web-app-management`). Any user who can open the app can view reports.

## Install

Install from the DHIS2 App Hub, or build the app and upload it:

```bash
yarn install
yarn build        # writes build/bundle/*.zip
```

Then in DHIS2 go to **Apps → App Management → Install app → Upload a ZIP file**.

## Use it

**Create an audit**

1. Open the app and choose **Add audit**.
2. Optionally pick a [preset](#presets) to prefill the settings below.
3. Enter a name, then pick a **dataset**, a **data element** (numeric elements only), and the **org units** to query.
4. Set **freshness**:
   - *Operational*: the data should update regularly. Enter the expected update cycle in days; data older than that is marked stale.
   - *Historical*: a fixed, closed dataset that is never marked stale.
5. Adjust the **lookback window** (days of data to query) if the default does not suit the dataset.
6. Optionally record the **source name, source URL, license, and DOI**, plus notes.
7. Optionally enable the advanced checks (outlier detection, trend spike/drop, comparison ratio).
8. Save.

**Read a report**

Select an audit from the list. Use **Refresh** to run the queries again, **Edit** to change the audit, or **Delete** to remove it.

## Quality checks

The checks follow the RDQA (Routine Data Quality Assessment) dimensions used in public health data quality work. The report lists them under the names below.

| Check | Dimension | Flags |
|---|---|---|
| Records present | Completeness | No data values were returned |
| Declared location coverage | Completeness | An org unit expected to report has no value |
| Duplicate records | Reliability | More than one value for the same period and org unit |
| Nonnegative values | Validity | A negative value |
| Future periods | Integrity | A period ending after today |
| Instance validation rules | Reliability | Reports whether your instance has min/max bounds configured for the data element |
| Trend spike drop *(optional)* | Validity | A period-to-period change larger than the percentage you set |
| Outlier detection *(optional)* | Validity | A statistical outlier. Uses your instance's outlier analysis when available, otherwise an interquartile-range check |
| Paired indicator ratio *(optional)* | Consistency | A period where the ratio to a second data element falls outside the range you set (for example positives ÷ tests) |

The optional checks are off unless you set them in the audit's Advanced section.

## Presets

The **Add audit** form offers presets for antimicrobial resistance (AMR) surveillance, aligned with WHO GLASS:

- Priority pathogen resistance rate
- Antimicrobial consumption (AMC)
- Antibiotic stewardship / prescribing compliance

A preset fills in the freshness cadence, check thresholds, and source details. It never selects a dataset, data element, or org unit; you always choose those from your own instance. The thresholds are reasonable starting points, not validated limits, so adjust them to your data.

## Good to know

- **Category option combinations are summed.** For a disaggregated data element, the report uses the total across all category option combinations for each period and org unit, not a breakdown.
- **Outlier messages can differ from the total.** The instance's outlier analysis works per category option combination, so an outlier message may quote a value that differs from the summed total shown in the report.
- **Supported period types:** Daily, Weekly, Monthly, Quarterly, SixMonthly, Yearly. The form blocks a dataset with any other period type and says so.
- **Concurrent edits:** audits are saved as one record, so if two administrators edit at the same moment the last save wins.
- **Permissions:** the ALL / App Management requirement controls what the interface offers. DHIS2's data store has no per-namespace permissions, so it is not a security boundary.

## Data storage

Audits are stored in your instance's data store under the namespace `dataQualityAuditor`, key `audits`. The app makes no calls outside your DHIS2 instance.

## Development

```bash
yarn start        # dev server
yarn test         # unit tests
yarn build        # production bundle
```

Design decisions and the history of how the app reached its current behaviour are in [docs/DEVELOPMENT_NOTES.md](docs/DEVELOPMENT_NOTES.md).

## License

MIT. See [LICENSE](LICENSE).
