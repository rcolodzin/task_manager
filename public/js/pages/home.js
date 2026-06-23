const HomePage = {
  state: { categories: [], result: null, includeCompleted: false },

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="home-hero">
        <h1>What should I do next?</h1>
        <p>Pick a category and let chance decide.</p>
      </div>

      <div class="picker-controls">
        <div class="control-group">
          <label>Category</label>
          <select id="cat-select"><option value="">Loading…</option></select>
        </div>
        <!--
        <div class="control-group">
          <label class="toggle-row" for="include-done">
            <input type="checkbox" id="include-done" />
            Include completed tasks
          </label>
        </div>
        -->
        <div class="pick-btn-wrap">
          <button class="btn btn-primary" id="pick-btn">🎲 Pick a Random Task</button>
        </div>
      </div>

      <div id="result-area"></div>
    `;

    await this.loadCategories();
    document.getElementById('pick-btn').addEventListener('click', () => this.pick());
    document.getElementById('include-done').addEventListener('change', (e) => {
      this.state.includeCompleted = e.target.checked;
    });
  },

  async loadCategories() {
    try {
      this.state.categories = await API.getCategories();
      const sel = document.getElementById('cat-select');
      sel.innerHTML = '<option value="">All categories</option>' +
        this.state.categories.map(c => `<option value="${c.id}">${escHtml(c.name)}</option>`).join('');
    } catch (e) {
      showToast('Failed to load categories', 'error');
    }
  },

  async pick() {
    const catId = document.getElementById('cat-select').value;
    const params = {};
    if (catId) params.category = catId;
    if (!this.state.includeCompleted) params.completed = 'false';

    try {
      const tasks = await API.getTasks(params);
      if (!tasks.length) {
        document.getElementById('result-area').innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🤷</div>
            <p>No tasks found for those filters. Try a different category or include completed tasks.</p>
          </div>`;
        return;
      }

      const task = tasks[Math.floor(Math.random() * tasks.length)];
      this.state.result = task;
      this.renderResult(task);
    } catch (e) {
      showToast('Failed to load tasks', 'error');
    }
  },

  renderResult(task) {
    const area = document.getElementById('result-area');
    area.innerHTML = `
      <div class="result-card" id="result-card">
        <div class="task-cats">${categoriesBadges(task.categories)}</div>
        <div class="task-name">${escHtml(task.name)}</div>
        ${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ''}
        <div class="result-actions">
          ${!task.completed
            ? `<button class="btn btn-success btn-sm" id="complete-btn">✓ Mark Complete</button>`
            : `<span class="badge badge-done">Completed</span>`
          }
          <button class="btn btn-ghost btn-sm" id="activity-btn">📋 Activity Log</button>
          <button class="btn btn-ghost btn-sm" id="pick-another-btn">🎲 Pick Another</button>
        </div>
      </div>
    `;

    document.getElementById('pick-another-btn').addEventListener('click', () => this.pick());

    const completeBtn = document.getElementById('complete-btn');
    if (completeBtn) {
      completeBtn.addEventListener('click', async () => {
        try {
          await API.toggleComplete(task.id);
          showToast('Task marked complete!');
          await this.pick();
        } catch (e) {
          showToast('Failed to update task', 'error');
        }
      });
    }

    document.getElementById('activity-btn').addEventListener('click', () => {
      App.navigate('activity', { taskId: task.id, taskName: task.name });
    });
  },
};
