/* ==========================================================================
   GAME CASH MOBILE CONTROLLER (STANDALONE PWA LOGIC)
   ========================================================================== */

// 1. App State Registry
const state = {
    user: null,
    products: [],
    customers: [],
    mobileSnacks: {}, // Key: Product ID, Value: Quantity
    cart: [],
    activeTab: 'sales'
};

// 2. DOM Elements Registry
let dom = {};

function registerDOM() {
    dom = {
        loginOverlay: document.getElementById('login-overlay'),
        loginForm: document.getElementById('login-form'),
        loginUsername: document.getElementById('login-username'),
        loginPassword: document.getElementById('login-password'),
        loginBtn: document.getElementById('login-btn'),
        
        appShell: document.getElementById('app-shell'),
        sidebar: document.getElementById('mobile-sidebar'),
        moreTrigger: document.getElementById('mobile-more-trigger'),
        logoutBtn: document.getElementById('logout-btn'),
        headerTitle: document.getElementById('mobile-header-title'),
        headerCashSafe: document.getElementById('header-cash-safe'),
        
        // Navigation & Tabs
        navItems: document.querySelectorAll('.bottom-nav-item, .sidebar-nav li'),
        tabPanes: document.querySelectorAll('.tab-pane'),
        
        // Unified Checkout
        addSnacksBtn: document.getElementById('mobile-add-snacks-btn'),
        snacksBtnText: document.getElementById('mobile-snacks-btn-text'),
        enableTelecom: document.getElementById('mobile-enable-telecom'),
        telecomExpanded: document.getElementById('mobile-telecom-expanded'),
        telCompany: document.getElementById('mobile-tel-company'),
        telPhone: document.getElementById('mobile-tel-phone'),
        telAmount: document.getElementById('mobile-tel-amount'),
        telPrice: document.getElementById('mobile-tel-price'),
        
        enablePlaystation: document.getElementById('mobile-enable-playstation'),
        playstationExpanded: document.getElementById('mobile-playstation-expanded'),
        psLabel: document.getElementById('mobile-ps-label'),
        psPrice: document.getElementById('mobile-ps-price'),
        
        cartSummaryHeader: document.getElementById('mobile-cart-summary-header'),
        cartSummaryCard: document.getElementById('mobile-cart-summary-card'),
        cartItemsContainer: document.getElementById('mobile-cart-items'),
        cartTotalText: document.getElementById('mobile-cart-total'),
        
        // Checkout Form & Split Payment
        checkoutForm: document.getElementById('mobile-checkout-form'),
        payCashRadio: document.getElementById('mobile-pay-cash'),
        payDebtRadio: document.getElementById('mobile-pay-debt'),
        paySplitRadio: document.getElementById('mobile-pay-split'),
        cashInputGroup: document.getElementById('mobile-cash-input-group'),
        cashPaidInput: document.getElementById('mobile-cash-paid'),
        customerSelectGroup: document.getElementById('mobile-customer-select-group'),
        customerSelect: document.getElementById('mobile-customer-select'),
        debtDisplayGroup: document.getElementById('mobile-debt-display-group'),
        debtAmountInput: document.getElementById('mobile-debt-amount'),
        checkoutNotes: document.getElementById('mobile-checkout-notes'),
        checkoutBtn: document.getElementById('mobile-checkout-btn'),
        
        // Dashboard Tab
        dashSafe: document.getElementById('mobile-dash-safe'),
        dashSales: document.getElementById('mobile-dash-sales'),
        dashDebts: document.getElementById('mobile-dash-debts'),
        dashExpenses: document.getElementById('mobile-dash-expenses'),
        recentSalesList: document.getElementById('mobile-recent-sales-list'),
        
        // Customers Tab
        customerForm: document.getElementById('mobile-customer-form'),
        custNameInput: document.getElementById('mobile-cust-name'),
        custPhoneInput: document.getElementById('mobile-cust-phone'),
        custSearchInput: document.getElementById('mobile-cust-search'),
        customersTableBody: document.getElementById('mobile-customers-table-body'),
        
        // Expenses Tab
        expenseForm: document.getElementById('mobile-expense-form'),
        expCategorySelect: document.getElementById('mobile-exp-category'),
        expAmountInput: document.getElementById('mobile-exp-amount'),
        expNotesTextarea: document.getElementById('mobile-exp-notes'),
        expensesTableBody: document.getElementById('mobile-expenses-table-body'),
        
        // Snacks Bottom Sheet
        snacksSheet: document.getElementById('mobile-snacks-sheet'),
        closeSheetBtn: document.getElementById('mobile-close-sheet-btn'),
        snackSearchInput: document.getElementById('mobile-snack-search-input'),
        snacksContainer: document.getElementById('mobile-snacks-container'),
        confirmSnacksBtn: document.getElementById('mobile-confirm-snacks-btn')
    };
}

