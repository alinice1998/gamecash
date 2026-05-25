// C:\xampp2\htdocs\gamecash\gamecash-web\js\app.js

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================================================
    // 1. STATE MANAGEMENT
    // ==========================================================================
    const state = {
        user: null,
        activeTab: 'dashboard',
        customers: [],
        products: [],
        telecomCompanies: [],
        cart: [],
        chart: null
    };

    // ==========================================================================
    // 2. DOM ELEMENTS
    // ==========================================================================
    const dom = {
        loginOverlay: document.getElementById('login-overlay'),
        appShell: document.getElementById('app-shell'),
        loginForm: document.getElementById('login-form'),
        logoutBtn: document.getElementById('logout-btn'),
        displayUsername: document.getElementById('display-username'),
        viewTitle: document.getElementById('view-title'),
        mobileToggle: document.getElementById('mobile-toggle'),
        sidebar: document.querySelector('.sidebar'),
        
        // Navigation
        navItems: document.querySelectorAll('.nav-item'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        
        // Header
        headerCashSafe: document.getElementById('header-cash-safe'),
        
        // Dashboard Stats
        dashCashSafe: document.getElementById('dash-cash-safe'),
        dashTotalDebts: document.getElementById('dash-total-debts'),
        dashTodaySales: document.getElementById('dash-today-sales'),
        dashTodayCashSales: document.getElementById('dash-today-cash-sales'),
        dashTodayDebtSales: document.getElementById('dash-today-debt-sales'),
        dashTodayNetCash: document.getElementById('dash-today-net-cash'),
        
        // Dashboard Alerts & Lists
        lowStockAlertBar: document.getElementById('low-stock-alert-bar'),
        lowStockAlertText: document.getElementById('low-stock-alert-text'),
        viewLowStockBtn: document.getElementById('view-low-stock-btn'),
        recentSalesList: document.getElementById('recent-sales-list'),
        recentPaymentsList: document.getElementById('recent-payments-list'),
        recentExpensesList: document.getElementById('recent-expenses-list'),
        
        // Shopping Cart Elements
        cartEmpty: document.getElementById('cart-empty'),
        cartItems: document.getElementById('cart-items'),
        cartTotal: document.getElementById('cart-total'),
        checkoutForm: document.getElementById('checkout-form'),
        checkoutCustomerGroup: document.getElementById('checkout-customer-group'),
        checkoutSplitGroup: document.getElementById('checkout-split-group'),
        cartCustomer: document.getElementById('cart-customer'),
        cartPaidAmount: document.getElementById('cart-paid-amount'),
        cartDebtAmount: document.getElementById('cart-debt-amount'),
        cartNotes: document.getElementById('cart-notes'),
        checkoutBtn: document.getElementById('checkout-btn'),
        clearCartBtn: document.getElementById('clear-cart-btn'),
        btnQuickAddCustomer: document.getElementById('btn-quick-add-customer'),
        
        // Cart Catalog Inputs
        catalogSnacksGrid: document.getElementById('catalog-snacks-grid'),
        catalogSnacksSearch: document.getElementById('catalog-snacks-search'),
        telCompanySelect: document.getElementById('tel-company'),
        telCartForm: document.getElementById('telecom-cart-form'),
        customCartForm: document.getElementById('custom-cart-form'),
        chamcashCartForm: document.getElementById('chamcash-cart-form'),
        
        // Customers Tab
        customersTableBody: document.getElementById('customers-table-body'),
        customersSearch: document.getElementById('customers-search'),
        btnAddCustomer: document.getElementById('btn-add-customer'),
        payoffCustomer: document.getElementById('payoff-customer'),
        payoffDebtPreviewBox: document.getElementById('payoff-debt-preview-box'),
        payoffCurrentDebtVal: document.getElementById('payoff-current-debt-val'),
        payoffAmount: document.getElementById('payoff-amount'),
        payoffNotes: document.getElementById('payoff-notes'),
        payoffSubmitBtn: document.getElementById('payoff-submit-btn'),
        payoffForm: document.getElementById('payoff-form'),
        payoffLogsList: document.getElementById('payoff-logs-list'),
        
        // Products Tab
        inventoryTableBody: document.getElementById('inventory-table-body'),
        inventorySearch: document.getElementById('inventory-search'),
        btnHardAddProduct: document.getElementById('btn-add-product'),
        
        // Telecom Tab
        telecomCompaniesRow: document.getElementById('telecom-companies-row'),
        telecomLogsTableBody: document.getElementById('telecom-logs-table-body'),
        btnHardAddTelecom: document.getElementById('btn-add-telecom-company'),
        
        // Expenses Tab
        expenseForm: document.getElementById('expense-form'),
        expensesTableBody: document.getElementById('expenses-table-body'),
        
        // Records Tab
        recordsTableBody: document.getElementById('records-table-body'),
        recordsSearch: document.getElementById('records-search'),
        btnRefreshRecords: document.getElementById('btn-refresh-records'),
        btnDeleteAllRecords: document.getElementById('btn-delete-all-records')
    };

    // ==========================================================================
    // 3. INITIALIZATION & AUTH CHECKS
    // ==========================================================================
    async function initApp() {
        const token = api.getToken();
        if (token) {
            try {
                const response = await api.get('api/auth/check');
                if (response.success) {
                    state.user = response.data;
                    loginSuccess(response.data);
                } else {
                    showLoginScreen();
                }
            } catch (err) {
                showLoginScreen();
            }
        } else {
            showLoginScreen();
        }
    }

    function showLoginScreen() {
        dom.loginOverlay.classList.remove('hidden');
        dom.appShell.classList.add('hidden');
        api.clearAuth();
    }

    function loginSuccess(user) {
        state.user = user;
        dom.displayUsername.textContent = user.username;
        dom.loginOverlay.classList.add('hidden');
        dom.appShell.classList.remove('hidden');
        
        // Load default views
        switchTab('dashboard');
        loadAllCommonData();
    }

    // Load initial listings from backend
    async function loadAllCommonData() {
        try {
            await Promise.all([
                loadCustomers(),
                loadProducts(),
                loadTelecomCompanies()
            ]);
        } catch (err) {
            console.error("Error loading system core registries:", err);
        }
    }

    // ==========================================================================
    // 4. AUTH EVENTS
    // ==========================================================================
    dom.loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        const loginBtn = document.getElementById('login-btn');
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<span>جاري التحقق...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;

        try {
            const response = await api.post('api/auth/login', { username, password });
            if (response.success) {
                api.setToken(response.data.token);
                loginSuccess(response.data.user);
                Swal.fire({
                    icon: 'success',
                    title: 'أهلاً بك مجدداً!',
                    text: `مرحباً ${response.data.user.username}، تم الدخول بنجاح.`,
                    timer: 2000,
                    showConfirmButton: false,
                    toast: true,
                    position: 'top-end'
                });
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'فشل تسجيل الدخول',
                text: err.message,
                confirmButtonText: 'حسناً'
            });
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = `<span>تسجيل الدخول</span> <i class="fa-solid fa-right-to-bracket"></i>`;
        }
    });

    dom.logoutBtn.addEventListener('click', async () => {
        const confirm = await Swal.fire({
            title: 'هل ترغب في تسجيل الخروج؟',
            text: "سيتوجب عليك إدخال كلمة المرور للعودة مجدداً.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#6366f1',
            cancelButtonColor: '#d33',
            confirmButtonText: 'نعم، تسجيل الخروج',
            cancelButtonText: 'إلغاء'
        });

        if (confirm.isConfirmed) {
            try {
                await api.post('api/auth/logout');
            } catch (e) {}
            showLoginScreen();
            Swal.fire({
                icon: 'info',
                title: 'تم تسجيل الخروج',
                timer: 1500,
                showConfirmButton: false,
                toast: true,
                position: 'top-end'
            });
        }
    });

    // ==========================================================================
    // 5. SIDEBAR NAVIGATION CONTROLS
    // ==========================================================================
    dom.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
            
            // Close mobile sidebar if open
            dom.sidebar.classList.remove('open');
        });
    });

    dom.mobileToggle.addEventListener('click', () => {
        dom.sidebar.classList.toggle('open');
    });

    function switchTab(tabName) {
        state.activeTab = tabName;
        
        // Sidebar active classes
        dom.navItems.forEach(item => {
            if (item.getAttribute('data-tab') === tabName) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        // Toggle Views
        dom.tabPanes.forEach(pane => {
            if (pane.id === `pane-${tabName}`) {
                pane.classList.add('active');
            } else {
                pane.classList.remove('remove', 'active');
            }
        });

        // Set dynamic titles
        const titles = {
            'dashboard': 'لوحة التحكم والإحصائيات الكلية',
            'sales': 'إنشاء عملية بيع (أكلات، رصيد، ولعب مخصص)',
            'customers': 'دليل العملاء والديون القائمة وسدادها',
            'products': 'مخزن المأكولات والمشروبات والمستودع',
            'telecom': 'شحن رصيد الجوال لشركات الاتصال',
            'expenses': 'المصاريف اليومية والمشتريات'
        };
        
        dom.viewTitle.textContent = titles[tabName] || 'الرئيسية';
        
        // Dispatch data reload based on active tab
        dispatchTabLoad(tabName);
    }

    function dispatchTabLoad(tabName) {
        switch(tabName) {
            case 'dashboard':
                loadDashboardData();
                break;
            case 'records':
                loadRecords();
                break;
            case 'sales':
                renderCart();
                renderSnackCatalog();
                populateDropdowns();
                break;
            case 'customers':
                renderCustomersList();
                populatePayoffDropdown();
                loadPayoffHistory();
                break;
            case 'products':
                renderProductsInventory();
                break;
            case 'telecom':
                renderTelecomDashboard();
                break;
            case 'expenses':
                loadExpensesTable();
                break;
        }
    }

    // ==========================================================================
    // 6. SHARED API UTILS (CUSTOMERS, PRODUCTS, TELECOM)
    // ==========================================================================
    async function loadCustomers() {
        const res = await api.get('api/customers');
        if (res.success) {
            state.customers = res.data;
        }
    }

    async function loadProducts() {
        const res = await api.get('api/products');
        if (res.success) {
            state.products = res.data;
        }
    }

    async function loadTelecomCompanies() {
        const res = await api.get('api/telecom');
        if (res.success) {
            state.telecomCompanies = res.data;
        }
    }

    function populateDropdowns() {
        // Customers dropdown in Cart
        dom.cartCustomer.innerHTML = '<option value="">-- اختر العميل المدين *</option>';
        state.customers.forEach(c => {
            const debtInfo = parseFloat(c.total_debt) > 0 ? ` (دين قائم: ${c.total_debt} ل.س)` : ' (لا يوجد ديون)';
            dom.cartCustomer.innerHTML += `<option value="${c.id}">${c.name}${debtInfo}</option>`;
        });

        // Telecom Companies dropdown in Cart
        dom.telCompanySelect.innerHTML = '<option value="">-- اختر شركة اتصالات --</option>';
        state.telecomCompanies.forEach(t => {
            dom.telCompanySelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
        });
    }

    // ==========================================================================
    // 7. DASHBOARD DATA & CHART rendering
    // ==========================================================================
    async function loadDashboardData() {
        try {
            const res = await api.get('api/dashboard');
            if (res.success) {
                const data = res.data;
                
                // Set balances
                dom.headerCashSafe.innerHTML = `${formatNumber(data.cash_safe)} <span class="currency">ل.س</span>`;
                dom.dashCashSafe.textContent = formatNumber(data.cash_safe) + " ل.س";
                dom.dashTotalDebts.textContent = formatNumber(data.total_debts) + " ل.س";
                dom.dashTodaySales.textContent = formatNumber(data.today.sales_total) + " ل.س";
                dom.dashTodayCashSales.textContent = formatNumber(data.today.sales_cash) + " ل.س";
                dom.dashTodayDebtSales.textContent = formatNumber(data.today.sales_debt) + " ل.س";
                dom.dashTodayNetCash.textContent = formatNumber(data.today.net_cash) + " ل.س";
                
                // Colorize the Net Surplus indicator
                if (data.today.net_cash >= 0) {
                    dom.dashTodayNetCash.parentElement.parentElement.classList.remove('card-debt');
                    dom.dashTodayNetCash.parentElement.parentElement.classList.add('card-surplus');
                } else {
                    dom.dashTodayNetCash.parentElement.parentElement.classList.remove('card-surplus');
                    dom.dashTodayNetCash.parentElement.parentElement.classList.add('card-debt');
                }

                // Low Stock Alarm
                if (data.warnings.low_stock_count > 0) {
                    dom.lowStockAlertBar.classList.remove('hidden');
                    dom.lowStockAlertText.textContent = `تنبيه! هناك عدد ${data.warnings.low_stock_count} منتج شارف على النفاد في المستودع (أقل من 5 وحدات).`;
                } else {
                    dom.lowStockAlertBar.classList.add('hidden');
                }

                // Recent sales list
                dom.recentSalesList.innerHTML = '';
                if (data.recent_sales.length > 0) {
                    data.recent_sales.forEach(s => {
                        const clientName = s.customer_name || 'زبون نقدي (كاش)';
                        const formattedDate = formatDateString(s.created_at);
                        dom.recentSalesList.innerHTML += `
                            <tr>
                                <td><b>${clientName}</b></td>
                                <td class="number-font text-left">${formatNumber(s.total_amount)}</td>
                                <td class="number-font text-left text-success">${formatNumber(s.paid_amount)}</td>
                                <td class="number-font text-left text-danger">${formatNumber(s.debt_amount)}</td>
                                <td class="number-font text-left">${formattedDate}</td>
                            </tr>
                        `;
                    });
                } else {
                    dom.recentSalesList.innerHTML = '<tr><td colspan="5" class="text-center">لا توجد عمليات بيع مسجلة اليوم.</td></tr>';
                }

                // Recent payoffs list
                dom.recentPaymentsList.innerHTML = '';
                if (data.recent_payments.length > 0) {
                    data.recent_payments.forEach(p => {
                        const formattedDate = formatDateString(p.created_at);
                        dom.recentPaymentsList.innerHTML += `
                            <tr>
                                <td><b>${p.customer_name}</b></td>
                                <td class="number-font text-left text-success">+${formatNumber(p.amount_paid)}</td>
                                <td>${p.notes || '-'}</td>
                                <td class="number-font text-left">${formattedDate}</td>
                            </tr>
                        `;
                    });
                } else {
                    dom.recentPaymentsList.innerHTML = '<tr><td colspan="4" class="text-center">لا توجد عمليات سداد ديون اليوم.</td></tr>';
                }

                // Recent expenses
                dom.recentExpensesList.innerHTML = '';
                if (data.recent_expenses.length > 0) {
                    data.recent_expenses.forEach(e => {
                        const formattedDate = formatDateString(e.created_at);
                        dom.recentExpensesList.innerHTML += `
                            <tr>
                                <td><span class="badge badge-danger">${e.category}</span></td>
                                <td class="number-font text-left text-danger">-${formatNumber(e.amount)}</td>
                                <td>${e.notes || '-'}</td>
                                <td class="number-font text-left">${formattedDate}</td>
                            </tr>
                        `;
                    });
                } else {
                    dom.recentExpensesList.innerHTML = '<tr><td colspan="4" class="text-center">لا توجد مصاريف مسجلة اليوم.</td></tr>';
                }

                // Render Chart
                renderFinancialsChart(data.chart_data);
            }
        } catch (err) {
            console.error("Dashboard calculation failed:", err);
        }
    }

    // Dashboard Subtab switcher
    document.querySelectorAll('.sub-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const container = btn.parentElement;
            container.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetTab = btn.getAttribute('data-subtab');
            const subtabPanes = ['recent-sales', 'recent-payoffs', 'recent-expenses'];
            subtabPanes.forEach(paneName => {
                const paneEl = document.getElementById(`subtab-${paneName}`);
                if (paneName === targetTab) {
                    paneEl.classList.remove('hidden');
                } else {
                    paneEl.classList.add('hidden');
                }
            });
        });
    });

    dom.viewLowStockBtn.addEventListener('click', () => {
        switchTab('products');
        dom.inventorySearch.value = '';
    });

    function renderFinancialsChart(chartData) {
        if (typeof Chart === 'undefined') {
            console.warn("Chart.js is not loaded. Skipping chart rendering.");
            const canvasEl = document.getElementById('financialsChart');
            if (canvasEl) {
                const parent = canvasEl.parentElement;
                parent.innerHTML = '<div class="text-muted text-center" style="padding: 40px 0; color: #9ca3af; font-family: Cairo;"><i class="fa-solid fa-chart-line" style="font-size: 2rem; margin-bottom: 10px; color: #6366f1;"></i><p>المخطط البياني غير متوفر في وضع عدم الاتصال (تعذر تحميل مكتبة Chart.js)</p></div>';
            }
            return;
        }

        if (state.chart) {
            state.chart.destroy();
        }

        const labels = chartData.map(d => d.label);
        const sales = chartData.map(d => d.sales);
        const expenses = chartData.map(d => d.expenses);

        const ctx = document.getElementById('financialsChart').getContext('2d');
        state.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'المبيعات اليومية (ل.س)',
                        data: sales,
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'المصاريف والمدفوعات (ل.س)',
                        data: expenses,
                        borderColor: '#f43f5e',
                        backgroundColor: 'rgba(244, 63, 94, 0.05)',
                        borderWidth: 2,
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: {
                            color: '#9ca3af',
                            font: { family: 'Cairo' }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255, 255, 255, 0.03)' },
                        ticks: { color: '#9ca3af', font: { family: 'Cairo' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.03)' },
                        ticks: { color: '#9ca3af', font: { family: 'Outfit' } }
                    }
                }
            }
        });
    }

    // ==========================================================================
    // 8. SALES AND SHOPPING CART STATE MACHINE
    // ==========================================================================
    
    // Switch between Snacks Catalog, Telecom form, Custom items
    document.querySelectorAll('.catalog-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const container = btn.parentElement;
            container.querySelectorAll('.catalog-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const targetCatalog = btn.getAttribute('data-catalog');
            const catalogPanes = ['snacks', 'telecom', 'custom', 'chamcash'];
            catalogPanes.forEach(paneName => {
                const paneEl = document.getElementById(`catalog-${paneName}`);
                if (paneName === targetCatalog) {
                    paneEl.classList.remove('hidden');
                } else {
                    paneEl.classList.add('hidden');
                }
            });
        });
    });

    // A. SNACKS CATALOG SEARCH
    dom.catalogSnacksSearch.addEventListener('input', () => {
        renderSnackCatalog();
    });

    // Populate catalog grid with snacks from inventory
    function renderSnackCatalog() {
        dom.catalogSnacksGrid.innerHTML = '';
        const searchVal = dom.catalogSnacksSearch.value.toLowerCase().trim();

        const filtered = state.products.filter(p => 
            p.name.toLowerCase().includes(searchVal) || 
            (p.category && p.category.toLowerCase().includes(searchVal))
        );

        if (filtered.length > 0) {
            filtered.forEach(p => {
                const stock = parseInt(p.stock);
                let stockClass = '';
                let stockText = `المتوفر: ${stock}`;
                
                if (stock <= 0) {
                    stockClass = 'out-of-stock';
                    stockText = 'نفدت الكمية';
                } else if (stock <= 5) {
                    stockClass = 'low-stock';
                    stockText = `متبقي: ${stock} (قليل)`;
                }

                const cardHtml = `
                    <div class="product-catalog-card glass-panel" data-id="${p.id}">
                        <div class="prod-card-header">
                            <span class="prod-card-category">${p.category === 'drink' ? 'مشروب' : 'أكلة'}</span>
                            <span class="prod-card-stock ${stockClass}">${stockText}</span>
                        </div>
                        <h4 class="prod-card-title">${p.name}</h4>
                        <div class="prod-card-footer">
                            <span class="prod-card-price number-font">${formatNumber(p.selling_price)} ل.س</span>
                            <div class="prod-card-add-icon"><i class="fa-solid fa-cart-plus"></i></div>
                        </div>
                    </div>
                `;

                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = cardHtml;
                const cardNode = tempDiv.firstElementChild;

                // Add to cart on click (if in stock)
                cardNode.addEventListener('click', () => {
                    if (stock <= 0) {
                        Swal.fire({
                            icon: 'warning',
                            title: 'المنتج غير متوفر',
                            text: 'نفدت الكمية من هذا المنتج في المخزن حالياً، يرجى تزويد المخزون أولاً.',
                            confirmButtonText: 'حسناً'
                        });
                        return;
                    }
                    addToCart('product', p);
                });

                dom.catalogSnacksGrid.appendChild(cardNode);
            });
        } else {
            dom.catalogSnacksGrid.innerHTML = '<p class="text-muted text-center" style="grid-column: 1/-1; padding: 40px 0;">لا توجد منتجات مطابقة للبحث.</p>';
        }
    }

    // B. ADD TELECOM BALANCE TO CART
    dom.telCartForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const customerPrice = parseFloat(document.getElementById('tel-price').value);

        if (isNaN(customerPrice) || customerPrice <= 0) {
            showToastError("يرجى إدخال سعر صحيح.");
            return;
        }

        const telecomItem = {
            type: 'telecom',
            company_id: null,
            company_name: 'شحن رصيد',
            phone: null,
            amount: null,
            price: customerPrice
        };

        addToCart('telecom', telecomItem);

        // Reset inputs
        document.getElementById('tel-price').value = '';
        
        // Notify
        showToastSuccess("تم إضافة تحويل الرصيد للسلة.");
    });

    // C. ADD MANUAL CUSTOM ITEM TO CART
    dom.customCartForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const customName = document.getElementById('cust-name').value.trim();
        const price = parseFloat(document.getElementById('cust-price').value);
        const qty = parseInt(document.getElementById('cust-qty').value);

        if (empty(customName) || isNaN(price) || qty <= 0) return;

        const customItem = {
            type: 'custom',
            name: customName,
            price: price,
            qty: qty
        };

        addToCart('custom', customItem);

        // Reset
        document.getElementById('cust-name').value = '';
        document.getElementById('cust-price').value = '';
        document.getElementById('cust-qty').value = '1';

        showToastSuccess("تم إضافة البند المخصص للسلة.");
    });

    // C-2. ADD CHAM CASH ITEM TO CART
    if (dom.chamcashCartForm) {
        dom.chamcashCartForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const price = parseFloat(document.getElementById('chamcash-price').value);

            if (isNaN(price) || price <= 0) return;

            const chamcashItem = {
                type: 'custom',
                name: `تحويل شام كاش`,
                price: price,
                qty: 1
            };

            addToCart('custom', chamcashItem);

            // Reset
            document.getElementById('chamcash-price').value = '';

            showToastSuccess("تم إضافة تحويل شام كاش للسلة.");
        });
    }

    // D. GLOBAL SHOPPING CART ENGINE
    function addToCart(type, payload) {
        if (type === 'product') {
            const product = payload;
            
            // Check if already in cart
            const existing = state.cart.find(item => item.type === 'product' && item.product_id === product.id);
            if (existing) {
                // Check stock limit
                if (existing.quantity + 1 > parseInt(product.stock)) {
                    Swal.fire({
                        icon: 'error',
                        title: 'تجاوز الكمية المتوفرة',
                        text: `المتوفر في المخزن ${product.stock} وحدات فقط من ${product.name}.`,
                        confirmButtonText: 'حسناً'
                    });
                    return;
                }
                existing.quantity++;
                existing.total_price = existing.quantity * existing.price_per_unit;
            } else {
                state.cart.push({
                    type: 'product',
                    product_id: product.id,
                    name: product.name,
                    quantity: 1,
                    price_per_unit: parseFloat(product.selling_price),
                    total_price: parseFloat(product.selling_price)
                });
            }
            showToastSuccess(`تم إضافة ${product.name} للسلة.`);
        } 
        
        else if (type === 'telecom') {
            const tel = payload;
            // Balance transfer is a unique transaction per number usually, so we add a separate entry
            state.cart.push({
                type: 'telecom',
                telecom_company_id: tel.company_id,
                telecom_phone: tel.phone,
                telecom_amount: tel.amount,
                name: `تحويل رصيد (شحن)`,
                quantity: 1,
                price_per_unit: tel.price,
                total_price: tel.price
            });
        } 
        
        else if (type === 'custom') {
            const cust = payload;
            state.cart.push({
                type: 'custom',
                custom_name: cust.name,
                name: cust.name,
                quantity: cust.qty,
                price_per_unit: cust.price,
                total_price: cust.price * cust.qty
            });
        }

        renderCart();
    }

    function updateCartQty(index, increment) {
        const item = state.cart[index];
        if (!item) return;

        if (item.type === 'product') {
            const orig = state.products.find(p => p.id === item.product_id);
            const stock = orig ? parseInt(orig.stock) : 999;

            if (increment > 0 && item.quantity + 1 > stock) {
                Swal.fire({
                    icon: 'warning',
                    title: 'تجاوز كمية المخزن',
                    text: `لا يمكنك إضافة المزيد. المتوفر: ${stock}`,
                    confirmButtonText: 'حسناً'
                });
                return;
            }
        }

        item.quantity += increment;
        if (item.quantity <= 0) {
            state.cart.splice(index, 1);
        } else {
            item.total_price = item.quantity * item.price_per_unit;
        }

        renderCart();
    }

    function removeCartItem(index) {
        state.cart.splice(index, 1);
        renderCart();
    }

    dom.clearCartBtn.addEventListener('click', () => {
        state.cart = [];
        renderCart();
    });

    // Render cart elements and update calculations
    function renderCart() {
        dom.cartItems.innerHTML = '';

        if (state.cart.length === 0) {
            dom.cartEmpty.classList.remove('hidden');
            dom.cartItems.classList.add('hidden');
            dom.checkoutBtn.disabled = true;
            dom.cartTotal.textContent = '0.00 ل.س';
            
            // Force payment reset
            document.getElementById('pay-cash-only').checked = true;
            togglePaymentMethodInputs('cash');
            return;
        }

        dom.cartEmpty.classList.add('hidden');
        dom.cartItems.classList.remove('hidden');
        dom.checkoutBtn.disabled = false;

        let totalSum = 0.00;

        state.cart.forEach((item, index) => {
            totalSum += item.total_price;
            
            let metaText = '';
            if (item.type === 'product') {
                metaText = '<i class="fa-solid fa-tag"></i> مأكولات ومشروبات';
            } else if (item.type === 'telecom') {
                if (item.telecom_amount) {
                    metaText = `<i class="fa-solid fa-mobile"></i> شحن رصيد بقيمة ${formatNumber(item.telecom_amount)} وحدات`;
                } else {
                    metaText = `<i class="fa-solid fa-mobile"></i> تحويل رصيد (شحن)`;
                }
            } else {
                metaText = '<i class="fa-solid fa-circle-play"></i> خدمة/لعب مخصص يدوياً';
            }

            const itemHtml = `
                <div class="cart-item">
                    <div class="cart-item-details">
                        <span class="cart-item-name">${item.name}</span>
                        <span class="cart-item-meta">${metaText}</span>
                    </div>
                    
                    <div class="cart-item-qty-control">
                        <button type="button" class="btn-minus" data-index="${index}"><i class="fa-solid fa-minus"></i></button>
                        <span class="cart-item-qty number-font">${item.quantity}</span>
                        <button type="button" class="btn-plus" data-index="${index}"><i class="fa-solid fa-plus"></i></button>
                    </div>

                    <div class="cart-item-price-box">
                        <span class="cart-item-price number-font">${formatNumber(item.total_price)} ل.س</span>
                        <button type="button" class="cart-item-remove" data-index="${index}"><i class="fa-solid fa-trash-can"></i></button>
                    </div>
                </div>
            `;

            dom.cartItems.innerHTML += itemHtml;
        });

        dom.cartTotal.textContent = `${formatNumber(totalSum)} ل.س`;

        // Attach listeners dynamically
        dom.cartItems.querySelectorAll('.btn-minus').forEach(btn => {
            btn.addEventListener('click', () => updateCartQty(parseInt(btn.getAttribute('data-index')), -1));
        });
        dom.cartItems.querySelectorAll('.btn-plus').forEach(btn => {
            btn.addEventListener('click', () => updateCartQty(parseInt(btn.getAttribute('data-index')), 1));
        });
        dom.cartItems.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => removeCartItem(parseInt(btn.getAttribute('data-index'))));
        });

        // Recalculate payment splits
        recalculatePaymentSplit(totalSum);
    }

    // Payment Methods toggler
    document.getElementsByName('payment_type').forEach(radio => {
        radio.addEventListener('change', (e) => {
            togglePaymentMethodInputs(e.target.value);
        });
    });

    function togglePaymentMethodInputs(method) {
        const total = getCartTotalValue();

        if (method === 'cash') {
            dom.checkoutCustomerGroup.classList.add('hidden');
            dom.checkoutSplitGroup.classList.add('hidden');
            dom.cartPaidAmount.value = total;
            dom.cartDebtAmount.value = 0;
            dom.cartCustomer.required = false;
        } 
        
        else if (method === 'debt') {
            dom.checkoutCustomerGroup.classList.remove('hidden');
            dom.checkoutSplitGroup.classList.add('hidden');
            dom.cartPaidAmount.value = 0;
            dom.cartDebtAmount.value = total;
            dom.cartCustomer.required = true;
        } 
        
        else if (method === 'split') {
            dom.checkoutCustomerGroup.classList.remove('hidden');
            dom.checkoutSplitGroup.classList.remove('hidden');
            
            // Set 50/50 default
            const half = Math.floor(total / 2);
            dom.cartPaidAmount.value = half;
            dom.cartDebtAmount.value = total - half;
            dom.cartCustomer.required = true;
        }
    }

    dom.cartPaidAmount.addEventListener('input', () => {
        const total = getCartTotalValue();
        let paid = parseFloat(dom.cartPaidAmount.value) || 0;
        
        if (paid > total) {
            paid = total;
            dom.cartPaidAmount.value = total;
        }
        if (paid < 0) {
            paid = 0;
            dom.cartPaidAmount.value = 0;
        }

        dom.cartDebtAmount.value = total - paid;
    });

    function getCartTotalValue() {
        return state.cart.reduce((sum, item) => sum + item.total_price, 0);
    }

    function recalculatePaymentSplit(total) {
        const checkedMethod = document.querySelector('input[name="payment_type"]:checked').value;
        togglePaymentMethodInputs(checkedMethod);
    }

    // E. SUBMIT CHECKOUT TRANSACTION
    dom.checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const paymentType = document.querySelector('input[name="payment_type"]:checked').value;
        const customerId = dom.cartCustomer.value;
        const totalAmount = getCartTotalValue();
        const paidAmount = parseFloat(dom.cartPaidAmount.value) || 0;
        const debtAmount = parseFloat(dom.cartDebtAmount.value) || 0;
        const notes = dom.cartNotes.value.trim();

        if (paymentType !== 'cash' && !customerId) {
            Swal.fire({
                icon: 'warning',
                title: 'تحديد العميل مطلوب',
                text: 'الرجاء اختيار العميل المسؤول عن الدين القائم في الفاتورة.',
                confirmButtonText: 'حسناً'
            });
            return;
        }

        const confirm = await Swal.fire({
            title: 'تأكيد عملية البيع؟',
            html: `إجمالي الفاتورة: <b>${formatNumber(totalAmount)} ل.س</b><br>
                   المدفوع كاش: <span class="text-success">${formatNumber(paidAmount)} ل.س</span><br>
                   المسجل دين: <span class="text-danger">${formatNumber(debtAmount)} ل.س</span>`,
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#10b981',
            cancelButtonColor: '#d33',
            confirmButtonText: 'نعم، تأكيد وحفظ',
            cancelButtonText: 'إلغاء'
        });

        if (!confirm.isConfirmed) return;

        dom.checkoutBtn.disabled = true;
        dom.checkoutBtn.innerHTML = `<span>جاري معالجة الفاتورة...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;

        try {
            const response = await api.post('api/sales', {
                customer_id: customerId || null,
                paid_amount: paidAmount,
                debt_amount: debtAmount,
                notes: notes,
                items: state.cart
            });

            if (response.success) {
                // Clear cart
                state.cart = [];
                dom.cartNotes.value = '';
                
                // Show printable receipt in SweetAlert
                await Swal.fire({
                    icon: 'success',
                    title: 'تم تسجيل عملية البيع!',
                    text: 'تم خصم الأكلات من المخزن وتحديث حساب الخزنة والديون بنجاح.',
                    confirmButtonText: 'ممتاز'
                });

                // Reload data and back to dashboard
                await loadAllCommonData();
                switchTab('dashboard');
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'فشل إتمام العملية',
                text: err.message,
                confirmButtonText: 'متابعة'
            });
        } finally {
            dom.checkoutBtn.disabled = false;
            dom.checkoutBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>تأكيد وطباعة عملية البيع</span>`;
        }
    });

    // F. QUICK ADD CUSTOMER IN CART WINDOW
    dom.btnQuickAddCustomer.addEventListener('click', async () => {
        await triggerAddNewCustomerPopup();
        populateDropdowns();
    });

    // ==========================================================================
    // 9. CUSTOMERS AND DEBTS ENGINE
    // ==========================================================================
    dom.customersSearch.addEventListener('input', renderCustomersList);
    dom.btnAddCustomer.addEventListener('click', async () => {
        await triggerAddNewCustomerPopup();
        renderCustomersList();
        populatePayoffDropdown();
    });

    async function triggerAddNewCustomerPopup() {
        const { value: formValues } = await Swal.fire({
            title: 'إضافة عميل جديد لقائمة الديون',
            html:
                '<input id="swal-cust-name" class="swal2-input" placeholder="اسم العميل الرباعي/الكامل *" style="direction:rtl;">' +
                '<input id="swal-cust-phone" class="swal2-input" placeholder="رقم هاتف الجوال (اختياري)" style="direction:rtl;">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'إضافة الزبون',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const name = document.getElementById('swal-cust-name').value.trim();
                const phone = document.getElementById('swal-cust-phone').value.trim();
                if (empty(name)) {
                    Swal.showValidationMessage('الاسم مطلوب لإضافة العميل.');
                }
                return { name, phone };
            }
        });

        if (formValues) {
            try {
                const res = await api.post('api/customers', formValues);
                if (res.success) {
                    showToastSuccess("تم إضافة العميل الجديد.");
                    await loadCustomers();
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'خطأ في الإضافة', text: err.message });
            }
        }
    }

    function renderCustomersList() {
        dom.customersTableBody.innerHTML = '';
        const searchVal = dom.customersSearch.value.toLowerCase().trim();

        const filtered = state.customers.filter(c => 
            c.name.toLowerCase().includes(searchVal) || 
            (c.phone && c.phone.includes(searchVal))
        );

        if (filtered.length > 0) {
            filtered.forEach(c => {
                const debt = parseFloat(c.total_debt);
                const debtBadge = debt > 0 
                    ? `<span class="badge badge-danger number-font" style="font-size:13px; padding:6px 10px;">${formatNumber(debt)} ل.س</span>`
                    : '<span class="badge badge-success">خالي من الديون</span>';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><b>${c.name}</b></td>
                    <td class="number-font">${c.phone || '-'}</td>
                    <td>${debtBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning btn-edit-cust" data-id="${c.id}"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
                        <button class="btn btn-sm btn-outline-danger btn-del-cust" data-id="${c.id}"><i class="fa-solid fa-trash"></i> حذف</button>
                    </td>
                `;

                // Edit Customer Button Listener
                row.querySelector('.btn-edit-cust').addEventListener('click', () => editCustomerDetails(c));
                // Delete Customer Button Listener
                row.querySelector('.btn-del-cust').addEventListener('click', () => deleteCustomerRegistry(c.id));

                dom.customersTableBody.appendChild(row);
            });
        } else {
            dom.customersTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">لا يوجد زبائن مطابقين للبحث.</td></tr>';
        }
    }

    async function editCustomerDetails(cust) {
        const { value: formValues } = await Swal.fire({
            title: 'تعديل بيانات العميل',
            html:
                `<input id="swal-cust-name-edit" class="swal2-input" value="${cust.name}" placeholder="اسم العميل *" style="direction:rtl;">` +
                `<input id="swal-cust-phone-edit" class="swal2-input" value="${cust.phone || ''}" placeholder="رقم هاتف الجوال" style="direction:rtl;">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'تعديل وحفظ',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const name = document.getElementById('swal-cust-name-edit').value.trim();
                const phone = document.getElementById('swal-cust-phone-edit').value.trim();
                if (empty(name)) {
                    Swal.showValidationMessage('الاسم مطلوب.');
                }
                return { id: cust.id, name, phone };
            }
        });

        if (formValues) {
            try {
                const res = await api.put('api/customers', formValues);
                if (res.success) {
                    showToastSuccess("تم تحديث بيانات الزبون.");
                    await loadCustomers();
                    renderCustomersList();
                    populatePayoffDropdown();
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'خطأ في التعديل', text: err.message });
            }
        }
    }

    async function deleteCustomerRegistry(id) {
        const confirm = await Swal.fire({
            title: 'حذف العميل نهائياً؟',
            text: "تحذير! سيؤدي هذا الإجراء إلى مسح العميل وجميع سجلات ديونه ومدفوعاته من النظام.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'نعم، حذف نهائياً',
            cancelButtonText: 'إلغاء'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await api.delete('api/customers', { id });
                if (res.success) {
                    showToastSuccess("تم حذف العميل بنجاح.");
                    await loadCustomers();
                    renderCustomersList();
                    populatePayoffDropdown();
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'فشل الحذف', text: err.message });
            }
        }
    }

    // G. DEBT PAYOFF ENGINE (RIGHT SIDEBAR OF CUSTOMERS TAB)
    function populatePayoffDropdown() {
        dom.payoffCustomer.innerHTML = '<option value="">-- اختر عميلاً لسداد دينه --</option>';
        state.customers.forEach(c => {
            const debt = parseFloat(c.total_debt);
            dom.payoffCustomer.innerHTML += `<option value="${c.id}">${c.name} (دين: ${formatNumber(debt)} ل.س)</option>`;
        });

        // Hide preview by default
        dom.payoffDebtPreviewBox.classList.add('hidden');
        dom.payoffSubmitBtn.disabled = true;
        dom.payoffAmount.value = '';
        dom.payoffNotes.value = '';
    }

    dom.payoffCustomer.addEventListener('change', () => {
        const id = parseInt(dom.payoffCustomer.value);
        if (!id) {
            dom.payoffDebtPreviewBox.classList.add('hidden');
            dom.payoffSubmitBtn.disabled = true;
            return;
        }

        const customer = state.customers.find(c => c.id === id);
        if (customer) {
            const debt = parseFloat(customer.total_debt);
            dom.payoffDebtPreviewBox.classList.remove('hidden');
            dom.payoffCurrentDebtVal.textContent = `${formatNumber(debt)} ل.س`;
            dom.payoffSubmitBtn.disabled = false;
        }
    });

    dom.payoffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const customerId = parseInt(dom.payoffCustomer.value);
        const amount = parseFloat(dom.payoffAmount.value);
        const notes = dom.payoffNotes.value.trim();

        if (!customerId || isNaN(amount) || amount <= 0) return;

        const customer = state.customers.find(c => c.id === customerId);

        const confirm = await Swal.fire({
            title: 'تأكيد استلام كاش؟',
            html: `سداد دين العميل: <b>${customer.name}</b><br>المبلغ المدفوع: <b class="text-success">${formatNumber(amount)} ل.س</b>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'تأكيد الاستلام نقداً',
            cancelButtonText: 'إلغاء'
        });

        if (!confirm.isConfirmed) return;

        dom.payoffSubmitBtn.disabled = true;
        
        try {
            const res = await api.post('api/customers/payments', {
                customer_id: customerId,
                amount_paid: amount,
                notes: notes
            });

            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'تم تسجيل السداد!',
                    text: 'تم قبض المبلغ كاش وتحديث رصيد الزبون بنجاح.',
                    confirmButtonText: 'ممتاز'
                });

                await loadCustomers();
                renderCustomersList();
                populatePayoffDropdown();
                loadPayoffHistory();
                
                // Update cash in top header
                await loadDashboardData();
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'فشل العملية', text: err.message });
            dom.payoffSubmitBtn.disabled = false;
        }
    });

    async function loadPayoffHistory() {
        try {
            const res = await api.get('api/customers/payments');
            if (res.success) {
                dom.payoffLogsList.innerHTML = '';
                if (res.data.length > 0) {
                    res.data.forEach(p => {
                        const dateText = formatDateString(p.created_at);
                        dom.payoffLogsList.innerHTML += `
                            <div class="payoff-log-item">
                                <div class="payoff-log-info">
                                    <span class="payoff-log-name">${p.customer_name}</span>
                                    <span class="payoff-log-date">${dateText}</span>
                                    ${p.notes ? `<small class="text-muted">${p.notes}</small>` : ''}
                                </div>
                                <span class="payoff-log-amount number-font">+${formatNumber(p.amount_paid)}</span>
                            </div>
                        `;
                    });
                } else {
                    dom.payoffLogsList.innerHTML = '<p class="text-center text-muted" style="padding: 20px 0;">لا توجد عمليات سداد مسجلة.</p>';
                }
            }
        } catch (e) {}
    }

    // ==========================================================================
    // 10. PRODUCTS INVENTORY ENGINE
    // ==========================================================================
    dom.inventorySearch.addEventListener('input', renderProductsInventory);
    dom.btnHardAddProduct.addEventListener('click', async () => {
        const { value: formValues } = await Swal.fire({
            title: 'إضافة منتج جديد للمستودع',
            html:
                '<div style="text-align:right; margin-bottom:8px;"><label style="font-size:12px; font-weight:700;">اسم المنتج *</label></div>' +
                '<input id="swal-prod-name" class="swal2-input" placeholder="اسم الوجبة أو المشروب" style="direction:rtl; margin-top:0;">' +
                '<div style="text-align:right; margin:8px 0;"><label style="font-size:12px; font-weight:700;">فئة المنتج</label></div>' +
                '<select id="swal-prod-category" class="swal2-input" style="direction:rtl; margin-top:0;">' +
                    '<option value="snack">أكلة / مقرمشات</option>' +
                    '<option value="drink">مشروب غازي / ساخن</option>' +
                    '<option value="food">وجبة / طعام</option>' +
                    '<option value="other">أخرى</option>' +
                '</select>' +
                '<div style="text-align:right; margin:8px 0;"><label style="font-size:12px; font-weight:700;">سعر الشراء الكلي (التكلفة) *</label></div>' +
                '<input id="swal-prod-purchase" type="number" class="swal2-input" placeholder="سعر الشراء" style="direction:rtl; margin-top:0;">' +
                '<div style="text-align:right; margin:8px 0;"><label style="font-size:12px; font-weight:700;">سعر البيع للزبون *</label></div>' +
                '<input id="swal-prod-selling" type="number" class="swal2-input" placeholder="سعر البيع للزبون" style="direction:rtl; margin-top:0;">' +
                '<div style="text-align:right; margin:8px 0;"><label style="font-size:12px; font-weight:700;">الكمية الأولية المتوفرة *</label></div>' +
                '<input id="swal-prod-stock" type="number" class="swal2-input" placeholder="الكمية المتوفرة" style="direction:rtl; margin-top:0;">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'حفظ المنتج',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const name = document.getElementById('swal-prod-name').value.trim();
                const category = document.getElementById('swal-prod-category').value;
                const purchase_price = parseFloat(document.getElementById('swal-prod-purchase').value);
                const selling_price = parseFloat(document.getElementById('swal-prod-selling').value);
                const stock = parseInt(document.getElementById('swal-prod-stock').value);

                if (empty(name) || isNaN(purchase_price) || isNaN(selling_price) || isNaN(stock)) {
                    Swal.showValidationMessage('يرجى ملء جميع الحقول المطلوبة بشكل صحيح.');
                }
                return { name, category, purchase_price, selling_price, stock };
            }
        });

        if (formValues) {
            try {
                const res = await api.post('api/products', formValues);
                if (res.success) {
                    showToastSuccess("تم إضافة المنتج بنجاح.");
                    await loadProducts();
                    renderProductsInventory();
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'خطأ في إضافة منتج', text: err.message });
            }
        }
    });

    function renderProductsInventory() {
        dom.inventoryTableBody.innerHTML = '';
        const searchVal = dom.inventorySearch.value.toLowerCase().trim();

        const filtered = state.products.filter(p => 
            p.name.toLowerCase().includes(searchVal) || 
            (p.category && p.category.toLowerCase().includes(searchVal))
        );

        if (filtered.length > 0) {
            filtered.forEach(p => {
                const purchase = parseFloat(p.purchase_price);
                const selling = parseFloat(p.selling_price);
                const profit = selling - purchase;
                const profitPercent = purchase > 0 ? Math.round((profit / purchase) * 100) : 0;
                
                const stock = parseInt(p.stock);
                let stockBadge = '';
                if (stock <= 0) {
                    stockBadge = '<span class="badge badge-danger">نفذت الكمية</span>';
                } else if (stock <= 5) {
                    stockBadge = `<span class="badge badge-warning number-font">${stock} وحدات</span>`;
                } else {
                    stockBadge = `<span class="badge badge-success number-font">${stock} وحدات</span>`;
                }

                let catText = 'أخرى';
                if (p.category === 'drink') catText = 'مشروبات';
                else if (p.category === 'snack') catText = 'مقرمشات';
                else if (p.category === 'food') catText = 'وجبة طعام';

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><b>${p.name}</b></td>
                    <td>${catText}</td>
                    <td class="number-font">${formatNumber(purchase)} ل.س</td>
                    <td class="number-font">${formatNumber(selling)} ل.س</td>
                    <td class="profit-plus number-font">+${formatNumber(profit)} ل.س (${profitPercent}%)</td>
                    <td>${stockBadge}</td>
                    <td>${stock > 0 ? '<span class="badge badge-success">نشط</span>' : '<span class="badge badge-danger">غير متوفر</span>'}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-warning btn-edit-prod" data-id="${p.id}"><i class="fa-solid fa-pen-to-square"></i> تعديل</button>
                        <button class="btn btn-sm btn-outline-danger btn-del-prod" data-id="${p.id}"><i class="fa-solid fa-trash"></i> حذف</button>
                    </td>
                `;

                // Edit Product
                row.querySelector('.btn-edit-prod').addEventListener('click', () => editProductDetails(p));
                // Delete Product
                row.querySelector('.btn-del-prod').addEventListener('click', () => deleteProductRegistry(p.id));

                dom.inventoryTableBody.appendChild(row);
            });
        } else {
            dom.inventoryTableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">لا توجد منتجات مطابقة في المستودع.</td></tr>';
        }
    }

    async function editProductDetails(prod) {
        const { value: formValues } = await Swal.fire({
            title: 'تعديل بيانات المنتج والمخزون',
            html:
                `<div style="text-align:right; margin-bottom:4px;"><label style="font-size:12px; font-weight:700;">اسم المنتج *</label></div>` +
                `<input id="swal-prod-name-edit" class="swal2-input" value="${prod.name}" style="direction:rtl; margin-top:0;">` +
                `<div style="text-align:right; margin:8px 0;"><label style="font-size:12px; font-weight:700;">سعر الشراء (التكلفة) *</label></div>` +
                `<input id="swal-prod-purchase-edit" type="number" class="swal2-input" value="${prod.purchase_price}" style="direction:rtl; margin-top:0;">` +
                `<div style="text-align:right; margin:8px 0;"><label style="font-size:12px; font-weight:700;">سعر البيع للزبون *</label></div>` +
                `<input id="swal-prod-selling-edit" type="number" class="swal2-input" value="${prod.selling_price}" style="direction:rtl; margin-top:0;">` +
                `<div style="text-align:right; margin:8px 0;"><label style="font-size:12px; font-weight:700;">الكمية المتوفرة في المخزن *</label></div>` +
                `<input id="swal-prod-stock-edit" type="number" class="swal2-input" value="${prod.stock}" style="direction:rtl; margin-top:0;">`,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'تعديل وحفظ',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const name = document.getElementById('swal-prod-name-edit').value.trim();
                const purchase_price = parseFloat(document.getElementById('swal-prod-purchase-edit').value);
                const selling_price = parseFloat(document.getElementById('swal-prod-selling-edit').value);
                const stock = parseInt(document.getElementById('swal-prod-stock-edit').value);

                if (empty(name) || isNaN(purchase_price) || isNaN(selling_price) || isNaN(stock)) {
                    Swal.showValidationMessage('يرجى ملء جميع الحقول بشكل صحيح.');
                }
                return { id: prod.id, name, category: prod.category, purchase_price, selling_price, stock };
            }
        });

        if (formValues) {
            try {
                const res = await api.put('api/products', formValues);
                if (res.success) {
                    showToastSuccess("تم تعديل المنتج.");
                    await loadProducts();
                    renderProductsInventory();
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'فشل التعديل', text: err.message });
            }
        }
    }

    async function deleteProductRegistry(id) {
        const confirm = await Swal.fire({
            title: 'حذف المنتج من المستودع؟',
            text: "تنبيه! سيتم إزالة هذا الصنف نهائياً من قائمة الأكلات والمشروبات.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'نعم، حذف نهائياً',
            cancelButtonText: 'إلغاء'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await api.delete('api/products', { id });
                if (res.success) {
                    showToastSuccess("تم حذف صنف المنتج.");
                    await loadProducts();
                    renderProductsInventory();
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'فشل الحذف', text: err.message });
            }
        }
    }

    // ==========================================================================
    // 11. TELECOM DASHBOARD & COMPANY ENGINE
    // ==========================================================================
    dom.btnHardAddTelecom.addEventListener('click', async () => {
        const { value: formValues } = await Swal.fire({
            title: 'إضافة شركة اتصال جديدة',
            html:
                '<input id="swal-tel-name" class="swal2-input" placeholder="اسم الشركة (مثال: سيرياتيل) *" style="direction:rtl;">' +
                '<div style="text-align:right; margin:8px 24px;"><label style="font-size:12px; font-weight:700;">لون شعار الشركة (كود Hex)</label></div>' +
                '<input id="swal-tel-color" type="color" class="swal2-input" value="#6366f1" style="height:50px;">',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'إضافة الشركة',
            cancelButtonText: 'إلغاء',
            preConfirm: () => {
                const name = document.getElementById('swal-tel-name').value.trim();
                const logo_color = document.getElementById('swal-tel-color').value;
                if (empty(name)) {
                    Swal.showValidationMessage('الاسم مطلوب.');
                }
                return { name, logo_color };
            }
        });

        if (formValues) {
            try {
                const res = await api.post('api/telecom', formValues);
                if (res.success) {
                    showToastSuccess("تم إضافة شركة الاتصال بنجاح.");
                    await loadTelecomCompanies();
                    renderTelecomDashboard();
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'فشل إضافة الشركة', text: err.message });
            }
        }
    });

    async function renderTelecomDashboard() {
        // Render badges
        dom.telecomCompaniesRow.innerHTML = '';
        state.telecomCompanies.forEach(c => {
            dom.telecomCompaniesRow.innerHTML += `
                <span class="tel-badge" style="background:${c.logo_color};">${c.name}</span>
            `;
        });

        // Load logs
        try {
            const res = await api.get('api/sales');
            if (res.success) {
                dom.telecomLogsTableBody.innerHTML = '';
                
                // Collect all telecom items from sales
                let telecomLogs = [];
                res.data.forEach(sale => {
                    sale.items.forEach(item => {
                        if (item.item_type === 'telecom') {
                            telecomLogs.push({
                                company_name: item.telecom_name || 'تحويل رصيد عام',
                                phone: item.telecom_phone,
                                amount: item.telecom_amount ? parseFloat(item.telecom_amount) : null,
                                price: parseFloat(item.price_per_unit),
                                date: sale.created_at,
                                sale_id: sale.id
                            });
                        }
                    });
                });

                if (telecomLogs.length > 0) {
                    telecomLogs.forEach(log => {
                        const formattedDate = formatDateString(log.date);
                        // Approximate net profit = selling price - units amount cost
                        // In reality, operator units purchase price is different, but dynamically
                        // we show client revenue vs transfer amount.
                        const revenue = log.price;
                        const netCost = log.amount !== null ? log.amount : 0;
                        const simpleProfit = revenue - netCost;

                        const phoneDisplay = log.phone ? log.phone : '<span class="text-muted">-</span>';
                        const amountDisplay = log.amount !== null && log.amount > 0 
                            ? `${formatNumber(log.amount)} وحدات` 
                            : '<span class="text-muted">-</span>';

                        dom.telecomLogsTableBody.innerHTML += `
                            <tr>
                                <td><b>${log.company_name}</b></td>
                                <td class="number-font">${phoneDisplay}</td>
                                <td class="number-font text-info">${amountDisplay}</td>
                                <td class="number-font">${formatNumber(log.price)} ل.س</td>
                                <td class="profit-plus number-font">${simpleProfit > 0 ? '+' : ''}${formatNumber(simpleProfit)} ل.س</td>
                                <td class="number-font">${formattedDate}</td>
                                <td><span class="badge badge-info">الفاتورة #${log.sale_id}</span></td>
                            </tr>
                        `;
                    });
                } else {
                    dom.telecomLogsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">لا توجد عمليات تحويل رصيد مسجلة حالياً.</td></tr>';
                }
            }
        } catch (e) {
            console.error("Failed to compile telecom logs:", e);
        }
    }

    // ==========================================================================
    // 12. EXPENSES LEDGER ENGINE
    // ==========================================================================
    dom.expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const category = document.getElementById('exp-category').value;
        const amount = parseFloat(document.getElementById('exp-amount').value);
        const notes = document.getElementById('exp-notes').value.trim();

        if (empty(category) || isNaN(amount) || amount <= 0) return;

        const confirm = await Swal.fire({
            title: 'تسجيل المصروف؟',
            html: `الفئة: <b>${category}</b><br>القيمة: <b class="text-danger">${formatNumber(amount)} ل.س</b>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'نعم، خصم ودفع الفاتورة',
            cancelButtonText: 'إلغاء'
        });

        if (!confirm.isConfirmed) return;

        try {
            const res = await api.post('api/expenses', { category, amount, notes });
            if (res.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'تم تسجيل المصروف خصماً من الصندوق!',
                    confirmButtonText: 'ممتاز'
                });

                // Reset forms
                document.getElementById('exp-amount').value = '';
                document.getElementById('exp-notes').value = '';
                document.getElementById('exp-category').value = '';

                // Reload views
                await loadDashboardData();
                loadExpensesTable();
            }
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'فشل تسجيل المصروف', text: err.message });
        }
    });

    async function loadExpensesTable() {
        try {
            const res = await api.get('api/expenses');
            if (res.success) {
                dom.expensesTableBody.innerHTML = '';
                if (res.data.length > 0) {
                    res.data.forEach(e => {
                        const dateText = formatDateString(e.created_at);
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td><span class="badge badge-danger" style="font-size:12px; padding:6px 10px;">${e.category}</span></td>
                            <td class="number-font text-danger" style="font-weight:800;">-${formatNumber(e.amount)} ل.س</td>
                            <td>${e.notes || '-'}</td>
                            <td class="number-font">${dateText}</td>
                            <td>
                                <button class="btn btn-sm btn-outline-danger btn-del-exp" data-id="${e.id}"><i class="fa-solid fa-trash"></i> مسح</button>
                            </td>
                        `;

                        // Delete Expense Listener
                        row.querySelector('.btn-del-exp').addEventListener('click', () => deleteExpenseRegistry(e.id));

                        dom.expensesTableBody.appendChild(row);
                    });
                } else {
                    dom.expensesTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">لم يتم دفع أو تسجيل أي مصاريف مؤخراً.</td></tr>';
                }
            }
        } catch (err) {}
    }

    async function deleteExpenseRegistry(id) {
        const confirm = await Swal.fire({
            title: 'حذف المصروف؟',
            text: "تنبيه! سيؤدي حذف المصروف إلى إرجاع قيمته كرصيد متوفر في الصندوق نقداً.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#f43f5e',
            confirmButtonText: 'نعم، مسح وإرجاع الرصيد',
            cancelButtonText: 'إلغاء'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await api.delete('api/expenses', { id });
                if (res.success) {
                    showToastSuccess("تم حذف المصروف وإرجاع رصيد الصندوق.");
                    await loadDashboardData();
                    loadExpensesTable();
                }
            } catch (err) {
                Swal.fire({ icon: 'error', title: 'خطأ في المسح', text: err.message });
            }
        }
    }

    // ==========================================================================
    // 13. DATA PRESENTATION & CONVERSION UTILS (FORMATTERS)
    // ==========================================================================
    function formatNumber(num) {
        return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    function formatDateString(sqlDate) {
        // Convert '2026-05-22 14:15:00' to nice local time or 'اليوم 02:15 م'
        if (!sqlDate) return '-';
        const d = new Date(sqlDate.replace(' ', 'T'));
        if (isNaN(d.getTime())) return sqlDate;

        const now = new Date();
        const isToday = d.getDate() === now.getDate() && 
                        d.getMonth() === now.getMonth() && 
                        d.getFullYear() === now.getFullYear();

        let timeStr = d.toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit', hour12: true });
        if (isToday) {
            return `اليوم، ${timeStr}`;
        }

        const dateStr = d.toLocaleDateString('ar-SY', { month: 'short', day: 'numeric' });
        return `${dateStr}، ${timeStr}`;
    }

    function empty(val) {
        return !val || val === '' || val.length === 0;
    }

    function showToastSuccess(text) {
        Swal.fire({
            icon: 'success',
            title: text,
            timer: 1500,
            showConfirmButton: false,
            toast: true,
            position: 'top-end'
        });
    }

    // ==========================================================================
    // 13.5 RECORDS & TRANSACTIONS LOGIC
    // ==========================================================================
    let allRecords = [];

    async function loadRecords() {
        dom.recordsTableBody.innerHTML = '<tr><td colspan="7" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> جاري التحميل...</td></tr>';
        try {
            const res = await api.get('api/sales');
            if (res.success) {
                allRecords = res.data;
                renderRecordsList(allRecords);
            }
        } catch (err) {
            dom.recordsTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">فشل تحميل السجلات.</td></tr>';
        }
    }

    function renderRecordsList(records) {
        dom.recordsTableBody.innerHTML = '';
        if (records.length === 0) {
            dom.recordsTableBody.innerHTML = '<tr><td colspan="7" class="text-center">لا توجد عمليات مسجلة.</td></tr>';
            return;
        }

        records.forEach(r => {
            const clientName = r.customer_name || 'زبون نقدي (كاش)';
            const formattedDate = formatDateString(r.created_at);
            
            dom.recordsTableBody.innerHTML += `
                <tr>
                    <td class="number-font text-left">#${r.id}</td>
                    <td><b>${clientName}</b></td>
                    <td class="number-font text-left">${formatNumber(r.total_amount)}</td>
                    <td class="number-font text-left text-success">${formatNumber(r.paid_amount)}</td>
                    <td class="number-font text-left text-danger">${formatNumber(r.debt_amount)}</td>
                    <td class="number-font text-left">${formattedDate}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger" onclick="window.deleteRecord(${r.id})">
                            <i class="fa-solid fa-trash"></i> حذف
                        </button>
                    </td>
                </tr>
            `;
        });
    }

    dom.recordsSearch.addEventListener('input', () => {
        const query = dom.recordsSearch.value.toLowerCase().trim();
        const filtered = allRecords.filter(r => {
            const clientName = (r.customer_name || 'زبون نقدي (كاش)').toLowerCase();
            return r.id.toString().includes(query) || clientName.includes(query) || r.created_at.includes(query);
        });
        renderRecordsList(filtered);
    });

    dom.btnRefreshRecords.addEventListener('click', () => {
        loadRecords();
    });

    if (dom.btnDeleteAllRecords) {
        dom.btnDeleteAllRecords.addEventListener('click', async () => {
            const confirm = await Swal.fire({
                title: 'تأكيد قوي جدًا!',
                text: 'سيتم حذف كافة السجلات والعمليات نهائياً، واسترجاع جميع المنتجات للمخزن وخصم ديون هذه العمليات. هذا الإجراء لا يمكن التراجع عنه!',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'نعم، احذف كل السجلات',
                cancelButtonText: 'إلغاء الأمر'
            });

            if (confirm.isConfirmed) {
                const doubleConfirm = await Swal.fire({
                    title: 'هل أنت متأكد 100%؟',
                    text: 'سيتم تصفير جميع المبيعات السابقة!',
                    icon: 'error',
                    showCancelButton: true,
                    confirmButtonColor: '#d33',
                    cancelButtonColor: '#3085d6',
                    confirmButtonText: 'تأكيد نهائي وحذف',
                    cancelButtonText: 'تراجع'
                });

                if (doubleConfirm.isConfirmed) {
                    try {
                        const res = await api.delete('api/sales/all');
                        if (res.success) {
                            showToastSuccess(res.message);
                            loadRecords();
                            loadDashboardData();
                        }
                    } catch (err) {
                        Swal.fire('خطأ', err.message, 'error');
                    }
                }
            }
        });
    }

    window.deleteRecord = async function(id) {
        const confirm = await Swal.fire({
            title: 'تأكيد الحذف',
            text: 'هل أنت متأكد من حذف هذه العملية؟ سيتم استرجاع المخزون والديون المتعلقة.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#6366f1',
            confirmButtonText: 'نعم، احذف',
            cancelButtonText: 'إلغاء'
        });

        if (confirm.isConfirmed) {
            try {
                const res = await api.delete('api/sales', { sale_id: id });
                if (res.success) {
                    showToastSuccess(res.message);
                    loadRecords();
                    loadDashboardData();
                }
            } catch (err) {
                Swal.fire('خطأ', err.message, 'error');
            }
        }
    };

    // ==========================================================================
    // 14. FIRE ENGINE STARTUP
    // ==========================================================================
    initApp();
});
