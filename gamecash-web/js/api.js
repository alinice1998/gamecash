// C:\xampp2\htdocs\gamecash\gamecash-web\js\api.js

class ApiClient {
    constructor() {
        // Dynamically detect local base URL to support both local hosting and IP-based access (e.g., from Flutter/Mobile)
        // Relative path '../gamecash-backend/index.php' is used for web, but we allow an absolute config if needed.
        this.baseUrl = '../gamecash-backend/index.php';
    }

    // Set authentication token
    setToken(token) {
        localStorage.setItem('gamecash_token', token);
    }

    // Get current token
    getToken() {
        return localStorage.getItem('gamecash_token');
    }

    // Clear authentication data
    clearAuth() {
        localStorage.removeItem('gamecash_token');
        localStorage.removeItem('gamecash_user');
    }

    // Central fetch wrapper with automatic headers and error handling
    async request(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}?route=${endpoint}`;
        const headers = {
            'Content-Type': 'application/json'
        };

        const token = this.getToken();
        if (token) {
            headers['X-Auth-Token'] = token;
        }

        const config = {
            method: method,
            headers: headers
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'DELETE')) {
            config.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, config);
            const result = await response.json();

            if (!response.ok) {
                // If unauthorized (401), automatically boot user to login screen
                if (response.status === 401) {
                    this.clearAuth();
                    document.getElementById('app-shell').classList.add('hidden');
                    document.getElementById('login-overlay').classList.remove('hidden');
                    
                    // Show SweetAlert only if it was a real action, not initial check
                    if (endpoint !== 'api/auth/check') {
                        Swal.fire({
                            icon: 'warning',
                            title: 'انتهت صلاحية الجلسة',
                            text: 'يرجى تسجيل الدخول مجدداً.',
                            confirmButtonText: 'حسناً'
                        });
                    }
                }
                throw new Error(result.message || 'حدث خطأ غير متوقع في الخادم.');
            }

            return result;
        } catch (error) {
            console.error(`API Error on [${method}] ${endpoint}:`, error);
            throw error;
        }
    }

    // Helper shortcuts
    get(endpoint) { return this.request(endpoint, 'GET'); }
    post(endpoint, data) { return this.request(endpoint, 'POST', data); }
    put(endpoint, data) { return this.request(endpoint, 'PUT', data); }
    delete(endpoint, data) { return this.request(endpoint, 'DELETE', data); }
}

// Global API instance
const api = new ApiClient();