// 3. Initialize Mobile Application
document.addEventListener('DOMContentLoaded', () => {
    registerDOM();
    checkAuth();
});

// Authentication Checker
async function checkAuth() {
    const token = api.getToken();
    if (!token) {
        showLogin();
        return;
    }
    
    try {
        const response = await api.get('api/auth/check');
        if (response.success) {
            state.user = response.data;
            document.getElementById('display-username').textContent = state.user.username;
            hideLogin();
            initMobileApp();
        } else {
            showLogin();
        }
    } catch (err) {
        console.error('Session verification failed', err);
        showLogin();
    }
}

function showLogin() {
    dom.loginOverlay.classList.remove('hidden');
    dom.appShell.classList.add('hidden');
    setupLoginListeners();
}

function hideLogin() {
    dom.loginOverlay.classList.add('hidden');
    dom.appShell.classList.remove('hidden');
}

function setupLoginListeners() {
    dom.loginForm.onsubmit = async (e) => {
        e.preventDefault();
        dom.loginBtn.disabled = true;
        
        const username = dom.loginUsername.value.trim();
        const password = dom.loginPassword.value;
        
        try {
            const response = await api.post('api/auth/login', { username, password });
            if (response.success) {
                api.setToken(response.data.token);
                state.user = response.data.user;
                document.getElementById('display-username').textContent = state.user.username;
                hideLogin();
                initMobileApp();
                
                Swal.fire({
                    icon: 'success',
                    title: 'مرحباً بك!',
                    text: `تم تسجيل الدخول بنجاح بصفتك: ${state.user.username}`,
                    timer: 1500,
                    showConfirmButton: false,
                    background: '#161824',
                    color: '#ffffff'
                });
            } else {
                throw new Error(response.message || 'فشل تسجيل الدخول');
            }
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'خطأ في الدخول',
                text: err.message || err.error || 'فشل الاتصال بالسيرفر. يرجى التحقق من المدخلات.',
                background: '#161824',
                color: '#ffffff'
            });
        } finally {
            dom.loginBtn.disabled = false;
        }
    };
}

// Main Mobile Initialization
async function initMobileApp() {
    // 1. Fetch Master Data
    await loadProducts();
    await loadCustomers();
    await loadDashboardStats();
    await loadRecentSales();
    await loadExpenses();
    
    // 2. Set Up Event Listeners
    setupAppListeners();
    
    // 3. Pre-populate Operators Select
    populateTelecomOperators();
    
    // 4. Default view is pane-sales (Quick Sell)
    switchTab('sales');
}

// Load Master Data APIs
async function loadProducts() {
    try {
        const res = await api.get('api/products');
        if (res.success && Array.isArray(res.data)) {
            state.products = res.data;
        } else {
            state.products = [];
        }
    } catch (err) {
        console.error('Error loading products', err);
        state.products = [];
    }
}

async function loadCustomers() {
    try {
        const res = await api.get('api/customers');
        if (res.success && Array.isArray(res.data)) {
            state.customers = res.data;
        } else {
            state.customers = [];
        }
        populateCustomerDropdowns();
        renderCustomersTable();
    } catch (err) {
        console.error('Error loading customers', err);
        state.customers = [];
        populateCustomerDropdowns();
        renderCustomersTable();
    }
}

async function loadDashboardStats() {
    try {
        const res = await api.get('api/dashboard');
        if (res.success) {
            const data = res.data;
            dom.headerCashSafe.innerHTML = `${Number(data.cash_safe || 0).toLocaleString()} <span class="currency">ل.س</span>`;
            dom.dashSafe.textContent = Number(data.cash_safe || 0).toLocaleString();
            
            dom.dashSales.textContent = Number(data.today.sales_total || 0).toLocaleString();
            dom.dashDebts.textContent = Number(data.total_debts || 0).toLocaleString();
            dom.dashExpenses.textContent = Number(data.today.expenses || 0).toLocaleString();
        }
    } catch (err) {
        console.error('Error loading dashboard stats', err);
    }
}

