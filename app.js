/* ========================================
   InventarioChile — Application Logic
   Firebase Integration (Firestore)
   ======================================== */

(function () {
    'use strict';

    // ============================
    // Firebase Configuration
    // ============================
    const firebaseConfig = {
        apiKey: "AIzaSyBPqBPDfHhd_0blEKKWWol0cEW-r9H6Syg",
        authDomain: "productochile-80683.firebaseapp.com",
        projectId: "productochile-80683",
        storageBucket: "productochile-80683.firebasestorage.app",
        messagingSenderId: "383347024224",
        appId: "1:383347024224:web:e133c45ec360202fc43e05",
        measurementId: "G-JNRLMGDSNG"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // ============================
    // Default Data
    // ============================
    const DEFAULT_CATEGORIES = [
        'Electrónica',
        'Electrodomésticos',
        'Hogar',
        'Ropa',
        'Tecnología',
        'Herramientas',
        'Otros',
    ];

    // State
    let products = [];
    let categories = [...DEFAULT_CATEGORIES];
    let productsLoaded = false;
    let categoriesLoaded = false;
    let selectedImageFile = null;
    let currentImageUrl = '';

    // ============================
    // DOM Elements
    // ============================
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const sidebar = $('#sidebar');
    const sidebarOverlay = $('#sidebarOverlay');
    const menuToggle = $('#menuToggle');
    const mainContent = $('#mainContent');
    const loadingOverlay = $('#loadingOverlay');

    const viewTitle = $('#viewTitle');
    const viewSubtitle = $('#viewSubtitle');
    const searchInput = $('#searchInput');

    const btnAddProduct = $('#btnAddProduct');

    // Views
    const views = {
        dashboard: $('#view-dashboard'),
        products: $('#view-products'),
        sold: $('#view-sold'),
        categories: $('#view-categories'),
    };

    // Dashboard elements
    const totalProductsEl = $('#totalProducts');
    const availableProductsEl = $('#availableProducts');
    const soldProductsEl = $('#soldProducts');
    const totalRevenueEl = $('#totalRevenue');
    const recentProductsList = $('#recentProductsList');
    const categoryChart = $('#categoryChart');

    // Products view
    const productsGrid = $('#productsGrid');
    const filterCategory = $('#filterCategory');
    const filterStatus = $('#filterStatus');
    const filterSort = $('#filterSort');

    // Sold view
    const soldGrid = $('#soldGrid');

    // Categories view
    const categoriesGrid = $('#categoriesGrid');
    const newCategoryInput = $('#newCategoryInput');
    const btnAddCategory = $('#btnAddCategory');

    // Modals
    const productModal = $('#productModal');
    const modalTitle = $('#modalTitle');
    const productForm = $('#productForm');
    const modalClose = $('#modalClose');
    const btnCancelProduct = $('#btnCancelProduct');
    const btnSaveProduct = $('#btnSaveProduct');

    const detailModal = $('#detailModal');
    const detailTitle = $('#detailTitle');
    const detailBody = $('#detailBody');
    const detailClose = $('#detailClose');

    const confirmModal = $('#confirmModal');
    const confirmMessage = $('#confirmMessage');
    const btnCancelDelete = $('#btnCancelDelete');
    const btnConfirmDelete = $('#btnConfirmDelete');

    const toastContainer = $('#toastContainer');

    // Form fields
    const formFields = {
        id: $('#productId'),
        name: $('#productName'),
        sku: $('#productSku'),
        description: $('#productDescription'),
        price: $('#productPrice'),
        cost: $('#productCost'),
        category: $('#productCategory'),
        status: $('#productStatus'),
        quantity: $('#productQuantity'),
        brand: $('#productBrand'),
        buyer: $('#productBuyer'),
        notes: $('#productNotes'),
    };

    // Image upload elements
    const imageUploadArea = $('#imageUploadArea');
    const imagePreview = $('#imagePreview');
    const imagePreviewImg = $('#imagePreviewImg');
    const imageUploadPlaceholder = $('#imageUploadPlaceholder');
    const btnRemoveImage = $('#btnRemoveImage');
    const productImageFile = $('#productImageFile');

    let currentView = 'dashboard';
    let deleteCallback = null;

    // ============================
    // Loading Overlay
    // ============================
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.add('hidden');
            setTimeout(() => {
                if (loadingOverlay.parentNode) loadingOverlay.remove();
            }, 500);
        }
    }

    function checkInitialLoad() {
        if (productsLoaded && categoriesLoaded) {
            hideLoading();
            renderDashboard();
        }
    }

    // ============================
    // Firestore Real-time Listeners
    // ============================
    db.collection('products').onSnapshot(snapshot => {
        products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!productsLoaded) {
            productsLoaded = true;
            checkInitialLoad();
        } else {
            renderCurrentView();
        }
    }, error => {
        console.error('Error cargando productos:', error);
        showToast('Error al cargar productos', 'error');
        if (!productsLoaded) {
            productsLoaded = true;
            checkInitialLoad();
        }
    });

    db.collection('config').doc('categories').onSnapshot(doc => {
        if (doc.exists) {
            categories = doc.data().list;
        } else {
            categories = [...DEFAULT_CATEGORIES];
            db.collection('config').doc('categories').set({ list: categories });
        }
        if (!categoriesLoaded) {
            categoriesLoaded = true;
            checkInitialLoad();
        } else {
            if (currentView === 'categories') renderCategories();
        }
    }, error => {
        console.error('Error cargando categorías:', error);
        categories = [...DEFAULT_CATEGORIES];
        if (!categoriesLoaded) {
            categoriesLoaded = true;
            checkInitialLoad();
        }
    });

    // ============================
    // Toast Notifications
    // ============================
    function showToast(message, type = 'info') {
        const icons = {
            success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
            error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
            info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // ============================
    // Navigation
    // ============================
    const viewMeta = {
        dashboard: { title: 'Dashboard', subtitle: 'Resumen general de tu inventario' },
        products: { title: 'Productos', subtitle: 'Gestiona todos tus productos' },
        sold: { title: 'Vendidos', subtitle: 'Productos que ya fueron vendidos' },
        categories: { title: 'Categorías', subtitle: 'Organiza tus productos por categoría' },
    };

    function switchView(view) {
        currentView = view;

        // Update nav
        $$('.nav-item').forEach(item => item.classList.remove('active'));
        const activeNav = $(`.nav-item[data-view="${view}"]`);
        if (activeNav) activeNav.classList.add('active');

        // Update views
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[view].classList.add('active');

        // Update title
        const meta = viewMeta[view];
        viewTitle.textContent = meta.title;
        viewSubtitle.textContent = meta.subtitle;

        // Render view content
        renderCurrentView();

        // Close mobile sidebar
        closeMobileSidebar();
    }

    function renderCurrentView() {
        switch (currentView) {
            case 'dashboard': renderDashboard(); break;
            case 'products': renderProducts(); break;
            case 'sold': renderSold(); break;
            case 'categories': renderCategories(); break;
        }
    }

    // ============================
    // Format Helpers
    // ============================
    function formatARS(amount) {
        return '$' + Number(amount).toLocaleString('es-AR') + ' ARS';
    }

    function formatCLP(amount) {
        return '$' + Number(amount).toLocaleString('es-CL') + ' CLP';
    }

    function formatDate(dateStr) {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    function getStatusLabel(status) {
        const labels = { disponible: 'Disponible', vendido: 'Vendido', reservado: 'Reservado' };
        return labels[status] || status;
    }

    // ============================
    // Dashboard
    // ============================
    function renderDashboard() {
        // Stats
        const total = products.length;
        const available = products.filter(p => p.status === 'disponible').length;
        const sold = products.filter(p => p.status === 'vendido').length;
        const revenue = products
            .filter(p => p.status === 'vendido')
            .reduce((sum, p) => sum + Number(p.price || 0), 0);

        animateNumber(totalProductsEl, total);
        animateNumber(availableProductsEl, available);
        animateNumber(soldProductsEl, sold);
        totalRevenueEl.textContent = formatARS(revenue);

        // Recent products (last 5)
        const recent = [...products].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5);
        if (recent.length === 0) {
            recentProductsList.innerHTML = '<div class="empty-state-small"><p>No hay productos registrados aún</p></div>';
        } else {
            recentProductsList.innerHTML = recent.map(p => `
                <div class="recent-item" data-id="${p.id}">
                    <div class="recent-item-image">
                        ${p.image ? `<img src="${p.image}" alt="${escapeHtml(p.name)}" onerror="this.parentElement.innerHTML='<svg width=20 height=20 viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot;><path d=&quot;M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z&quot;/></svg>'">` : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/></svg>'}
                    </div>
                    <div class="recent-item-info">
                        <div class="recent-item-name">${escapeHtml(p.name)}</div>
                        <div class="recent-item-category">${escapeHtml(p.category)}</div>
                    </div>
                    <div class="recent-item-price">${formatARS(p.price)}</div>
                </div>
            `).join('');

            // Click to open detail
            recentProductsList.querySelectorAll('.recent-item').forEach(el => {
                el.style.cursor = 'pointer';
                el.addEventListener('click', () => openDetail(el.dataset.id));
            });
        }

        // Category chart
        const catCounts = {};
        products.forEach(p => {
            catCounts[p.category] = (catCounts[p.category] || 0) + 1;
        });
        const catEntries = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
        const maxCount = catEntries.length > 0 ? catEntries[0][1] : 0;

        if (catEntries.length === 0) {
            categoryChart.innerHTML = '<div class="empty-state-small"><p>No hay datos disponibles</p></div>';
        } else {
            const colors = [
                'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                'linear-gradient(135deg, #22c55e, #16a34a)',
                'linear-gradient(135deg, #a855f7, #7c3aed)',
                'linear-gradient(135deg, #f59e0b, #d97706)',
                'linear-gradient(135deg, #06b6d4, #0891b2)',
                'linear-gradient(135deg, #ef4444, #dc2626)',
                'linear-gradient(135deg, #ec4899, #db2777)',
            ];

            categoryChart.innerHTML = catEntries.map((entry, i) => {
                const pct = maxCount > 0 ? (entry[1] / maxCount) * 100 : 0;
                return `
                    <div class="category-bar">
                        <span class="category-bar-label">${escapeHtml(entry[0])}</span>
                        <div class="category-bar-track">
                            <div class="category-bar-fill" style="width: ${pct}%; background: ${colors[i % colors.length]}">
                                <span class="category-bar-value">${entry[1]}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }

    function animateNumber(el, target) {
        const start = parseInt(el.textContent) || 0;
        if (start === target) return;
        const duration = 400;
        const startTime = performance.now();

        function update(now) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(start + (target - start) * eased);
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }

    // ============================
    // Products View
    // ============================
    function getFilteredProducts(onlySold = false) {
        let filtered = [...products];

        // Filter by status
        if (onlySold) {
            filtered = filtered.filter(p => p.status === 'vendido');
        } else {
            const statusFilter = filterStatus.value;
            if (statusFilter) {
                filtered = filtered.filter(p => p.status === statusFilter);
            }
        }

        // Filter by category
        const catFilter = filterCategory.value;
        if (catFilter && !onlySold) {
            filtered = filtered.filter(p => p.category === catFilter);
        }

        // Search
        const query = searchInput.value.toLowerCase().trim();
        if (query) {
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.brand && p.brand.toLowerCase().includes(query)) ||
                (p.description && p.description.toLowerCase().includes(query)) ||
                p.category.toLowerCase().includes(query)
            );
        }

        // Sort
        const sort = filterSort.value;
        switch (sort) {
            case 'newest':
                filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                break;
            case 'oldest':
                filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                break;
            case 'price-asc':
                filtered.sort((a, b) => Number(a.price) - Number(b.price));
                break;
            case 'price-desc':
                filtered.sort((a, b) => Number(b.price) - Number(a.price));
                break;
            case 'name-asc':
                filtered.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case 'name-desc':
                filtered.sort((a, b) => b.name.localeCompare(a.name));
                break;
        }

        return filtered;
    }

    function renderProducts() {
        updateCategoryFilter();
        const filtered = getFilteredProducts();

        if (filtered.length === 0) {
            productsGrid.innerHTML = `
                <div class="empty-state" id="emptyProducts">
                    <div class="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <path d="M16 10a4 4 0 0 1-8 0"/>
                        </svg>
                    </div>
                    <h3>${searchInput.value ? 'Sin resultados' : 'No hay productos'}</h3>
                    <p>${searchInput.value ? 'Intenta con otra búsqueda' : 'Agrega tu primer producto haciendo clic en "Nuevo Producto"'}</p>
                </div>
            `;
            return;
        }

        productsGrid.innerHTML = filtered.map(p => createProductCard(p)).join('');
        attachProductCardEvents();
    }

    function renderSold() {
        const sold = products.filter(p => p.status === 'vendido');
        const query = searchInput.value.toLowerCase().trim();
        let filtered = sold;
        if (query) {
            filtered = sold.filter(p =>
                p.name.toLowerCase().includes(query) ||
                (p.sku && p.sku.toLowerCase().includes(query)) ||
                (p.buyer && p.buyer.toLowerCase().includes(query))
            );
        }

        if (filtered.length === 0) {
            soldGrid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                    <h3>No hay productos vendidos</h3>
                    <p>Cuando marques un producto como vendido aparecerá aquí</p>
                </div>
            `;
            return;
        }

        soldGrid.innerHTML = filtered.map(p => createProductCard(p)).join('');
        attachProductCardEvents(soldGrid);
    }

    function createProductCard(p) {
        return `
            <div class="product-card" data-id="${p.id}">
                <div class="product-card-image">
                    ${p.image ? `<img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" onerror="this.style.display='none'; this.parentElement.innerHTML += '<svg class=\\'placeholder-icon\\' width=\\'48\\' height=\\'48\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1.5\\'><path d=\\'M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z\\'/><line x1=\\'3\\' y1=\\'6\\' x2=\\'21\\' y2=\\'6\\'/><path d=\\'M16 10a4 4 0 0 1-8 0\\'/></svg>'">` : '<svg class="placeholder-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>'}
                    <span class="product-card-status status-${p.status}">${getStatusLabel(p.status)}</span>
                </div>
                <div class="product-card-body">
                    <div class="product-card-name">${escapeHtml(p.name)}</div>
                    <div class="product-card-category">${escapeHtml(p.category)}</div>
                    <div class="product-card-meta">
                        <span class="product-card-price">${formatARS(p.price)}</span>
                        <span class="product-card-sku">${p.sku ? escapeHtml(p.sku) : ''}</span>
                    </div>
                </div>
                <div class="product-card-actions">
                    ${p.status !== 'vendido' ? `
                    <button class="btn-icon btn-icon-success" data-action="sell" data-id="${p.id}" title="Marcar como vendido">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    </button>` : ''}
                    <button class="btn-icon btn-icon-warning" data-action="edit" data-id="${p.id}" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon btn-icon-danger" data-action="delete" data-id="${p.id}" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
        `;
    }

    function attachProductCardEvents(container) {
        const root = container || productsGrid;
        root.querySelectorAll('.product-card').forEach(card => {
            // Card click → detail (but not if clicking actions)
            card.addEventListener('click', (e) => {
                if (e.target.closest('.product-card-actions')) return;
                openDetail(card.dataset.id);
            });
        });

        root.querySelectorAll('[data-action="sell"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                sellProduct(btn.dataset.id);
            });
        });

        root.querySelectorAll('[data-action="edit"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(btn.dataset.id);
            });
        });

        root.querySelectorAll('[data-action="delete"]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                confirmDelete(btn.dataset.id);
            });
        });
    }

    // ============================
    // Category Filter
    // ============================
    function updateCategoryFilter() {
        const current = filterCategory.value;
        filterCategory.innerHTML = '<option value="">Todas</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            filterCategory.appendChild(opt);
        });
        filterCategory.value = current;
    }

    function updateCategorySelect() {
        const current = formFields.category.value;
        formFields.category.innerHTML = '<option value="">Seleccionar...</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            formFields.category.appendChild(opt);
        });
        formFields.category.value = current;
    }

    // ============================
    // Categories View
    // ============================
    function renderCategories() {
        if (categories.length === 0) {
            categoriesGrid.innerHTML = `
                <div class="empty-state" id="emptyCategories">
                    <div class="empty-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                            <line x1="8" y1="6" x2="21" y2="6"/>
                            <line x1="8" y1="12" x2="21" y2="12"/>
                            <line x1="8" y1="18" x2="21" y2="18"/>
                            <line x1="3" y1="6" x2="3.01" y2="6"/>
                            <line x1="3" y1="12" x2="3.01" y2="12"/>
                            <line x1="3" y1="18" x2="3.01" y2="18"/>
                        </svg>
                    </div>
                    <h3>No hay categorías</h3>
                    <p>Crea una categoría para organizar tus productos</p>
                </div>
            `;
            return;
        }

        categoriesGrid.innerHTML = categories.map(cat => {
            const count = products.filter(p => p.category === cat).length;
            return `
                <div class="category-card">
                    <div class="category-card-info">
                        <div class="category-card-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                            </svg>
                        </div>
                        <div>
                            <div class="category-card-name">${escapeHtml(cat)}</div>
                            <div class="category-card-count">${count} producto${count !== 1 ? 's' : ''}</div>
                        </div>
                    </div>
                    <div class="category-card-actions">
                        <button class="btn-icon btn-icon-danger" data-action="delete-cat" data-cat="${escapeHtml(cat)}" title="Eliminar categoría">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach delete events
        categoriesGrid.querySelectorAll('[data-action="delete-cat"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const cat = btn.dataset.cat;
                const count = products.filter(p => p.category === cat).length;
                if (count > 0) {
                    showToast(`No puedes eliminar "${cat}" porque tiene ${count} producto(s) asignado(s)`, 'error');
                    return;
                }
                categories = categories.filter(c => c !== cat);
                db.collection('config').doc('categories').set({ list: categories })
                    .then(() => showToast(`Categoría "${cat}" eliminada`, 'success'))
                    .catch(err => {
                        console.error('Error eliminando categoría:', err);
                        showToast('Error al eliminar categoría', 'error');
                    });
            });
        });
    }

    // ============================
    // Image Upload Handling
    // ============================
    function setupImageUpload() {
        // Click to open file picker
        imageUploadArea.addEventListener('click', (e) => {
            if (e.target.closest('.btn-remove-image')) return;
            productImageFile.click();
        });

        // File selected
        productImageFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    showToast('La imagen no puede superar los 5MB', 'error');
                    productImageFile.value = '';
                    return;
                }
                selectedImageFile = file;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    imagePreviewImg.src = ev.target.result;
                    imagePreview.style.display = 'block';
                    imageUploadPlaceholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });

        // Remove image
        btnRemoveImage.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            selectedImageFile = null;
            currentImageUrl = '';
            productImageFile.value = '';
            imagePreviewImg.src = '';
            imagePreview.style.display = 'none';
            imageUploadPlaceholder.style.display = 'flex';
        });

        // Drag and drop
        imageUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            imageUploadArea.classList.add('dragover');
        });

        imageUploadArea.addEventListener('dragleave', () => {
            imageUploadArea.classList.remove('dragover');
        });

        imageUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            imageUploadArea.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                if (file.size > 5 * 1024 * 1024) {
                    showToast('La imagen no puede superar los 5MB', 'error');
                    return;
                }
                selectedImageFile = file;

                // Update the file input
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                productImageFile.files = dataTransfer.files;

                const reader = new FileReader();
                reader.onload = (ev) => {
                    imagePreviewImg.src = ev.target.result;
                    imagePreview.style.display = 'block';
                    imageUploadPlaceholder.style.display = 'none';
                };
                reader.readAsDataURL(file);
            }
        });
    }

    function resetImageUpload() {
        selectedImageFile = null;
        currentImageUrl = '';
        productImageFile.value = '';
        imagePreviewImg.src = '';
        imagePreview.style.display = 'none';
        imageUploadPlaceholder.style.display = 'flex';
    }

    function showExistingImage(url) {
        if (url) {
            currentImageUrl = url;
            imagePreviewImg.src = url;
            imagePreview.style.display = 'block';
            imageUploadPlaceholder.style.display = 'none';
        }
    }

    // ============================
    // Image Compression (base64)
    // ============================
    function compressImage(file, maxWidth, maxHeight, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    let w = img.width;
                    let h = img.height;

                    // Scale down if needed
                    if (w > maxWidth || h > maxHeight) {
                        const ratio = Math.min(maxWidth / w, maxHeight / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);

                    // Convert to compressed JPEG base64
                    const base64 = canvas.toDataURL('image/jpeg', quality);
                    resolve(base64);
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ============================
    // Product CRUD (Firebase)
    // ============================
    function openAddModal() {
        modalTitle.textContent = 'Nuevo Producto';
        productForm.reset();
        formFields.id.value = '';
        formFields.quantity.value = 1;
        formFields.status.value = 'disponible';
        updateCategorySelect();
        resetImageUpload();
        productModal.classList.add('active');
    }

    function openEditModal(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;

        modalTitle.textContent = 'Editar Producto';
        updateCategorySelect();

        formFields.id.value = p.id;
        formFields.name.value = p.name;
        formFields.sku.value = p.sku || '';
        formFields.description.value = p.description || '';
        formFields.price.value = p.price;
        formFields.cost.value = p.cost || '';
        formFields.category.value = p.category;
        formFields.status.value = p.status;
        formFields.quantity.value = p.quantity || 1;
        formFields.brand.value = p.brand || '';
        formFields.buyer.value = p.buyer || '';
        formFields.notes.value = p.notes || '';

        // Handle image
        resetImageUpload();
        if (p.image) {
            showExistingImage(p.image);
        }

        productModal.classList.add('active');
    }

    function closeProductModal() {
        productModal.classList.remove('active');
        resetImageUpload();
    }

    async function saveProduct(e) {
        e.preventDefault();

        const originalText = btnSaveProduct.innerHTML;
        btnSaveProduct.disabled = true;
        btnSaveProduct.innerHTML = '<span class="spinner"></span> Guardando...';

        try {
            const id = formFields.id.value;
            const data = {
                name: formFields.name.value.trim(),
                sku: formFields.sku.value.trim(),
                description: formFields.description.value.trim(),
                price: Number(formFields.price.value),
                cost: formFields.cost.value ? Number(formFields.cost.value) : null,
                category: formFields.category.value,
                status: formFields.status.value,
                quantity: Number(formFields.quantity.value) || 1,
                brand: formFields.brand.value.trim(),
                buyer: formFields.buyer.value.trim(),
                notes: formFields.notes.value.trim(),
                image: currentImageUrl || '',
            };

            // Handle image: compress and store as base64
            if (selectedImageFile) {
                btnSaveProduct.innerHTML = '<span class="spinner"></span> Procesando imagen...';
                data.image = await compressImage(selectedImageFile, 800, 800, 0.7);
            }

            if (id) {
                // Update existing product
                const updateData = { ...data, updatedAt: new Date().toISOString() };
                const existing = products.find(p => p.id === id);
                if (data.status === 'vendido' && existing && existing.status !== 'vendido') {
                    updateData.soldAt = new Date().toISOString();
                }
                await db.collection('products').doc(id).update(updateData);
                showToast('Producto actualizado correctamente', 'success');
            } else {
                // Create new product
                const newData = {
                    ...data,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                if (data.status === 'vendido') {
                    newData.soldAt = new Date().toISOString();
                }
                await db.collection('products').add(newData);
                showToast('Producto creado exitosamente', 'success');
            }

            closeProductModal();
            // No need to call renderCurrentView() — onSnapshot listener handles it
        } catch (error) {
            console.error('Error guardando producto:', error);
            showToast('Error al guardar: ' + error.message, 'error');
        } finally {
            btnSaveProduct.disabled = false;
            btnSaveProduct.innerHTML = originalText;
        }
    }

    async function sellProduct(id) {
        try {
            await db.collection('products').doc(id).update({
                status: 'vendido',
                soldAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            });
            const p = products.find(x => x.id === id);
            showToast(`"${p ? p.name : 'Producto'}" marcado como vendido`, 'success');
        } catch (error) {
            console.error('Error al vender producto:', error);
            showToast('Error al marcar como vendido', 'error');
        }
    }

    function confirmDelete(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;
        confirmMessage.textContent = `¿Estás seguro de que deseas eliminar "${p.name}"?`;
        deleteCallback = async () => {
            try {
                await db.collection('products').doc(id).delete();
                showToast('Producto eliminado', 'success');
            } catch (error) {
                console.error('Error eliminando producto:', error);
                showToast('Error al eliminar producto', 'error');
            }
        };
        confirmModal.classList.add('active');
    }

    // ============================
    // Product Detail Modal
    // ============================
    function openDetail(id) {
        const p = products.find(x => x.id === id);
        if (!p) return;

        detailTitle.textContent = p.name;

        let imageHtml = '';
        if (p.image) {
            imageHtml = `<div class="detail-image"><img src="${escapeHtml(p.image)}" alt="${escapeHtml(p.name)}" onerror="this.parentElement.innerHTML='<svg width=48 height=48 viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;1.5&quot;><path d=&quot;M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z&quot;/></svg>'"></div>`;
        }

        const profit = (p.cost && p.status === 'vendido') ? (p.price - p.cost) : null;

        detailBody.innerHTML = `
            ${imageHtml}
            <div class="detail-grid">
                <div class="detail-field">
                    <div class="detail-field-label">Precio de Venta (ARS)</div>
                    <div class="detail-field-value" style="color: var(--accent-green); font-weight:700; font-size:1.1rem">${formatARS(p.price)}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-field-label">Estado</div>
                    <div class="detail-field-value"><span class="product-card-status status-${p.status}" style="position:static">${getStatusLabel(p.status)}</span></div>
                </div>
                <div class="detail-field">
                    <div class="detail-field-label">Categoría</div>
                    <div class="detail-field-value">${escapeHtml(p.category)}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-field-label">SKU / Código</div>
                    <div class="detail-field-value">${p.sku ? escapeHtml(p.sku) : '—'}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-field-label">Marca</div>
                    <div class="detail-field-value">${p.brand ? escapeHtml(p.brand) : '—'}</div>
                </div>
                <div class="detail-field">
                    <div class="detail-field-label">Cantidad</div>
                    <div class="detail-field-value">${p.quantity || 1}</div>
                </div>
                ${p.cost ? `
                <div class="detail-field">
                    <div class="detail-field-label">Costo en Chile (CLP)</div>
                    <div class="detail-field-value">${formatCLP(p.cost)}</div>
                </div>` : ''}
                ${p.buyer ? `
                <div class="detail-field full-width">
                    <div class="detail-field-label">Comprador</div>
                    <div class="detail-field-value">${escapeHtml(p.buyer)}</div>
                </div>` : ''}
                ${p.description ? `
                <div class="detail-field full-width">
                    <div class="detail-field-label">Descripción</div>
                    <div class="detail-field-value">${escapeHtml(p.description)}</div>
                </div>` : ''}
                ${p.notes ? `
                <div class="detail-field full-width">
                    <div class="detail-field-label">Notas</div>
                    <div class="detail-field-value">${escapeHtml(p.notes)}</div>
                </div>` : ''}
                <div class="detail-field">
                    <div class="detail-field-label">Fecha de Registro</div>
                    <div class="detail-field-value">${formatDate(p.createdAt)}</div>
                </div>
                ${p.soldAt ? `
                <div class="detail-field">
                    <div class="detail-field-label">Fecha de Venta</div>
                    <div class="detail-field-value">${formatDate(p.soldAt)}</div>
                </div>` : ''}
            </div>
            <div class="detail-actions">
                ${p.status !== 'vendido' ? `
                <button class="btn-primary btn-sm" id="detailSell">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                    Marcar Vendido
                </button>` : ''}
                <button class="btn-secondary btn-sm" id="detailEdit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Editar
                </button>
                <button class="btn-danger btn-sm" id="detailDelete" style="margin-left:auto">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    Eliminar
                </button>
            </div>
        `;

        // Attach detail actions
        const detailSellBtn = detailBody.querySelector('#detailSell');
        if (detailSellBtn) {
            detailSellBtn.addEventListener('click', () => {
                sellProduct(p.id);
                detailModal.classList.remove('active');
            });
        }

        const detailEditBtn = detailBody.querySelector('#detailEdit');
        if (detailEditBtn) {
            detailEditBtn.addEventListener('click', () => {
                detailModal.classList.remove('active');
                openEditModal(p.id);
            });
        }

        const detailDeleteBtn = detailBody.querySelector('#detailDelete');
        if (detailDeleteBtn) {
            detailDeleteBtn.addEventListener('click', () => {
                detailModal.classList.remove('active');
                confirmDelete(p.id);
            });
        }

        detailModal.classList.add('active');
    }

    // ============================
    // Helpers
    // ============================
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function closeMobileSidebar() {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    }

    // ============================
    // Event Listeners
    // ============================

    // Navigation
    $$('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.dataset.view);
        });
    });

    // Mobile sidebar
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        sidebarOverlay.classList.toggle('active');
    });

    sidebarOverlay.addEventListener('click', closeMobileSidebar);

    // Add product button
    btnAddProduct.addEventListener('click', openAddModal);

    // Product form
    productForm.addEventListener('submit', saveProduct);
    modalClose.addEventListener('click', closeProductModal);
    btnCancelProduct.addEventListener('click', closeProductModal);

    // Detail modal close
    detailClose.addEventListener('click', () => detailModal.classList.remove('active'));

    // Confirm delete
    btnCancelDelete.addEventListener('click', () => {
        confirmModal.classList.remove('active');
        deleteCallback = null;
    });
    btnConfirmDelete.addEventListener('click', async () => {
        if (deleteCallback) await deleteCallback();
        confirmModal.classList.remove('active');
        deleteCallback = null;
    });

    // Close modals on overlay click
    [productModal, detailModal, confirmModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });

    // Close modals on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            productModal.classList.remove('active');
            detailModal.classList.remove('active');
            confirmModal.classList.remove('active');
        }
    });

    // Search
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => renderCurrentView(), 200);
    });

    // Filters
    filterCategory.addEventListener('change', renderProducts);
    filterStatus.addEventListener('change', renderProducts);
    filterSort.addEventListener('change', renderProducts);

    // Add Category
    async function addCategory() {
        const name = newCategoryInput.value.trim();
        if (!name) {
            showToast('Escribe un nombre para la categoría', 'error');
            return;
        }
        if (categories.some(c => c.toLowerCase() === name.toLowerCase())) {
            showToast('Esa categoría ya existe', 'error');
            return;
        }
        categories.push(name);
        try {
            await db.collection('config').doc('categories').set({ list: categories });
            newCategoryInput.value = '';
            showToast(`Categoría "${name}" creada`, 'success');
        } catch (error) {
            categories.pop(); // Revert on error
            console.error('Error creando categoría:', error);
            showToast('Error al crear categoría', 'error');
        }
    }

    btnAddCategory.addEventListener('click', addCategory);
    newCategoryInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCategory();
        }
    });

    // ============================
    // Initialize
    // ============================
    setupImageUpload();

    // The initial render is handled by checkInitialLoad()
    // which fires when both Firestore listeners have loaded data.
})();
