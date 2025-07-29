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

        if (!citationsRes.ok || !breachesRes.ok) {
            throw new Error('Failed to fetch data files');
        }

        const citationsText = await citationsRes.text();
        const breachesText = await breachesRes.text();

        console.log("Raw citations.json:", citationsText);
        console.log("Raw breaches.json:", breachesText);

        citations = JSON.parse(citationsText);
        breaches = JSON.parse(breachesText);

        populateBreachDropdown();
        buildAliasMap();
        displayCitations(citations);
    } catch (err) {
        console.error("Error loading data:", err);
        document.getElementById('citation-container').innerHTML = '<p>Error loading citations or breaches.</p>';
    }
}

function populateBreachDropdown() {
    const dropdown = document.getElementById('breachDropdown');
    dropdown.innerHTML = '<option value="">â All Breaches â</option>';

    breaches.forEach(breach => {
        const option = document.createElement('option');
        option.value = breach.tag;
        option.textContent = breach.tag;
        dropdown.appendChild(option);
    });
}

function buildAliasMap() {
    aliasToCanonical = {};
    breaches.forEach(({ tag, aliases }) => {
        aliasToCanonical[normalize(tag)] = tag;
        aliases.forEach(alias => {
            aliasToCanonical[normalize(alias)] = tag;
        });
    });
}

function displayCitations(data) {
    const container = document.getElementById('citation-container');
    container.innerHTML = '';

    data.forEach(citation => {
        const card = document.createElement('div');
        card.className = 'citation-card';
        card.innerHTML = `
            <h3>${citation.case_name}</h3>
            <p><strong>Citation:</strong> ${citation.citation}</p>
            <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
            <p><strong>Summary:</strong> ${citation.summary}</p>
        `;
        container.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', loadData);
