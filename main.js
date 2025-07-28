let citations = [];
let breaches = [];
let aliasToCanonical = {};

function normalize(text) {
    return text.toLowerCase().replace(/\s*/g, '');
}

async function loadData() {
    try {
        const [citationsRes, breachesRes] = await Promise.all([
            fetch('data/citations.json'),
            fetch('data/breaches/breaches.json')
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
    breaches.forEach(breach => {
        const option = document.createElement('option');
        option.value = breach.tag;
        option.textContent = breach.tag;
        dropdown.appendChild(option);
    });
}

function buildAliasMap() {
    aliasToCanonical = {};
    breaches.forEach(breach => {
        aliasToCanonical[normalize(breach.tag)] = breach.tag;
        breach.aliases.forEach(alias => {
            aliasToCanonical[normalize(alias)] = breach.tag;
        });
    });
}

function displayCitations(citationList) {
    const container = document.getElementById('citation-container');
    container.innerHTML = '';

    citationList.forEach(entry => {
        const card = document.createElement('div');
        card.className = 'citation-card';

        card.innerHTML = `
            <h2>${entry.case_name}</h2>
            <p><strong>Citation:</strong> ${entry.citation}</p>
            <p><strong>Year:</strong> ${entry.year}</p>
            <p><strong>Court:</strong> ${entry.court}</p>
            <p><strong>Jurisdiction:</strong> ${entry.jurisdiction}</p>
            <p><strong>Compliance Flags:</strong> ${entry.compliance_flags.join(', ')}</p>
            <p><strong>Summary:</strong> ${entry.summary}</p>
        `;

        container.appendChild(card);
    });
}

function filterCitations() {
    const selectedBreach = document.getElementById('breach-filter').value;
    const keyword = normalize(document.getElementById('keyword-filter').value);

    let filtered = citations;

    if (selectedBreach && selectedBreach !== '') {
        filtered = filtered.filter(entry =>
            entry.compliance_flags.some(flag =>
                normalize(flag) === normalize(selectedBreach)
            )
        );
    }

    if (keyword && keyword !== '') {
        filtered = filtered.filter(entry =>
            Object.values(entry).some(value =>
                typeof value === 'string' && normalize(value).includes(keyword)
            )
        );
    }

    displayCitations(filtered);
}

document.getElementById('breach-filter').addEventListener('change', filterCitations);
document.getElementById('keyword-filter').addEventListener('input', filterCitations);

// Load data when page loads
window.addEventListener('DOMContentLoaded', loadData);
