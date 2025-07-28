document.addEventListener('DOMContentLoaded', function () {
    const citationsUrl = '../data/citations/citations.json';
    const breachesUrl = '../data/breaches/breaches.json';
    const citationContainer = document.getElementById('citationContainer');
    const breachFilter = document.getElementById('breachFilter');
    const keywordSearch = document.getElementById('keywordSearch');

    let citations = [];
    let breaches = [];
    let currentFilter = '';
    let currentKeyword = '';

    async function loadCitations() {
        const response = await fetch(citationsUrl);
        citations = await response.json();
        renderCitations();
    }

    async function loadBreaches() {
        const response = await fetch(breachesUrl);
        breaches = await response.json();
        populateBreachFilter();
    }

    function populateBreachFilter() {
        breachFilter.innerHTML = '<option value="">-- All Breaches --</option>';
        breaches.forEach(breach => {
            const option = document.createElement('option');
            option.value = breach.tag.toLowerCase();
            option.textContent = breach.tag;
            breachFilter.appendChild(option);
        });
    }

    function getAllBreachKeywords() {
        let keywords = {};
        breaches.forEach(breach => {
            const tag = breach.tag.toLowerCase();
            keywords[tag] = [tag, ...(breach.aliases || []).map(a => a.toLowerCase())];
        });
        return keywords;
    }

    function matchesFilter(citation, filter) {
        if (!filter) return true;
        const breachKeywords = getAllBreachKeywords();
        const filterTerms = breachKeywords[filter] || [filter];

        return citation.compliance_flags?.some(flag =>
            filterTerms.some(term => flag.toLowerCase().includes(term))
        );
    }

    function matchesKeyword(citation, keyword) {
        if (!keyword) return true;
        const lowerKeyword = keyword.toLowerCase();
        const allBreachTerms = Object.values(getAllBreachKeywords()).flat();

        const matchBreachAlias = allBreachTerms.some(alias => alias.includes(lowerKeyword));

        return (
            citation.case_name?.toLowerCase().includes(lowerKeyword) ||
            citation.summary?.toLowerCase().includes(lowerKeyword) ||
            citation.holding?.toLowerCase().includes(lowerKeyword) ||
            citation.compliance_flags?.some(flag => flag.toLowerCase().includes(lowerKeyword)) ||
            matchBreachAlias
        );
    }

    function renderCitations() {
        citationContainer.innerHTML = '';
        citations.forEach(citation => {
            if (matchesFilter(citation, currentFilter) && matchesKeyword(citation, currentKeyword)) {
                const card = document.createElement('div');
                card.className = 'citation-card';
                card.innerHTML = `
                    <p><strong>Case Name:</strong> ${citation.case_name}</p>
                    <p><strong>Citation:</strong> ${citation.citation}</p>
                    <p><strong>Year:</strong> ${citation.year}</p>
                    <p><strong>Court:</strong> ${citation.court}</p>
                    <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
                    <p><strong>Summary:</strong> ${citation.summary}</p>
                    <p><strong>Compliance Flags:</strong> ${citation.compliance_flags?.join(', ')}</p>
                    <button onclick="window.print()">Print</button>
                    <button onclick="exportCitation(${JSON.stringify(citation).replace(/"/g, '&quot;')})">Export as .txt</button>
                `;
                citationContainer.appendChild(card);
            }
        });
    }

    window.exportCitation = function (citation) {
        const text = `
Case Name: ${citation.case_name}
Citation: ${citation.citation}
Year: ${citation.year}
Court: ${citation.court}
Jurisdiction: ${citation.jurisdiction}
Summary: ${citation.summary}
Compliance Flags: ${citation.compliance_flags?.join(', ')}
`;
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${citation.case_name.replace(/\s+/g, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    breachFilter.addEventListener('change', (e) => {
        currentFilter = e.target.value;
        renderCitations();
    });

    keywordSearch.addEventListener('input', (e) => {
        currentKeyword = e.target.value.trim();
        renderCitations();
    });

    loadBreaches();
    loadCitations();
});
