const CategoriesPage = {
  state: { categories: [] },

  async render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="page-header">
        <h2 class="page-title">Categories</h2>
        <button class="btn btn-primary" id="new-cat-btn">+ New Category</button>
      </div>
      <div class="card" style="padding:0">
        <div class="table-wrap" id="cats-table-wrap">
          <div style="padding:2rem;text-align:center;color:var(--text-muted)">Loading…</div>
        </div>
      </div>
    `;

    document.getElementById('new-cat-btn').addEventListener('click', () => this.openForm());
    await this.load();
  },

  async load() {
    try {
      this.state.categories = await API.getCategories();
      this.renderTable();
    } catch (e) {
      showToast('Failed to load categories', 'error');
    }
  },

  renderTable() {
    const wrap = document.getElementById('cats-table-wrap');
    if (!this.state.categories.length) {
      wrap.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🗂️</div>
        <p>No categories yet. Create one to get started.</p>
      </div>`;
      return;
    }

    wrap.innerHTML = `
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Created</th>
            <th>Updated</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${this.state.categories.map(c => `
            <tr>
              <td><strong>${escHtml(c.name)}</strong></td>
              <td style="color:var(--text-muted);font-size:0.8rem">${formatDate(c.created_at)}</td>
              <td style="color:var(--text-muted);font-size:0.8rem">${formatDate(c.updated_at)}</td>
              <td>
                <div class="actions-cell">
                  <button class="btn btn-ghost btn-sm" data-action="edit" data-id="${c.id}">✏️ Edit</button>
                  <button class="btn btn-danger btn-sm" data-action="delete" data-id="${c.id}">✕ Delete</button>
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
        const cat = this.state.categories.find(c => c.id === id);
        if (action === 'edit') this.openForm(cat);
        if (action === 'delete') this.deleteCategory(cat);
      });
    });
  },

  openForm(cat = null) {
    Modal.open(cat ? 'Edit Category' : 'New Category', `
      <div class="form-group">
        <label>Name *</label>
        <input id="f-name" type="text" value="${escHtml(cat?.name || '')}" placeholder="Category name" />
        <span class="field-error hidden" id="f-name-err"></span>
      </div>
      <div class="form-actions">
        <button class="btn btn-ghost" id="form-cancel">Cancel</button>
        <button class="btn btn-primary" id="form-save">Save</button>
      </div>
    `);

    document.getElementById('form-cancel').addEventListener('click', Modal.close);
    document.getElementById('form-save').addEventListener('click', () => this.save(cat?.id));
    document.getElementById('f-name').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.save(cat?.id);
    });
    document.getElementById('f-name').focus();
  },

  async save(id) {
    const name = document.getElementById('f-name').value.trim();
    const errEl = document.getElementById('f-name-err');
    if (!name) {
      errEl.textContent = 'Name is required';
      errEl.classList.remove('hidden');
      return;
    }
    errEl.classList.add('hidden');

    try {
      if (id) {
        await API.updateCategory(id, { name });
        showToast('Category updated');
      } else {
        await API.createCategory({ name });
        showToast('Category created');
      }
      Modal.close();
      await this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },

  async deleteCategory(cat) {
    if (!confirm(`Delete category "${cat.name}"? Tasks won't be deleted, just unlinked.`)) return;
    try {
      await API.deleteCategory(cat.id);
      showToast('Category deleted');
      await this.load();
    } catch (e) {
      showToast(e.message, 'error');
    }
  },
};
