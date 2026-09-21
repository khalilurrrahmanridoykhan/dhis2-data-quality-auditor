/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    id: 'be421663-abaa-48a8-9b6b-8e3644ce2c1d',
    name: 'data-quality-auditor',
    title: 'Data Quality Auditor',
    description:
        'Save data quality audits for any dataset and get a live report on coverage, freshness, provenance, and RDQA-aligned quality checks. You choose the dataset, data element, and org units; nothing is bundled, so it works with any data your instance holds.',

    minDHIS2Version: '2.40',

    entryPoints: {
        app: './src/App.tsx',
    },

    dataStoreNamespace: 'dataQualityAuditor',

    direction: 'auto',
}

module.exports = config
