const App = {
  currentPage: null,
  currentParams: {},

  pages: {
    home: HomePage,
    tasks: TasksPage,
    categories: CategoriesPage,
    activity: ActivityPage,
  },

  navigate(page, params = {}) {
    this.currentPage = page;
    this.currentParams = params;

    // Update nav
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.dataset.page === page);
    });

    // Update hash
    window.location.hash = page;

    // Render page
    const handler = this.pages[page];
    if (handler) handler.render(params);
  },

  init() {
    // Listen to nav links
    document.querySelectorAll('.nav-link').forEach(a => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(a.dataset.page);
      });
    });

    // Read hash on load
    const hash = window.location.hash.replace('#', '') || 'home';
    const validPage = Object.keys(this.pages).includes(hash) ? hash : 'home';
    this.navigate(validPage);
  },
};

document.addEventListener('DOMContentLoaded', () => App.init());