async function loadRecentSales() {
    try {
        const res = await api.get('api/sales');
        dom.recentSalesList.innerHTML = '';
        if (res.success && Array.isArray(res.data)) {
            const sales = res.data;
            const recent = sales.slice(0, 8); // top 8 recent
            recent.forEach(sale => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 700; color: #ffffff;">${sale.customer_name || 'زبون نقدي'}</td>
                    <td class="number-font" style="color: var(--accent-color); font-weight: 700;">${Number(sale.total_amount).toLocaleString()}</td>
                    <td class="number-font" style="color: var(--success-color);">${Number(sale.cash_paid).toLocaleString()}</td>
                    <td class="number-font" style="color: #ef4444;">${Number(sale.debt_amount).toLocaleString()}</td>
                `;
                dom.recentSalesList.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('Error loading recent sales', err);
    }
}

async function loadExpenses() {
    try {
        const res = await api.get('api/expenses');
        dom.expensesTableBody.innerHTML = '';
        if (res.success && Array.isArray(res.data)) {
            const expenses = res.data;
            const recent = expenses.slice(0, 8);
            recent.forEach(exp => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight: 700; color: #ffffff;">${exp.category}</td>
                    <td class="number-font" style="color: var(--success-color); font-weight: 700;">${Number(exp.amount).toLocaleString()}</td>
                    <td style="font-size: 11px; color: var(--text-secondary); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${exp.notes}</td>
                `;
                dom.expensesTableBody.appendChild(tr);
            });
        }
    } catch (err) {
        console.error('Error loading expenses', err);
    }
}

// Populate Options Helpers
function populateTelecomOperators() {
    const operators = ["سيريتل (Syriatel)", "إم تي إن (MTN)", "شبكة إنترنت صالة", "خط اتصال صالة", "أخرى"];
    dom.telCompany.innerHTML = operators.map(op => `<option value="${op}">${op}</option>`).join('');
}

function populateCustomerDropdowns() {
    dom.customerSelect.innerHTML = `<option value="" disabled selected>-- اختر العميل المدين --</option>`;
    if (!state.customers || !Array.isArray(state.customers)) {
        return;
    }
    state.customers.forEach(cust => {
        dom.customerSelect.innerHTML += `<option value="${cust.id}">${cust.name} (الدين: ${Number(cust.total_debt || 0).toLocaleString()} ل.س)</option>`;
    });
}

