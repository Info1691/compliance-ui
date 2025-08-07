document.addEventListener('DOMContentLoaded', function () {
    const citationsContainer = document.getElementById('citations-container');
    const drawer = document.getElementById('drawer');
    const openDrawerBtn = document.getElementById('openDrawerBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');

    // Restore citations on load
    fetch('citations.json')
        .then(response => response.json())
        .then(data => {
            const citations = Array.isArray(data) ? data : data.citations;
            if (!citations || citations.length === 0) {
                citationsContainer.innerHTML = '<p>No citations available.</p>';
                return;
            }

            citationsContainer.innerHTML = '';
            citations.forEach(citation => {
                const card = document.createElement('div');
                card.className = 'citation-card';
                card.innerHTML = `
                    <h3>${citation.case_name}</h3>
                    <p><strong>Citation:</strong> ${citation.citation}</p>
                    <p><strong>Year:</strong> ${citation.year}</p>
                    <p><strong>Court:</strong> ${citation.court}</p>
                    <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
                    <p><strong>Summary:</strong> ${citation.summary}</p>
                    <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
                    <p><strong>Holding:</strong> ${citation.holding}</p>
                    <p><strong>Observed Conduct:</strong> ${citation.observed_conduct}</p>
                    <p><strong>Anomaly Detected:</strong> ${citation.anomaly_detected}</p>
                    <p><strong>Breached Law/Rule:</strong> ${citation.breached_law_or_rule}</p>
                    <p><strong>Authority Basis:</strong> ${citation.authority_basis}</p>
                    <p><strong>Compliance Flags:</strong> ${citation.compliance_flags?.join(', ')}</p>
                    <p><strong>Canonical Breach Tag:</strong> ${citation.canonical_breach_tag}</p>
                `;
                citationsContainer.appendChild(card);
            });
        })
        .catch(error => {
            citationsContainer.innerHTML = '<p>Error loading citations.</p>';
            console.error('Error fetching citations.json:', error);
        });

    // Drawer panel toggle
    openDrawerBtn.addEventListener('click', () => {
        drawer.classList.add('open');
    });
    closeDrawerBtn.addEventListener('click', () => {
        drawer.classList.remove('open');
    });

    // STAGE 2 PREP: Hook in a 'raw case text' field that will auto-populate fields (placeholder only)
    const rawCaseInput = document.getElementById('rawCaseInput');
    if (rawCaseInput) {
        rawCaseInput.addEventListener('input', () => {
            const raw = rawCaseInput.value.trim();
            if (raw.length > 50) {
                console.log("Parsing logic placeholder â will convert raw text to fields.");
                // Future: Populate form fields based on structured parsing logic here
            }
        });
    }
});
