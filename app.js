// Currency PWA - Main Application

const API_URL = 'https://api.frankfurter.app';
const CORS_PROXY = '';

// State
let currencies = [];
let rates = {};
let favorites = JSON.parse(localStorage.getItem('favorites') || '["USD","EUR","JPY","GBP"]');
let lastRates = JSON.parse(localStorage.getItem('lastRates') || '{}');
let lastFetchTime = parseInt(localStorage.getItem('lastFetchTime') || '0');

// DOM Elements
const fromCurrency = document.getElementById('fromCurrency');
const toCurrency = document.getElementById('toCurrency');
const fromAmount = document.getElementById('fromAmount');
const toAmount = document.getElementById('toAmount');
const swapBtn = document.getElementById('swapBtn');
const convertBtn = document.getElementById('convertBtn');
const exchangeRateEl = document.getElementById('exchangeRate');
const lastUpdateEl = document.getElementById('lastUpdate');
const favoritesList = document.getElementById('favoritesList');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadCurrencies();
    populateCurrencyDropdowns();
    loadFavorites();
    setupEventListeners();
    registerServiceWorker();
}

// Load currency list from API
async function loadCurrencies() {
    try {
        // Check if we need to fetch new rates (cache for 1 hour)
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        if (now - lastFetchTime < oneHour && Object.keys(lastRates).length > 0) {
            rates = lastRates;
            currencies = Object.keys(rates);
            updateLastUpdateTime();
            return;
        }

        // Fetch from API - use relative path on Vercel, direct API for local dev
        const isVercel = window.location.hostname.includes('vercel.app');
        const apiEndpoint = isVercel ? '/api/rates' : `${API_URL}/latest`;
        const response = await fetch(apiEndpoint);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        rates = data.rates;
        currencies = ['EUR', ...Object.keys(rates)]; // EUR is the base
        
        // Frankfurter doesn't support TWD, so we add it manually
        // 1 USD ≈ 31.5 TWD, and 1 EUR ≈ 1.18 USD
        // So 1 EUR ≈ 1.18 * 31.5 ≈ 37.2 TWD
        rates['TWD'] = rates['TWD'] || (31.5 * (rates['USD'] || 1.1797));
        if (!currencies.includes('TWD')) currencies.push('TWD');
        
        // Cache the rates
        lastRates = rates;
        lastFetchTime = now;
        localStorage.setItem('lastRates', JSON.stringify(rates));
        localStorage.setItem('lastFetchTime', lastFetchTime.toString());
        
        updateLastUpdateTime();
        showToast('匯率已更新');
    } catch (error) {
        console.error('Error fetching rates:', error);
        // Use cached data if available
        if (Object.keys(lastRates).length > 0) {
            rates = lastRates;
            currencies = ['EUR', ...Object.keys(rates)];
            if (!currencies.includes('TWD')) {
                rates['TWD'] = 31.5 * (rates['USD'] || 1.1797);
                currencies.push('TWD');
            }
            showToast('使用離線緩存匯率');
        } else {
            showToast('無法取得匯率，請檢查網路');
        }
    }
}

function updateLastUpdateTime() {
    const date = new Date(lastFetchTime);
    lastUpdateEl.textContent = `最後更新：${date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
}

// Populate currency dropdowns
function populateCurrencyDropdowns() {
    const commonCurrencies = ['TWD', 'USD', 'EUR', 'JPY', 'GBP', 'CNY', 'KRW', 'HKD', 'AUD', 'CAD'];
    
    // Sort to put common currencies first
    const sortedCurrencies = [
        ...commonCurrencies.filter(c => currencies.includes(c)),
        ...currencies.filter(c => !commonCurrencies.includes(c))
    ];

    [fromCurrency, toCurrency].forEach(select => {
        select.innerHTML = sortedCurrencies.map(code => 
            `<option value="${code}">${code}</option>`
        ).join('');
    });

    // Set defaults
    fromCurrency.value = 'USD';
    toCurrency.value = 'TWD';
}

// Setup event listeners
function setupEventListeners() {
    // Convert on button click
    convertBtn.addEventListener('click', convert);
    
    // Convert on amount change
    fromAmount.addEventListener('input', debounce(convert, 300));
    
    // Swap currencies
    swapBtn.addEventListener('click', swapCurrencies);
    
    // Currency change triggers convert
    fromCurrency.addEventListener('change', convert);
    toCurrency.addEventListener('change', convert);
}

// Convert currency
// All rates are EUR-based: rates[X] = X per 1 EUR
// To convert A to B: (1 A) * (1 EUR / rates[A]) * (rates[B] / 1 EUR) = rates[B] / rates[A]
function convert() {
    const from = fromCurrency.value;
    const to = toCurrency.value;
    const amount = parseFloat(fromAmount.value) || 0;
    
    if (amount === 0) {
        toAmount.value = '';
        exchangeRateEl.textContent = '';
        return;
    }

    let rate;
    if (from === to) {
        rate = 1;
    } else {
        // Convert via EUR: A -> EUR -> B
        // 1 A = (1/rates[A]) EUR
        // (1/rates[A]) EUR = (1/rates[A]) * rates[B] B
        rate = (rates[to] || 0) / (rates[from] || 0);
    }

    const result = amount * rate;
    toAmount.value = result.toFixed(2);
    exchangeRateEl.textContent = `1 ${from} = ${rate.toFixed(4)} ${to}`;
}

// Swap currencies
function swapCurrencies() {
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;
    convert();
    showToast('已交換幣別');
}

// Load favorites
function loadFavorites() {
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="hint">點擊 💛 可以收藏常用幣別</p>';
        return;
    }

    favoritesList.innerHTML = favorites.map(code => `
        <div class="favorite-item" data-code="${code}">
            <span>${code}</span>
            <span class="remove" onclick="removeFavorite('${code}')">✕</span>
        </div>
    `).join('') + `
        <div class="hint" style="width:100%; margin-top:8px;">
            長按可設為主要幣別
        </div>
    `;

    // Click to use favorite
    document.querySelectorAll('.favorite-item').forEach(item => {
        item.addEventListener('click', () => {
            toCurrency.value = item.dataset.code;
            convert();
            showToast(`已切換為 ${item.dataset.code}`);
        });

        // Long press to set as from currency
        let pressTimer;
        item.addEventListener('mousedown', () => {
            pressTimer = setTimeout(() => {
                fromCurrency.value = item.dataset.code;
                convert();
                showToast(`已設為來源幣別 ${item.dataset.code}`);
            }, 500);
        });
        item.addEventListener('mouseup', () => clearTimeout(pressTimer));
        item.addEventListener('mouseleave', () => clearTimeout(pressTimer));
    });
}

// Remove from favorites
function removeFavorite(code) {
    favorites = favorites.filter(c => c !== code);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    loadFavorites();
    showToast(`已移除 ${code}`);
}

// Show toast message
function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Register Service Worker for PWA
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('service-worker.js');
            console.log('ServiceWorker registered:', registration.scope);
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    }
}

// Add to favorites (can be called from console)
window.addToFavorites = function(code) {
    if (!favorites.includes(code)) {
        favorites.push(code);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        loadFavorites();
        showToast(`已收藏 ${code}`);
    }
};
