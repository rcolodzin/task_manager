const ActivityPage = {
  state: { entries: [], tasks: [], taskId: null, taskName: null },

  async render(params = {}) {
    this.state.taskId = params.taskId || null;
    this.state.taskName = params.taskName || null;

    const app = document.getElementById('app');
    const title = this.state.taskId
      ? `Activity: ${escHtml(this.state.taskName || 'Task')}`
      : 'Activity Log';

    app.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">${title}</h2>
        <div style="display:flex;gap:0.6rem">
          ${this.state.taskId ? `<button class="btn btn-ghost" id="all-activity-btn">← All Activity</button>` : ''}
          <button class="btn btn-primary" id="new-entry-btn">+ Log Activity</button>
        </div>
      </div>
      <div class="card" style="padding:0">
        <div id="activity-list">
          <div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading…</div>
        </div>
      </div>
    `;

    if (this.state.taskId) {
      document.getElementById('all-activity-btn').addEventListener('click', () => {
        App.navigate('activity');
      });
    }
    document.getElementById('new-entry-btn').addEventListener('click', () => this.openForm());

    await this.load();
  },

  async load() {
    try {
      const params = this.state.taskId ? { taskId: this.state.taskId } : {};
      [this.state.entries, this.state.tasks] = await Promise.all([
        API.getActivity(params),
        API.getTasks(),
      ]);
      this.renderList();
    } catch (e) {
      showToast('Failed to load activity', 'error');
    }
  },

  renderList() {
    const list = document.getElementById('activity-list');
    if (!this.state.entries.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>No activity logged yet. Start tracking your work!</p>
      </div>`;
      return;
    }

    list.innerHTML = this.state.entries.map(e => `
      <div class="activity-entry">
        <div class="activity-date">${e.date}</div>
        <div class="activity-body">
          <div class="activity-tasks">
            Task: <strong>${escHtml(e.task_name || e.task_id)}</strong>
            ${e.linked_task_id ? `&nbsp;·&nbsp; Also: <strong>${escHtml(e.linked_task_name || e.linked_task_id)}</strong>` : ''}
          </div>
          ${e.notes ? `<div class="activity-notes">${escHtml(e.notes)}</div>` : ''}
        </div>
        <div class="actions-cell">
          <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${e.id}">✏️</button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${e.id}">✕</button>
        </div>
      </div>
    `).join('');

    list.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { action, id } = btn.dataset;
        const entry = this.state.entries.find(e => e.id === id);
        if (action === 'edit') this.openForm(entry);
        if (action === 'delete') this.deleteEntry(entry);
      });
    });
  },

  openForm(entry = null) {
    const tasks = this.state.tasks;
    const today = new Date().toISOString().split('T')[0];

    Modal.open(entry ? 'Edit Activity' : 'Log Activity', `
      <div class="form-group">
        <label>Date *</label>
        <input id="f-date" type="date" value="${entry?.date || today}" />
        <span class="field-error hidden" id="f-date-err"></span>
      </div>
      <div class="form-group">
        <label>Primary Task *</label>
        <select id="f-task">
          <option value="">Select a task…</option>
          ${tasks.map(t => `<option value="${t.id}" ${(entry?.task_id === t.id || (!entry && this.state.taskId === t.id)) ? 'selected' : ''}>${escHtml(t.name)}${t.completed ? ' ✓' : ''}</option>`).join('')}
        </select>
        <span class="field-error hidden" id="f-task-err"></span>
      </div>
      <div class="form-group">
        <label>Also related to (optional)</label>
        <select id="f-linked-task">
          <option value="">None</option>
          ${tasks.map(t => `<option value="${t.id}" ${entry?.linked_task_id === t.id ? 'selected' : ''}>${escHtml(t.name)}${t.completed ? ' ✓' : ''}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Notes</label>
        <textarea id="f-notes" placeholder="What did you work on?">${escHtml(entry?.notes || '')}</textarea>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="form-cancel">Cancel</button>
        <button class="btn btn-primary" id="form-save">Save</button>
      </div>
    `);

    document.getElementById('form-cancel').addEventListener('click', Modal.close);
    document.getElementById('form-save').addEventListener('click', () => this.saveEntry(entry?.id));
  },

  async saveEntry(id) {
    const date = document.getElementById('f-date').value;
    const taskId = document.getElementById('f-task').value;
    const linkedTaskId = document.getElementById('f-linked-task').value || null;
    const notes = document.getElementById('f-notes').value.trim();

    let valid = true;
    const dateErr = document.getElementById('f-date-err');
    const taskErr = document.getElementById('f-task-err');

    if (!date) { dateErr.textContent = 'Date is required'; dateErr.classList.remove('hidden'); valid = false; }
    else dateErr.classList.add('hidden');

    if (!taskId) { taskErr.textContent = 'Select a task'; taskErr.classList.remove('hidden'); valid = false; }
    else taskErr.classList.add('hidden');

    if (!valid) return;

    try {
      if (id) {
        await API.updateActivity(id, { taskId, linkedTaskId, date, notes });
        showToast('Entry updated');
      } else {
        await API.createActivity({ taskId, linkedTaskId, date, notes });
        showToast('Activity logged');
      }
      Modal.close();
      await this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteEntry(entry) {
    if (!confirm('Delete this activity entry?')) return;
    try {
      await API.deleteActivity(entry.id);
      showToast('Entry deleted');
      await this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },
};
