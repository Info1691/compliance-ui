fetch('citations.json')
  .then(response => response.json())
  .then(data => {
    const container = document.getElementById('citationsContainer');
    data.forEach((citation, index) => {
      const card = document.createElement('div');
      card.className = 'card';

      const form = document.createElement('form');
      form.innerHTML = `
        <label>Case Name: <input type="text" name="case_name" value="${citation.case_name}"/></label><br/>
        <label>Citation: <input type="text" name="citation" value="${citation.citation}"/></label><br/>
        <label>Year: <input type="text" name="year" value="${citation.year}"/></label><br/>
        <label>Court: <input type="text" name="court" value="${citation.court}"/></label><br/>
        <label>Jurisdiction: <input type="text" name="jurisdiction" value="${citation.jurisdiction}"/></label><br/>
        <label>Summary: <textarea name="summary">${citation.summary}</textarea></label><br/>
        <label>Legal Principle: <textarea name="legal_principle">${citation.legal_principle}</textarea></label><br/>
        <label>Holding: <textarea name="holding">${citation.holding}</textarea></label><br/>
        <label>Compliance Flags: <input type="text" name="compliance_flags" value="${citation.compliance_flags.join(", ")}"/></label><br/>
        <label>Key Points: <input type="text" name="key_points" value="${citation.key_points.join(", ")}"/></label><br/>
        <label>Tags: <input type="text" name="tags" value="${citation.tags.join(", ")}"/></label><br/>
        <label>Case Link: ${citation.case_link ? `<a href="${citation.case_link}" target="_blank">View Case</a>` : '—'}</label><br/>
        <label>Full Text:<br/><textarea name="full_case_text">${citation.full_case_text || ''}</textarea></label><br/>
      `;

      // Buttons
      const editButton = document.createElement('button');
      editButton.textContent = 'Save';
      editButton.onclick = e => {
        e.preventDefault();
        const formData = new FormData(form);
        data[index] = {
          ...citation,
          case_name: formData.get("case_name"),
          citation: formData.get("citation"),
          year: formData.get("year"),
          court: formData.get("court"),
          jurisdiction: formData.get("jurisdiction"),
          summary: formData.get("summary"),
          legal_principle: formData.get("legal_principle"),
          holding: formData.get("holding"),
          compliance_flags: formData.get("compliance_flags").split(",").map(s => s.trim()),
          key_points: formData.get("key_points").split(",").map(s => s.trim()),
          tags: formData.get("tags").split(",").map(s => s.trim()),
          full_case_text: formData.get("full_case_text"),
          case_link: citation.case_link
        };
        saveCitations(data);
      };

      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.onclick = e => {
        e.preventDefault();
        data.splice(index, 1);
        saveCitations(data);
      };

      card.appendChild(form);
      card.appendChild(editButton);
      card.appendChild(deleteButton);
      container.appendChild(card);
    });
  });

// Save to JSON via GitHub API (assumes GitHub Action or similar is configured)
function saveCitations(updatedData) {
  fetch('save-citations.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  })
  .then(() => location.reload())
  .catch(err => console.error('Save failed', err));
}
