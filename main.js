fetch('citations.json')
  .then(response => response.json())
  .then(data => {
    const container = document.getElementById('citationsContainer');
    container.innerHTML = ''; // clear before loading

    data.forEach((citation, index) => {
      const card = document.createElement('div');
      card.className = 'card';

      const form = document.createElement('form');
      form.innerHTML = `
        <label>Case Name:<br/><input type="text" name="case_name" value="${citation.case_name}"/></label><br/>
        <label>Citation:<br/><input type="text" name="citation" value="${citation.citation}"/></label><br/>
        <label>Year:<br/><input type="text" name="year" value="${citation.year}"/></label><br/>
        <label>Court:<br/><input type="text" name="court" value="${citation.court}"/></label><br/>
        <label>Jurisdiction:<br/><input type="text" name="jurisdiction" value="${citation.jurisdiction}"/></label><br/>
        <label>Summary:<br/><textarea name="summary">${citation.summary}</textarea></label><br/>
        <label>Legal Principle:<br/><textarea name="legal_principle">${citation.legal_principle}</textarea></label><br/>
        <label>Holding:<br/><textarea name="holding">${citation.holding}</textarea></label><br/>
        <label>Compliance Flags:<br/><input type="text" name="compliance_flags" value="${citation.compliance_flags.join(', ')}"/></label><br/>
        <label>Key Points:<br/><input type="text" name="key_points" value="${citation.key_points.join(', ')}"/></label><br/>
        <label>Tags:<br/><input type="text" name="tags" value="${citation.tags.join(', ')}"/></label><br/>
        <label>Case Link:<br/><a href="${citation.case_link}" target="_blank">View Case</a></label><br/>
        <label>Full Text:<br/><textarea name="full_case_text">${citation.full_case_text || ''}</textarea></label><br/>
      `;

      const saveBtn = document.createElement('button');
      saveBtn.textContent = 'Save';
      saveBtn.type = 'button';
      saveBtn.onclick = () => {
        alert('Saving is not implemented yet.');
      };

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Delete';
      deleteBtn.type = 'button';
      deleteBtn.onclick = () => {
        container.removeChild(card);
      };

      const printBtn = document.createElement('button');
      printBtn.textContent = 'Print';
      printBtn.type = 'button';
      printBtn.onclick = () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`<pre>${JSON.stringify(citation, null, 2)}</pre>`);
        printWindow.document.close();
        printWindow.print();
      };

      card.appendChild(form);
      card.appendChild(saveBtn);
      card.appendChild(deleteBtn);
      card.appendChild(printBtn);

      container.appendChild(card);
    });
  })
  .catch(err => {
    console.error('Error loading citations.json:', err);
  });
