const TasksPage = {
  state: { tasks: [], categories: [], showCompleted: false, selectedCategory: '' },

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">Tasks</h2>
        <button class="btn btn-primary" id="new-task-btn">+ New Task</button>
      </div>
      <div class="filter-bar">
        <div class="filter-tabs">
          <button class="tab-btn active" id="tab-active" data-tab="active">Active</button>
          <button class="tab-btn" id="tab-done" data-tab="done">Completed</button>
        </div>
        <div class="category-filter-group">
          <select id="category-filter"><option value="">All Categories</option></select>
          <button class="btn btn-ghost btn-sm hidden" id="clear-category-filter" title="Show all categories">✕ Clear</button>
        </div>
      </div>
      <div class="card" style="padding:0">
        <div class="table-wrap" id="tasks-table-wrap">
          <div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading…</div>
        </div>
      </div>
    `;

    document.getElementById('new-task-btn').addEventListener('click', () => this.openForm());
    document.getElementById('tab-active').addEventListener('click', () => this.switchTab(false));
    document.getElementById('tab-done').addEventListener('click', () => this.switchTab(true));
    document.getElementById('category-filter').addEventListener('change', (e) => {
      this.state.selectedCategory = e.target.value;
      this.load();
    });
    document.getElementById('clear-category-filter').addEventListener('click', () => {
      this.state.selectedCategory = '';
      this.load();
    });

    await this.load();
  },

  async load() {
    try {
      const params = { completed: this.state.showCompleted };
      if (this.state.selectedCategory) params.category = this.state.selectedCategory;

      [this.state.tasks, this.state.categories] = await Promise.all([
        API.getTasks(params),
        API.getCategories(),
      ]);
      this.populateCategoryFilter();
      this.renderTable();
    } catch (e) {
      showToast('Failed to load tasks', 'error');
    }
  },

  populateCategoryFilter() {
    const sel = document.getElementById('category-filter');
    if (!sel) return;
    sel.innerHTML = '<option value="">All Categories</option>' +
      this.state.categories.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
    sel.value = this.state.selectedCategory;

    document.getElementById('clear-category-filter')
      .classList.toggle('hidden', !this.state.selectedCategory);
  },

  switchTab(showCompleted) {
    this.state.showCompleted = showCompleted;
    document.getElementById('tab-active').classList.toggle('active', !showCompleted);
    document.getElementById('tab-done').classList.toggle('active', showCompleted);
    this.load();
  },

  renderTable() {
    const wrap = document.getElementById('tasks-table-wrap');
    if (!this.state.tasks.length) {
      const catName = this.state.selectedCategory
        ? (this.state.categories.find(c => c.id === this.state.selectedCategory)?.name || 'this category')
        : null;
      const emptyMsg = catName
        ? `No ${this.state.showCompleted ? 'completed' : 'active'} tasks in "${escHtml(catName)}".`
        : (this.state.showCompleted ? 'No completed tasks yet.' : 'No active tasks. Create your first one!');
      wrap.innerHTML = `<div class="empty-state">
        <div class="empty-icon">${this.state.showCompleted ? '🏁' : '📝'}</div>
        <p>${emptyMsg}</p>
      </div>`;
      return;
    }

    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Categories</th>
            <th>Status</th>
            <th>Created</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this.state.tasks.map(t => `
            <tr>
              <td><strong>${escHtml(t.name)}</strong>${t.description ? `<br><span style="color:var(--text-muted);font-size:0.78rem">${escHtml(t.description.substring(0, 80))}${t.description.length > 80 ? '…' : ''}</span>` : ''}</td>
              <td>${categoriesBadges(t.categories)}</td>
              <td>${t.completed
                ? '<span class="badge badge-done">Done</span>'
                : '<span class="badge badge-active">Active</span>'}</td>
              <td style="color:var(--text-muted);font-size:0.8rem">${formatDate(t.created_at)}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn btn-ghost btn-sm" data-action="activity" data-id="${t.id}" title="Activity">📋</button>
                  <button class="btn btn-ghost btn-sm" data-action="toggle" data-id="${t.id}" title="${t.completed ? 'Reopen' : 'Complete'}">${t.completed ? '↩' : '✓'}</button>
                  <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${t.id}" title="Edit">✏️</button>
                  <button class="btn btn-danger btn-sm" data-action="delete" data-id="${t.id}" title="Delete">✕</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    wrap.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => {
        const { action, id } = btn.dataset;
        const task = this.state.tasks.find(t => t.id === id);
        if (action === 'edit') this.openForm(task);
        if (action === 'delete') this.deleteTask(task);
        if (action === 'toggle') this.toggleComplete(task);
        if (action === 'activity') App.navigate('activity', { taskId: id, taskName: task.name });
      });
    });
  },

  openForm(task = null) {
    const cats = this.state.categories;
    const selectedIds = task ? task.categories.map(c => c.id) : [];

    Modal.open(task ? 'Edit Task' : 'New Task', `
      <div class="form-group">
        <label>Name *</label>
        <input id="f-name" type="text" value="${escHtml(task?.name || '')}" placeholder="Task name" />
        <span class="field-error hidden" id="f-name-err"></span>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="f-desc" placeholder="Optional details…">${escHtml(task?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label>Categories <span style="color:var(--text-dim);font-weight:400;text-transform:none">(hold Ctrl/Cmd to select multiple)</span></label>
        <select id="f-cats" multiple>
          ${cats.map(c => `<option value="${c.id}" ${selectedIds.includes(c.id) ? 'selected' : ''}>${escHtml(c.name)}</option>`).join('')}
        </select>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="form-cancel">Cancel</button>
        <button class="btn btn-primary" id="form-save">Save Task</button>
      </div>
    `);

    document.getElementById('form-cancel').addEventListener('click', Modal.close);
    document.getElementById('form-save').addEventListener('click', () => this.saveTask(task?.id));
  },

  async saveTask(id) {
    const name = document.getElementById('f-name').value.trim();
    const errEl = document.getElementById('f-name-err');
    if (!name) {
      errEl.textContent = 'Name is required';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    const description = document.getElementById('f-desc').value.trim();
    const catsSel = document.getElementById('f-cats');
    const categoryIds = Array.from(catsSel.selectedOptions).map(o => o.value);

    try {
      if (id) {
        await API.updateTask(id, { name, description, categoryIds });
        showToast('Task updated');
      } else {
        await API.createTask({ name, description, categoryIds });
        showToast('Task created');
      }
      Modal.close();
      await this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteTask(task) {
    if (!confirm(`Delete "${task.name}"? This will also remove its activity log.`)) return;
    try {
      await API.deleteTask(task.id);
      showToast('Task deleted');
      await this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async toggleComplete(task) {
    try {
      await API.toggleComplete(task.id);
      showToast(task.completed ? 'Task reopened' : 'Task completed');
      await this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },
};
