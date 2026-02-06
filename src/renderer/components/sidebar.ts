/**
 * Sidebar Component
 * Handles navigation and category filtering
 */

export interface SidebarCallbacks {
  onCategorySelect: (category: string) => void;
}

export class Sidebar {
  private categoryList: HTMLElement;
  private callbacks: SidebarCallbacks;
  private activeCategory: string = 'all';

  constructor(callbacks: SidebarCallbacks) {
    this.callbacks = callbacks;
    this.categoryList = document.getElementById('category-list')!;
  }

  updateCategories(categories: string[], solutionCounts: Record<string, number>): void {
    const allCategories = ['all', ...categories];

    this.categoryList.innerHTML = allCategories
      .map((category) => {
        const count =
          category === 'all'
            ? Object.values(solutionCounts).reduce((sum, count) => sum + count, 0)
            : solutionCounts[category] || 0;
        const isActive = this.activeCategory === category;
        const iconName = category === 'all' ? 'grid' : 'folder';

        return `
          <button 
            class="nav-item ${isActive ? 'active' : ''}" 
            data-category="${category}"
          >
            <sl-icon name="${iconName}"></sl-icon>
            <span class="sidebar-text">${category.charAt(0).toUpperCase() + category.slice(1)}</span>
            <sl-badge variant="neutral" size="small" pill class="sidebar-text">${count}</sl-badge>
          </button>
        `;
      })
      .join('');

    // Attach event listeners
    this.categoryList.querySelectorAll('.nav-item').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const category = (e.currentTarget as HTMLElement).dataset.category!;
        this.setActiveCategory(category);
        this.callbacks.onCategorySelect(category);
      });
    });
  }

  setActiveCategory(category: string): void {
    this.activeCategory = category;

    // Update active state
    this.categoryList.querySelectorAll('.nav-item').forEach((btn) => {
      const btnCategory = (btn as HTMLElement).dataset.category;
      if (btnCategory === category) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }
}
