/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    id: 'be421663-abaa-48a8-9b6b-8e3644ce2c1d',
    name: 'data-quality-auditor',
    title: 'Data Quality Auditor',
    description:
        'A saved registry of quality audits, with freshness and provenance auditing and a paired-indicator ratio check -- the parts a core Data Quality app or the WHO Data Quality Tool spot-check once and don\'t keep around. Pick a dataset, a data element, and the org units you care about, and get a live report covering coverage (how many values, org units, and periods are actually reporting), freshness (is this data current or going stale), provenance (source, license, and DOI), and RDQA-aligned quality checks (completeness, reliability, validity, integrity, consistency) -- the WHO/PEPFAR/MEASURE Evaluation framework used worldwide for health-system data quality. Optional advanced checks add statistical outlier detection, period-over-period spike/drop detection, and paired-indicator plausibility ratios. Nothing is bundled or pre-configured -- every audit is defined by you, at runtime, and stored in this instance\'s own data store, so the app works identically whether you\'re auditing a health dataset in Bangladesh, a WASH programme in Kenya, or an education dataset anywhere else DHIS2 runs.',

    minDHIS2Version: '2.40',

    entryPoints: {
        app: './src/App.tsx',
    },

    dataStoreNamespace: 'dataQualityAuditor',

    direction: 'auto',
}

module.exports = config
