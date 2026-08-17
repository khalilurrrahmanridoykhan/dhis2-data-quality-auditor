/** @type {import('@dhis2/cli-app-scripts').D2Config} */
const config = {
    type: 'app',
    id: 'be421663-abaa-48a8-9b6b-8e3644ce2c1d',
    name: 'data-quality-auditor',
    title: 'Data Quality Auditor',
    description:
        'A saved registry of quality audits with freshness and provenance tracking, plus a paired-indicator ratio check (e.g. tested vs. confirmed) -- the parts a core Data Quality app or the WHO Data Quality Tool spot-check don\'t keep around. Point it at coverage, freshness, plausibility, and RDQA-aligned checks for any dataset on this instance, no bundled programme list, no code changes.',

    minDHIS2Version: '2.40',

    entryPoints: {
        app: './src/App.tsx',
    },

    dataStoreNamespace: 'dataQualityAuditor',

    direction: 'auto',
}

module.exports = config
