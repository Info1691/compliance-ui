let citations = [];
let breaches = [];
let aliasToCanonical = {};

function normalize(text) {
    return text.toLowerCase().replace(/\s+/g, '');
}

async function loadData() {
    try {
        const [citationsRes, breachesRes] = await Promise.all([
            fetch('/compliance-ui/data/citations.json'),
            fetch('/compliance-ui/data/breaches/breaches.json')
        ]);

        citations = await citationsRes.json();
        breaches = await breachesRes.json();

        populateBreachDropdown();
        buildAliasMap();
        displayCitations(citations);
    } catch (err) {
        console.error("Error loading data:", err);
        document.getElementById('citation-container').innerHTML = '<p>Error loading citations or breaches.</p>';
    }
}

function populateBreachDropdown() {
    const dropdown = document.getElementById('breach-filter');
    dropdown.innerHTML = '<option value="">-- All Breaches --</option>';

    breaches.forEach(breach => {
        const option = document.createElement('option');
        option.value = breach.tag;
        option.textContent = breach.tag;
        dropdown.appendChild(option);
    });
}

function buildAliasMap() {
    breaches.forEach(breach => {
        const canonical = breach.tag;
        aliasToCanonical[normalize(canonical)] = canonical;
        if (breach.aliases) {
            breach.aliases.forEach(alias => {
                aliasToCanonical[normalize(alias)] = canonical;
            });
        }
    });
}

function displayCitations(citationsToDisplay) {
    const container = document.getElementById('citation-container');
    container.innerHTML = '';

    if (citationsToDisplay.length === 0) {
        container.innerHTML = '<p>No citations found.</p>';
        return;
    }

    citationsToDisplay.forEach(citation => {
        const card = document.createElement('div');
        card.className = 'citation-card';
        card.innerHTML = `
            <h3>${citation.case_name}</h3>
            <p><strong>Citation:</strong> ${citation.citation}</p>
            <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
            <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
            <p><strong>Summary:</strong> ${citation.summary}</p>
            <button onclick="printCitation(${JSON.stringify(citation).replace(/"/g, '&quot;')})">Print</button>
        `;
        container.appendChild(card);
    });
}

function filterCitations() {
    const breachFilter = document.getElementById('breach-filter').value;
    const keyword = normalize(document.getElementById('keyword-search').value);

    const filtered = citations.filter(citation => {
        const matchesBreach = !breachFilter || citation.compliance_flags.includes(breachFilter);
        const matchesKeyword = !keyword || Object.values(citation).some(value =>
            typeof value === 'string' && normalize(value).includes(keyword)
        );
        return matchesBreach && matchesKeyword;
    });

    displayCitations(filtered);
}

function printCitation(citation) {
    const newWindow = window.open('', '_blank');
    newWindow.document.write(`
        <html>
        <head><title>Print Citation</title></head>
        <body>
            <h3>${citation.case_name}</h3>
            <p><strong>Citation:</strong> ${citation.citation}</p>
            <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
            <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
            <p><strong>Summary:</strong> ${citation.summary}</p>
            <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
            <p><strong>Holding:</strong> ${citation.holding}</p>
        </body>
        </html>
    `);
    newWindow.document.close();
    newWindow.print();
}

// Event listeners
window.onload = loadData;
document.getElementById('breach-filter').addEventListener('change', filterCitations);
document.getElementById('keyword-search').addEventListener('input', filterCitations);