// 4. Tab Navigation and Drawer Toggles
function setupAppListeners() {
    // Nav Items click handler
    dom.navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tab = item.getAttribute('data-tab');
            if (tab) {
                switchTab(tab);
                dom.sidebar.classList.remove('open'); // Close Drawer if it was open
            }
        });
    });
    
    // More / Sidebar trigger
    dom.moreTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        dom.sidebar.classList.toggle('open');
    });
    
    // Close sidebar on tapping main content area
    document.addEventListener('click', (e) => {
        if (!dom.sidebar.contains(e.target) && e.target !== dom.moreTrigger) {
            dom.sidebar.classList.remove('open');
        }
    });
    
    // Logout Action
    dom.logoutBtn.onclick = () => {
        api.clearAuth();
        showLogin();
        Swal.fire({
            icon: 'info',
            title: 'تم تسجيل الخروج',
            text: 'نراك لاحقاً!',
            timer: 1200,
            showConfirmButton: false,
            background: '#161824',
            color: '#ffffff'
        });
    };
    
    // Expandable inputs sections triggers
    dom.enableTelecom.addEventListener('change', () => {
        if (dom.enableTelecom.checked) {
            dom.telecomExpanded.classList.remove('hidden');
        } else {
            dom.telecomExpanded.classList.add('hidden');
            // reset telecom inputs
            dom.telPhone.value = '';
            dom.telAmount.value = '';
            dom.telPrice.value = 0;
        }
        syncMobileToCart();
    });
    
    dom.enablePlaystation.addEventListener('change', () => {
        if (dom.enablePlaystation.checked) {
            dom.playstationExpanded.classList.remove('hidden');
        } else {
            dom.playstationExpanded.classList.add('hidden');
            dom.psLabel.value = '';
            dom.psPrice.value = 0;
        }
        syncMobileToCart();
    });
    
    // Price Stepper listeners (Universal Selector for Mobile Buttons)
    document.querySelectorAll('.mobile-stepper-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const inputId = btn.getAttribute('data-input');
            const step = parseInt(btn.getAttribute('data-step') || "0");
            const input = document.getElementById(inputId);
            
            if (input) {
                let currentVal = parseInt(input.value) || 0;
                let newVal = currentVal + step;
                if (newVal < 0) newVal = 0;
                input.value = newVal;
                
                // Dispatch input event to force recalculation
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
    });
    
    // Recalculations on custom manual entries
    dom.telPrice.addEventListener('input', () => syncMobileToCart());
    dom.psPrice.addEventListener('input', () => syncMobileToCart());
    dom.cashPaidInput.addEventListener('input', () => updateDebtBalance());
    
    // Payment Method Radio Switches
    const methodRadios = [dom.payCashRadio, dom.payDebtRadio, dom.paySplitRadio];
    methodRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const method = radio.value;
            if (method === 'cash') {
                dom.cashInputGroup.classList.add('hidden');
                dom.customerSelectGroup.classList.add('hidden');
                dom.debtDisplayGroup.classList.add('hidden');
            } else if (method === 'debt') {
                dom.cashInputGroup.classList.add('hidden');
                dom.customerSelectGroup.classList.remove('hidden');
                dom.debtDisplayGroup.classList.remove('hidden');
            } else if (method === 'split') {
                dom.cashInputGroup.classList.remove('hidden');
                dom.customerSelectGroup.classList.remove('hidden');
                dom.debtDisplayGroup.classList.remove('hidden');
            }
            updateDebtBalance();
        });
    });
    
    // ----------------------------------------------------------------------
    // BOTTOM SHEET SNACK CATALOG EVENT HANDLERS
    // ----------------------------------------------------------------------
    dom.addSnacksBtn.onclick = () => {
        try {
            renderSnacksInSheet();
            dom.snacksSheet.classList.remove('hidden');
        } catch (e) {
            console.error('Error rendering snacks catalog', e);
            Swal.fire({
                icon: 'error',
                title: 'خطأ في فتح الكتالوج',
                text: 'حدث خطأ غير متوقع أثناء تحميل كتالوج المأكولات والمشروبات.',
                background: '#161824',
                color: '#ffffff'
            });
        }
    };
    
    dom.closeSheetBtn.onclick = () => {
        dom.snacksSheet.classList.add('hidden');
    };
    
    dom.snackSearchInput.addEventListener('input', () => {
        const query = dom.snackSearchInput.value.toLowerCase().trim();
        document.querySelectorAll('.mobile-snack-item').forEach(card => {
            const name = card.querySelector('.snack-name').textContent.toLowerCase();
            if (name.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    });
    
    dom.confirmSnacksBtn.onclick = () => {
        dom.snacksSheet.classList.add('hidden');
        syncMobileToCart();
    };
    
    // ----------------------------------------------------------------------
    // CUSTOMER MANAGEMENT FORM SUBMIT
    // ----------------------------------------------------------------------
    dom.customerForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = dom.custNameInput.value.trim();
        const phone = dom.custPhoneInput.value.trim();
        
        try {
            await api.post('api/customers', { name, phone });
            dom.custNameInput.value = '';
            dom.custPhoneInput.value = '';
            
            await loadCustomers();
            Swal.fire({
                icon: 'success',
                title: 'نجاح الإضافة',
                text: `تم تسجيل العميل ${name} بنجاح في المنظومة!`,
                background: '#161824',
                color: '#ffffff'
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'فشل الحفظ',
                text: err.error || 'فشلت عملية إضافة العميل.',
                background: '#161824',
                color: '#ffffff'
            });
        }
    };
    
    dom.custSearchInput.addEventListener('input', () => {
        renderCustomersTable();
    });
    
    // ----------------------------------------------------------------------
    // EXPENSE MANAGEMENT FORM SUBMIT
    // ----------------------------------------------------------------------
    dom.expenseForm.onsubmit = async (e) => {
        e.preventDefault();
        const category = dom.expCategorySelect.value;
        const amount = parseInt(dom.expAmountInput.value) || 0;
        const notes = dom.expNotesTextarea.value.trim();
        
        if (amount <= 0) {
            Swal.fire({
                icon: 'warning',
                title: 'تنبيه',
                text: 'يرجى إدخال قيمة مالية صالحة للمصروف.',
                background: '#161824',
                color: '#ffffff'
            });
            return;
        }
        
        try {
            await api.post('api/expenses', { category, amount, notes });
            dom.expAmountInput.value = 0;
            dom.expNotesTextarea.value = '';
            
            await loadExpenses();
            await loadDashboardStats();
            Swal.fire({
                icon: 'success',
                title: 'نجاح القيد',
                text: 'تم حفظ وتوثيق المصروف وصرف القيمة المالية من الخزنة!',
                background: '#161824',
                color: '#ffffff'
            });
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'فشل صرف المصروف',
                text: err.error || 'عذراً، لم تنجح عملية صرف المصروف.',
                background: '#161824',
                color: '#ffffff'
            });
        }
    };
    
    // ----------------------------------------------------------------------
    // UNIFIED MOBILE CHECKOUT SUBMISSION
    // ----------------------------------------------------------------------
    dom.checkoutForm.onsubmit = async (e) => {
        e.preventDefault();
        
        // 1. Calculate and compile cart
        syncMobileToCart();
        
        if (state.cart.length === 0) {
            Swal.fire({
                icon: 'warning',
                title: 'سلة فارغة',
                text: 'يرجى تعبئة أي بند في الفاتورة أولاً (مأكولات، شحن رصيد، أو جلسة لعب) قبل الحفظ.',
                background: '#161824',
                color: '#ffffff'
            });
            return;
        }
        
        // 2. Validate Payment inputs
        const paymentMethod = document.querySelector('input[name="mobile-payment-method"]:checked')?.value || 
                              (dom.payCashRadio.checked ? 'cash' : dom.payDebtRadio.checked ? 'debt' : 'split');
                              
        const customerId = dom.customerSelect.value;
        const totalAmount = state.cart.reduce((sum, item) => sum + item.price, 0);
        let cashPaid = 0;
        let debtAmount = 0;
        
        if (paymentMethod === 'cash') {
            cashPaid = totalAmount;
            debtAmount = 0;
        } else if (paymentMethod === 'debt') {
            cashPaid = 0;
            debtAmount = totalAmount;
            if (!customerId) {
                Swal.fire({
                    icon: 'warning',
                    title: 'لم يتم اختيار عميل',
                    text: 'يرجى اختيار العميل المطلوب تسجيل الديون على حسابه.',
                    background: '#161824',
                    color: '#ffffff'
                });
                return;
            }
        } else if (paymentMethod === 'split') {
            cashPaid = parseInt(dom.cashPaidInput.value) || 0;
            debtAmount = totalAmount - cashPaid;
            
            if (cashPaid < 0 || cashPaid > totalAmount) {
                Swal.fire({
                    icon: 'warning',
                    title: 'قيمة المدفوع غير صالحة',
                    text: 'مبلغ الكاش المدفوع يجب أن يكون بين الصفر وقيمة الفاتورة الإجمالية.',
                    background: '#161824',
                    color: '#ffffff'
                });
                return;
            }
            if (!customerId && debtAmount > 0) {
                Swal.fire({
                    icon: 'warning',
                    title: 'لم يتم اختيار عميل',
                    text: 'الفاتورة تحتوي على ديون متبقية، يرجى تعيين العميل المدين.',
                    background: '#161824',
                    color: '#ffffff'
                });
                return;
            }
        }
        
        // 3. Confirm via SweetAlert bill invoice
        const customerText = customerId ? dom.customerSelect.options[dom.customerSelect.selectedIndex].text.split('(')[0].trim() : 'زبون نقدي';
        
        let confirmText = `
            <div style="text-align: right; font-family: 'Cairo', sans-serif; font-size: 14px;">
                <p><b>إجمالي الفاتورة:</b> <span class="number-font" style="color: var(--accent-color); font-weight: 700;">${totalAmount.toLocaleString()}</span> ل.س</p>
                <p><b>طريقة التسوية:</b> ${paymentMethod === 'cash' ? 'كاش بالكامل' : paymentMethod === 'debt' ? 'دين مؤجل' : 'دفع موزع'}</p>
                <p><b>المستلم نقداً (كاش):</b> <span class="number-font" style="color: var(--success-color); font-weight: 700;">${cashPaid.toLocaleString()}</span> ل.س</p>
                <p><b>المسجل ديون:</b> <span class="number-font" style="color: #ef4444; font-weight: 700;">${debtAmount.toLocaleString()}</span> ل.س</p>
                <p><b>العميل:</b> ${customerText}</p>
            </div>
        `;
        
        const result = await Swal.fire({
            title: 'هل تريد تأكيد وحفظ الفاتورة؟',
            html: confirmText,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'نعم، حفظ وإرسال الفاتورة',
            cancelButtonText: 'إلغاء وتعديل',
            confirmButtonColor: 'var(--accent-color)',
            background: '#161824',
            color: '#ffffff'
        });
        
        if (!result.isConfirmed) return;
        
        // 4. Build Backend JSON payload
        const payload = {
            customer_id: customerId || null,
            total_amount: totalAmount,
            cash_paid: cashPaid,
            debt_amount: debtAmount,
            notes: dom.checkoutNotes.value.trim(),
            items: state.cart.map(item => ({
                product_id: item.product_id || null,
                quantity: item.qty || 1,
                unit_price: item.unit_price || item.price,
                total_price: item.price,
                type: item.type, // 'product', 'telecom', 'playstation'
                // details for telecom
                telecom_company_id: item.telecom_company_id || null,
                telecom_phone: item.telecom_phone || null,
                telecom_amount: item.telecom_amount || null,
                // details for playstation
                ps_label: item.ps_label || null
            }))
        };
        
        // 5. Send POST to server
        dom.checkoutBtn.disabled = true;
        try {
            await api.post('api/sales', payload);
            
            // 6. Reset all states on Success
            resetCheckoutState();
            
            // 7. Refresh lists
            await loadProducts();
            await loadCustomers();
            await loadDashboardStats();
            await loadRecentSales();
            
            Swal.fire({
                icon: 'success',
                title: 'تم حفظ الفاتورة بنجاح!',
                text: 'تم تسجيل العملية المالية بنجاح بالصندوق والديون.',
                timer: 2000,
                showConfirmButton: false,
                background: '#161824',
                color: '#ffffff'
            });
            
            // Move back to Dashboard
            switchTab('dashboard');
            
        } catch (err) {
            Swal.fire({
                icon: 'error',
                title: 'فشل حفظ الفاتورة',
                text: err.error || 'حدث خطأ غير متوقع بالسيرفر أثناء حفظ المبيعات.',
                background: '#161824',
                color: '#ffffff'
            });
        } finally {
            dom.checkoutBtn.disabled = false;
        }
    };
}

