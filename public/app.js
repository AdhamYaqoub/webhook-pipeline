const apiBase = window.location.origin;

const $ = (selector) => document.querySelector(selector);

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const json = await res.json().catch(() => null);
    const err = new Error(json?.error || res.statusText);
    err.status = res.status;
    err.json = json;
    throw err;
  }
  return res.json();
}

function prettyJson(obj) {
  return JSON.stringify(obj, null, 2);
}

function toPill(status) {
  const mapping = {
    pending: 'warn',
    processing: 'warn',
    completed: 'success',
    failed: 'error',
    dead_letter: 'error',
  };
  const cls = mapping[status] || 'warn';
  const span = document.createElement('span');
  span.className = `pill ${cls}`;
  span.textContent = status;
  return span;
}

function setStatus(msg, isError = false) {
  const el = $('#createPipelineStatus');
  el.textContent = msg;
  el.style.color = isError ? '#b91c1c' : '#047857';
  setTimeout(() => {
    if (el.textContent === msg) el.textContent = '';
  }, 4000);
}

async function loadPipelines() {
  const container = $('#pipelines');
  container.innerHTML = '<p>Loading...</p>';

  try {
    const pipelines = await fetchJson(`${apiBase}/pipelines`);
    if (!pipelines.length) {
      container.innerHTML = '<p>No pipelines yet.</p>';
      return;
    }

    container.innerHTML = '';
    pipelines.forEach((pipeline) => {
      const card = document.createElement('div');
      card.className = 'card';
      card.style.borderLeft = '4px solid #2563eb';
      card.style.padding = '1rem';

      const title = document.createElement('h3');
      title.textContent = pipeline.name;
      card.appendChild(title);

      const idText = document.createElement('p');
      idText.textContent = `ID: ${pipeline.id}`;
      card.appendChild(idText);

      const token = document.createElement('p');
      token.textContent = `Webhook URL: ${apiBase}/hooks/${pipeline.sourceToken}`;
      card.appendChild(token);

      const info = document.createElement('p');
      info.innerHTML = `Action: <strong>${pipeline.actionType}</strong> | Signing secret: <strong>${pipeline.signingSecret ?? '—'}</strong>`;
      card.appendChild(info);

      const actions = document.createElement('div');
      actions.className = 'flex';

      const viewButton = document.createElement('button');
      viewButton.textContent = 'View jobs';
      viewButton.onclick = () => showPipelineDetails(pipeline);
      actions.appendChild(viewButton);

      card.appendChild(actions);
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = '<p style="color:#b91c1c">Failed to load pipelines.</p>';
    console.error(err);
  }
}

async function showPipelineDetails(pipeline) {
  const details = $('#pipelineDetails');
  const content = $('#detailsContent');
  details.classList.remove('hidden');
  content.innerHTML = '<p>Loading jobs…</p>';

  try {
    const jobs = await fetchJson(`${apiBase}/pipelines/${pipeline.id}/jobs`);
    content.innerHTML = '';

    const header = document.createElement('div');
    header.innerHTML = `<h3>${pipeline.name} — Jobs (${jobs.length})</h3>`;
    content.appendChild(header);

    if (!jobs.length) {
      content.innerHTML += '<p>No jobs yet.</p>';
      return;
    }

    jobs.forEach((job) => {
      const jobCard = document.createElement('div');
      jobCard.className = 'card';

      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.justifyContent = 'space-between';
      row.style.alignItems = 'center';

      const left = document.createElement('div');
      left.innerHTML = `<strong>${job.id}</strong><br/>${new Date(job.createdAt).toLocaleString()}`;
      row.appendChild(left);

      const state = toPill(job.status);
      row.appendChild(state);

      jobCard.appendChild(row);

      const actions = document.createElement('div');
      actions.className = 'flex';

      const viewBtn = document.createElement('button');
      viewBtn.textContent = 'View deliveries';
      viewBtn.onclick = () => showDeliveries(job);
      actions.appendChild(viewBtn);

      jobCard.appendChild(actions);
      content.appendChild(jobCard);
    });
  } catch (err) {
    content.innerHTML = '<p style="color:#b91c1c">Failed to load jobs.</p>';
  }
}

async function showDeliveries(job) {
  const details = $('#pipelineDetails');
  const content = $('#detailsContent');
  content.innerHTML = '<p>Loading deliveries…</p>';

  try {
    const deliveries = await fetchJson(`${apiBase}/jobs/${job.id}/deliveries`);
    content.innerHTML = `<h3>Deliveries for job ${job.id}</h3>`;

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.innerHTML = `
      <thead>
        <tr>
          <th style="text-align:left;padding:0.5rem">#</th>
          <th style="text-align:left;padding:0.5rem">Status</th>
          <th style="text-align:left;padding:0.5rem">HTTP</th>
          <th style="text-align:left;padding:0.5rem">Error</th>
          <th style="text-align:left;padding:0.5rem">Time</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    deliveries.forEach((d) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:0.5rem; border-top:1px solid #e5e7eb">${d.attemptNumber}</td>
        <td style="padding:0.5rem; border-top:1px solid #e5e7eb">${d.status}</td>
        <td style="padding:0.5rem; border-top:1px solid #e5e7eb">${d.httpStatus ?? '-'}</td>
        <td style="padding:0.5rem; border-top:1px solid #e5e7eb">${d.error ?? '-'}</td>
        <td style="padding:0.5rem; border-top:1px solid #e5e7eb">${new Date(d.createdAt).toLocaleTimeString()}</td>
      `;
      tbody.appendChild(tr);
    });

    content.appendChild(table);
  } catch (err) {
    content.innerHTML = '<p style="color:#b91c1c">Failed to load deliveries.</p>';
  }
}

function setupForm() {
  const form = document.getElementById('createPipelineForm');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);

    let actionConfig = {};
    try {
      const jsonText = formData.get('actionConfig')?.toString() || '';
      actionConfig = jsonText.trim() ? JSON.parse(jsonText) : {};
    } catch (err) {
      setStatus('Invalid JSON in actionConfig', true);
      return;
    }

    try {
      const pipeline = await fetchJson(`${apiBase}/pipelines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          actionType: formData.get('actionType'),
          actionConfig,
          signingSecret: formData.get('signingSecret') || undefined,
        }),
      });
      setStatus(`Pipeline created (id=${pipeline.id})`);
      loadPipelines();
      form.reset();
    } catch (err) {
      setStatus(err.message || 'Failed to create', true);
    }
  });
}

function setup() {
  setupForm();
  document.getElementById('refreshPipelines').onclick = () => loadPipelines();
  document.getElementById('closeDetails').onclick = () => {
    $('#pipelineDetails').classList.add('hidden');
  };

  loadPipelines();
}

window.addEventListener('DOMContentLoaded', setup);
