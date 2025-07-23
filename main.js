let currentIndex = 0;
let citations = [];

function renderCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationsContainer');
  container.innerHTML = '';

  const card = document.createElement('div');
  card.className = 'card';

  card.innerHTML = `
    <h2>${citation.case_name}</h2>
    <p><strong>Citation:</strong> ${citation.citation}</p>
    <p><strong>Year:</strong> ${citation.year}</p>
    <p><strong>Court:</strong> ${citation.court}</p>
    <p><strong>Jurisdiction:</strong> ${citation.jurisdiction}</p>
    <p><strong>Summary:</strong> ${citation.summary}</p>
    <p><strong>Legal Principle:</strong> ${citation.legal_principle}</p>
    <p><strong>Holding:</strong> ${citation.holding}</p>
    <p><strong>Compliance Flags:</strong> ${citation.compliance_flags.join(', ')}</p>
    <p><strong>Key Points:</strong> ${citation.key_points.join(', ')}</p>
    <p><strong>Tags:</strong> ${citation.tags.join(', ')}</p>
    <p><strong>Case Link:</strong> ${citation.case_link ? `<a href="${citation.case_link}" target="_blank">View Case</a>` : '—'}</p>
    <p><strong>Full Case Text:</strong><br/><textarea readonly style="width:100%; height:200px;">${citation.full_case_text || ''}</textarea></p>
    <div class="button-group">
      <button onclick="prevCitation()">Previous</button>
      <button onclick="nextCitation()">Next</button>
      <button onclick="editCitation(${index})">Edit</button>
      <button onclick="deleteCitation(${index})">Delete</button>
      <button onclick="printCitation(${index})">Print</button>
      <button onclick="exportCitation(${index})">Export</button>
    </div>
  `;

  container.appendChild(card);
}

function prevCitation() {
  if (currentIndex > 0) {
    currentIndex--;
    renderCitation(currentIndex);
  }
}

function nextCitation() {
  if (currentIndex < citations.length - 1) {
    currentIndex++;
    renderCitation(currentIndex);
  }
}

function editCitation(index) {
  const citation = citations[index];
  const container = document.getElementById('citationsContainer');
  container.innerHTML = '';

  const form = document.createElement('form');
  form.innerHTML = `
    <label>Case Name:<input name="case_name" value="${citation.case_name}"/></label><br/>
    <label>Citation:<input name="citation" value="${citation.citation}"/></label><br/>
    <label>Year:<input name="year" value="${citation.year}"/></label><br/>
    <label>Court:<input name="court" value="${citation.court}"/></label><br/>
    <label>Jurisdiction:<input name="jurisdiction" value="${citation.jurisdiction}"/></label><br/>
    <label>Summary:<textarea name="summary">${citation.summary}</textarea></label><br/>
    <label>Legal Principle:<textarea name="legal_principle">${citation.legal_principle}</textarea></label><br/>
    <label>Holding:<textarea name="holding">${citation.holding}</textarea></label><br/>
    <label>Compliance Flags:<input name="compliance_flags" value="${citation.compliance_flags.join(', ')}"/></label><br/>
    <label>Key Points:<input name="key_points" value="${citation.key_points.join(', ')}"/></label><br/>
    <label>Tags:<input name="tags" value="${citation.tags.join(', ')}"/></label><br/>
    <label>Case Link:<input name="case_link" value="${citation.case_link || ''}"/></label><br/>
    <label>Full Case Text:<textarea name="full_case_text">${citation.full_case_text || ''}</textarea></label><br/>
    <button type="submit">Save</button>
  `;

  form.onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    citations[index] = {
      ...citation,
      case_name: formData.get('case_name'),
      citation: formData.get('citation'),
      year: formData.get('year'),
      court: formData.get('court'),
      jurisdiction: formData.get('jurisdiction'),
      summary: formData.get('summary'),
      legal_principle: formData.get('legal_principle'),
      holding: formData.get('holding'),
      compliance_flags: formData.get('compliance_flags').split(',').map(s => s.trim()),
      key_points: formData.get('key_points').split(',').map(s => s.trim()),
      tags: formData.get('tags').split(',').map(s => s.trim()),
      case_link: formData.get('case_link'),
      full_case_text: formData.get('full_case_text')
    };
    renderCitation(index);
  };

  container.appendChild(form);
}

function deleteCitation(index) {
  if (confirm("Are you sure you want to delete this citation?")) {
    citations.splice(index, 1);
    currentIndex = Math.max(0, currentIndex - 1);
    renderCitation(currentIndex);
  }
}

function printCitation(index) {
  const printContent = document.getElementById('citationsContainer').innerHTML;
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`<html><head><title>Print</title></head><body>${printContent}</body></html>`);
  printWindow.document.close();
  printWindow.print();
}

function exportCitation(index) {
  const citation = citations[index];
  const blob = new Blob([JSON.stringify(citation, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${citation.case_name.replace(/\s+/g, '_')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

fetch('citations.json')
  .then(response => response.json())
  .then(data => {
    citations = data;
    renderCitation(currentIndex);
  })
  .catch(err => console.error('Error loading citations.json', err));