// Switch tabs inside SPA
function switchTab(tabId) {
    state.activeTab = tabId;
    
    // Toggle active Nav items
    dom.navItems.forEach(item => {
        const itemTab = item.getAttribute('data-tab');
        if (itemTab === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
    
    // Toggle active views
    dom.tabPanes.forEach(pane => {
        if (pane.id === `pane-${tabId}`) {
            pane.classList.add('active');
        } else {
            pane.classList.remove('active');
        }
    });
    
    // Translate Title
    const titleTranslations = {
        'sales': 'البيع السريع',
        'dashboard': 'لوحة التحكم والمؤشرات',
        'customers': 'العملاء والديون والعملاء',
        'expenses': 'المصاريف اليومية ونفقات الصالة'
    };
    dom.headerTitle.textContent = titleTranslations[tabId] || 'GameCash';
}

// Recalculate Cart dynamically
function syncMobileToCart() {
    state.cart = [];
    
    // 1. Gather Selected Snacks
    for (const [prodId, qty] of Object.entries(state.mobileSnacks)) {
        if (qty > 0) {
            const product = state.products.find(p => p.id == prodId);
            if (product) {
                state.cart.push({
                    type: 'product',
                    product_id: product.id,
                    name: product.name,
                    qty: qty,
                    unit_price: product.selling_price,
                    price: product.selling_price * qty
                });
            }
        }
    }
    
    // 2. Add Telecom details if checked
    if (dom.enableTelecom.checked) {
        const price = parseInt(dom.telPrice.value) || 0;
        
        state.cart.push({
            type: 'telecom',
            name: `تحويل رصيد`,
            qty: 1,
            unit_price: price,
            price: price,
            telecom_company_id: null,
            telecom_phone: null,
            telecom_amount: null
        });
    }
    
    // 3. Add PlayStation details if checked
    if (dom.enablePlaystation.checked) {
        const label = dom.psLabel.value.trim() || 'لعب بلايستيشن';
        const price = parseInt(dom.psPrice.value) || 0;
        
        state.cart.push({
            type: 'playstation',
            name: label,
            qty: 1,
            unit_price: price,
            price: price,
            ps_label: label
        });
    }
    
    // 4. Render Cart summary
    renderCart();
}

// Render dynamic cart rows
function renderCart() {
    dom.cartItemsContainer.innerHTML = '';
    
    if (state.cart.length === 0) {
        dom.cartSummaryHeader.classList.add('hidden');
        dom.cartSummaryCard.classList.add('hidden');
        dom.snacksBtnText.textContent = "إضافة مأكولات ومشروبات من الكتالوج";
        updateDebtBalance();
        return;
    }
    
    dom.cartSummaryHeader.classList.remove('hidden');
    dom.cartSummaryCard.classList.remove('hidden');
    
    let total = 0;
    let snackCount = 0;
    
    state.cart.forEach(item => {
        total += item.price;
        if (item.type === 'product') {
            snackCount += item.qty;
        }
        
        const row = document.createElement('div');
        row.className = 'mobile-cart-item-row';
        row.innerHTML = `
            <div>
                <span class="item-title">${item.name}</span>
                ${item.type === 'product' ? `<span class="item-qty">x${item.qty}</span>` : ''}
            </div>
            <span class="item-price number-font">${item.price.toLocaleString()} ل.س</span>
        `;
        dom.cartItemsContainer.appendChild(row);
    });
    
    // Update total sum
    dom.cartTotalText.textContent = total.toLocaleString() + ' ل.س';
    
    // Update snacks trigger button text
    if (snackCount > 0) {
        dom.snacksBtnText.textContent = `تعديل المأكولات والمشروبات (${snackCount} قطع)`;
    } else {
        dom.snacksBtnText.textContent = "إضافة مأكولات ومشروبات من الكتالوج";
    }
    
    updateDebtBalance();
}

// Recalculate remaining debt
function updateDebtBalance() {
    const totalAmount = state.cart.reduce((sum, item) => sum + item.price, 0);
    const payMethod = dom.payCashRadio.checked ? 'cash' : dom.payDebtRadio.checked ? 'debt' : 'split';
    
    let cashPaid = 0;
    let debtAmount = 0;
    
    if (payMethod === 'cash') {
        cashPaid = totalAmount;
        debtAmount = 0;
        dom.cashPaidInput.value = totalAmount;
    } else if (payMethod === 'debt') {
        cashPaid = 0;
        debtAmount = totalAmount;
        dom.cashPaidInput.value = 0;
    } else if (payMethod === 'split') {
        cashPaid = parseInt(dom.cashPaidInput.value) || 0;
        if (cashPaid > totalAmount) {
            cashPaid = totalAmount;
            dom.cashPaidInput.value = totalAmount;
        }
        debtAmount = totalAmount - cashPaid;
    }
    
    dom.debtAmountInput.value = debtAmount.toLocaleString() + ' ل.س';
}

// Reset Form fields on transaction complete
function resetCheckoutState() {
    state.mobileSnacks = {};
    state.cart = [];
    
    dom.enableTelecom.checked = false;
    dom.telecomExpanded.classList.add('hidden');
    dom.telPhone.value = '';
    dom.telAmount.value = '';
    dom.telPrice.value = 0;
    
    dom.enablePlaystation.checked = false;
    dom.playstationExpanded.classList.add('hidden');
    dom.psLabel.value = '';
    dom.psPrice.value = 0;
    
    dom.payCashRadio.checked = true;
    dom.cashInputGroup.classList.add('hidden');
    dom.customerSelectGroup.classList.add('hidden');
    dom.debtDisplayGroup.classList.add('hidden');
    dom.cashPaidInput.value = 0;
    dom.customerSelect.value = '';
    dom.debtAmountInput.value = '0 ل.س';
    dom.checkoutNotes.value = '';
    
    renderCart();
}

// ----------------------------------------------------------------------
// RENDER SNACKS IN THE BOTTOM SHEET
// ----------------------------------------------------------------------
function renderSnacksInSheet() {
    dom.snacksContainer.innerHTML = '';
    
    if (!state.products || !Array.isArray(state.products) || state.products.length === 0) {
        dom.snacksContainer.innerHTML = `<p style="text-align: center; color: var(--text-secondary); padding: 20px;">عذراً، لا توجد منتجات مسجلة بالمخزن حالياً.</p>`;
        return;
    }
    
    state.products.forEach(prod => {
        const qtySelected = state.mobileSnacks[prod.id] || 0;
        const card = document.createElement('div');
        card.className = `mobile-snack-item ${qtySelected > 0 ? 'has-quantity' : ''}`;
        card.setAttribute('data-id', prod.id);
        
        let stockWarning = '';
        if (prod.stock <= 0) {
            stockWarning = `<span style="color: #ef4444; font-weight: 700; margin-right: 8px;">(نفد المخزون)</span>`;
        } else if (prod.stock < 5) {
            stockWarning = `<span style="color: #f59e0b; font-weight: 600; margin-right: 8px;">(مخزون قليل: ${prod.stock})</span>`;
        } else {
            stockWarning = `<span style="color: var(--text-muted); font-size: 10px; margin-right: 8px;">(المتوفر: ${prod.stock})</span>`;
        }
        
        card.innerHTML = `
            <div class="snack-info">
                <span class="snack-name">${prod.name}</span>
                <div class="snack-meta">
                    <span>${Number(prod.selling_price).toLocaleString()} ل.س</span>
                    ${stockWarning}
                </div>
            </div>
            
            <div class="snack-stepper">
                <button type="button" class="mobile-circle-btn minus" onclick="adjustSnackQty(${prod.id}, -1)"><i class="fa-solid fa-minus"></i></button>
                <span class="snack-qty-val number-font" id="mobile-sheet-qty-${prod.id}">${qtySelected}</span>
                <button type="button" class="mobile-circle-btn plus" onclick="adjustSnackQty(${prod.id}, 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
        `;
        dom.snacksContainer.appendChild(card);
    });
}

// Globally-accessible stepper modifier
window.adjustSnackQty = function(productId, delta) {
    const prod = state.products.find(p => p.id == productId);
    if (!prod) return;
    
    let currentQty = state.mobileSnacks[productId] || 0;
    let newQty = currentQty + delta;
    
    if (newQty < 0) newQty = 0;
    
    // Check stock limit
    if (delta > 0 && newQty > prod.stock) {
        Swal.fire({
            icon: 'warning',
            title: 'تجاوز المخزون',
            text: `عذراً، المتوفر في المخزن فقط ${prod.stock} قطع من ${prod.name}`,
            timer: 1500,
            showConfirmButton: false,
            background: '#161824',
            color: '#ffffff'
        });
        return;
    }
    
    state.mobileSnacks[productId] = newQty;
    
    // Update Sheet UI
    const qtySpan = document.getElementById(`mobile-sheet-qty-${productId}`);
    if (qtySpan) qtySpan.textContent = newQty;
    
    const card = document.querySelector(`.mobile-snack-item[data-id="${productId}"]`);
    if (card) {
        if (newQty > 0) {
            card.classList.add('has-quantity');
        } else {
            card.classList.remove('has-quantity');
        }
    }
};

// ----------------------------------------------------------------------
// RENDER CUSTOMERS LIST TABLE (WITH DEBT MANAGEMENT TRIGGER)
// ----------------------------------------------------------------------
function renderCustomersTable() {
    dom.customersTableBody.innerHTML = '';
    const query = dom.custSearchInput.value.toLowerCase().trim();
    
    if (!state.customers || !Array.isArray(state.customers)) {
        dom.customersTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 15px;">لا يوجد عملاء مطابقين للبحث.</td></tr>`;
        return;
    }
    
    const filtered = state.customers.filter(c => c.name.toLowerCase().includes(query));
    
    if (filtered.length === 0) {
        dom.customersTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-secondary); padding: 15px;">لا يوجد عملاء مطابقين للبحث.</td></tr>`;
        return;
    }
    
    filtered.forEach(cust => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight: 700; color: #ffffff;">${cust.name}</td>
            <td class="number-font" style="color: ${cust.total_debt > 0 ? '#ef4444' : 'var(--text-muted)'}; font-weight: 700;">${Number(cust.total_debt || 0).toLocaleString()} ل.س</td>
            <td>
                <button type="button" class="btn btn-primary" style="padding: 5px 10px; font-size: 11px; border-radius: 6px;" onclick="promptPayoffMobile(${cust.id}, '${cust.name}', ${cust.total_debt})">
                    <i class="fa-solid fa-coins"></i> سداد
                </button>
            </td>
        `;
        dom.customersTableBody.appendChild(tr);
    });
}

// Payoff Debt Dialog (SweetAlert Dialog specifically designed for mobile)
window.promptPayoffMobile = async function(customerId, customerName, currentDebt) {
    if (currentDebt <= 0) {
        Swal.fire({
            icon: 'info',
            title: 'حساب خالي من الديون',
            text: `العميل ${customerName} لا يترتب عليه أي ديون لسدادها حالياً.`,
            background: '#161824',
            color: '#ffffff'
        });
        return;
    }
    
    const { value: amount } = await Swal.fire({
        title: `سداد ديون: ${customerName}`,
        input: 'number',
        inputLabel: `قيمة الدين الحالية: ${currentDebt.toLocaleString()} ل.س. أدخل القيمة المدفوعة نقداً:`,
        inputPlaceholder: 'المبلغ المسدد...',
        inputAttributes: {
            min: 1,
            max: currentDebt,
            step: 500
        },
        showCancelButton: true,
        confirmButtonText: 'تأكيد السداد وقبض الكاش',
        cancelButtonText: 'إلغاء',
        confirmButtonColor: 'var(--success-color)',
        background: '#161824',
        color: '#ffffff',
        inputValidator: (value) => {
            if (!value || isNaN(value) || parseInt(value) <= 0) {
                return 'يرجى إدخال مبلغ سداد صحيح أكبر من الصفر!';
            }
            if (parseInt(value) > currentDebt) {
                return `مبلغ السداد لا يمكن أن يتجاوز الدين الكلي (${currentDebt.toLocaleString()} ل.س)!`;
            }
        }
    });
    
    if (!amount) return;
    
    const payoffVal = parseInt(amount);
    
    try {
        await api.post('api/customers/payments', {
            customer_id: customerId,
            amount_paid: payoffVal,
            notes: 'سداد ديون عبر واجهة الموبايل'
        });
        
        await loadCustomers();
        await loadDashboardStats();
        await loadRecentSales();
        
        Swal.fire({
            icon: 'success',
            title: 'تم السداد بنجاح!',
            text: `تم استلام ${payoffVal.toLocaleString()} ل.س نقداً وتصفيتها من ديون ${customerName}`,
            background: '#161824',
            color: '#ffffff'
        });
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'فشل عملية السداد',
            text: err.error || 'حدث خطأ في الاتصال بالشبكة.',
            background: '#161824',
            color: '#ffffff'
        });
    }
};
