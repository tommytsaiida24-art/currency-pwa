// Currency PWA v1.10 - Redesigned UI

const API_URL = 'https://api.frankfurter.app';

// State
let currencies = [];
let rates = {};
let selectedCurrencies = JSON.parse(localStorage.getItem('selectedCurrencies') || '["USD","EUR","JPY","GBP","TWD"]');
let baseCurrency = localStorage.getItem('baseCurrency') || 'USD';
let baseAmount = parseFloat(localStorage.getItem('baseAmount') || '1');
let lastRates = JSON.parse(localStorage.getItem('lastRates') || '{}');
let lastFetchTime = parseInt(localStorage.getItem('lastFetchTime') || '0');

// DOM Elements
const baseAmountEl = document.getElementById('baseAmount');
const baseCurrencyEl = document.getElementById('baseCurrency');
const currencyListEl = document.getElementById('currencyList');
const lastUpdateEl = document.getElementById('lastUpdate');
const toastEl = document.getElementById('toast');
const modalEl = document.getElementById('currencyModal');
const addBtnEl = document.getElementById('addBtn');
const modalCloseEl = document.getElementById('modalClose');
const currencySearchEl = document.getElementById('currencySearch');
const currencyGridEl = document.getElementById('currencyGrid');
const saveCurrencyBtnEl = document.getElementById('saveCurrencyBtn');

// Currency names
const currencyNames = {
    USD: '美元', EUR: '歐元', JPY: '日圓', GBP: '英鎊', TWD: '台幣',
    CNY: '人民幣', KRW: '韓元', HKD: '港幣', AUD: '澳幣', CAD: '加幣',
    CHF: '瑞士法郎', SGD: '新加坡幣', NZD: '紐西蘭幣', SEK: '瑞典克朗',
    NOK: '挪威克朗', DKK: '丹麥克朗', MXN: '墨西哥披索', INR: '印度盧比',
    BRL: '巴西雷亞爾', ZAR: '南非蘭特', RUB: '俄羅斯盧布', TRY: '土耳其里拉',
    THB: '泰銖', MYR: '馬來西亞幣', IDR: '印尼盾', PHP: '菲披索',
    VND: '越南盾', AED: '阿聯酋迪拉姆', SAR: '沙烏地里亞爾',
    PLN: '波蘭茲羅提', CZK: '捷克克朗', HUF: '匈牙利福林',
    ILS: '以色列謝克', CLP: '智利披索', COP: '哥倫比亞披索',
    PEN: '秘魯索爾', ARS: '阿根廷披索'
};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
    await loadCurrencies();
    setupEventListeners();
    renderAll();
    registerServiceWorker();
}

// Load currencies from API
async function loadCurrencies() {
    try {
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;

        if (now - lastFetchTime < oneHour && Object.keys(lastRates).length > 0) {
            rates = lastRates;
            currencies = Object.keys(rates);
            updateLastUpdateTime();
            return;
        }

        const response = await fetch(`${API_URL}/latest`);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        rates = data.rates;
        currencies = Object.keys(rates);

        // Add TWD manually
        rates['TWD'] = rates['TWD'] || (31.5 * (rates['USD'] || 1.1797));
        if (!currencies.includes('TWD')) currencies.push('TWD');

        currencies.sort((a, b) => a.localeCompare(b));

        lastRates = rates;
        lastFetchTime = now;
        localStorage.setItem('lastRates', JSON.stringify(rates));
        localStorage.setItem('lastFetchTime', lastFetchTime.toString());

        updateLastUpdateTime();
        showToast('匯率已更新');
    } catch (error) {
        console.error('Error fetching rates:', error);
        if (Object.keys(lastRates).length > 0) {
            rates = lastRates;
            currencies = Object.keys(rates);
            currencies.sort((a, b) => a.localeCompare(b));
            showToast('使用離線緩存匯率');
        } else {
            showToast('無法取得匯率');
        }
    }
}

function updateLastUpdateTime() {
    if (!lastFetchTime) return;
    const date = new Date(lastFetchTime);
    lastUpdateEl.textContent = `更新 ${date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}`;
}

// Get conversion rate from base currency to target
function getRate(targetCode) {
    const base = baseCurrency;
    const target = targetCode;

    if (base === target) return 1;

    // All rates are EUR-based: rates[X] = X per 1 EUR
    const baseRate = rates[base] || 1;
    const targetRate = rates[target] || 0;

    return targetRate / baseRate;
}

// Render all UI
function renderAll() {
    baseAmountEl.value = baseAmount;
    baseCurrencyEl.textContent = `${baseCurrency} ▾`;
    document.getElementById('baseFlag').textContent = getFlagEmoji(baseCurrency);
    renderCurrencyList();
}

// Render the currency list
function renderCurrencyList() {
    const amount = parseFloat(baseAmount) || 0;

    if (selectedCurrencies.length === 0) {
        currencyListEl.innerHTML = '<p class="empty-hint">點擊右上角 + 新增幣別</p>';
        return;
    }

    currencyListEl.innerHTML = selectedCurrencies.map(code => {
        const rate = getRate(code);
        const converted = amount * rate;
        const name = currencyNames[code] || code;
        return `
            <div class="currency-item" data-code="${code}">
                <div class="currency-item-left">
                    <span class="flag">${getFlagEmoji(code)}</span>
                    <div>
                        <div class="code">${code}</div>
                        <div class="name">${name}</div>
                        <span class="rate-badge">${baseCurrency} → ${code}</span>
                    </div>
                </div>
                <div>
                    <div class="converted">${converted.toFixed(4)}</div>
                    <div class="rate-label">1 ${baseCurrency} = ${rate.toFixed(4)}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Render currency selection grid in modal
function renderCurrencyGrid(filter = '') {
    const allCurrencies = [...currencies].sort();
    const filterUpper = filter.toUpperCase();

    const filtered = filterUpper
        ? allCurrencies.filter(c => c.includes(filterUpper) || (currencyNames[c] || '').includes(filterUpper))
        : allCurrencies;

    currencyGridEl.innerHTML = filtered.map(code => {
        const isSelected = selectedCurrencies.includes(code);
        const name = currencyNames[code] || code;
        return `
            <div class="grid-item ${isSelected ? 'selected' : ''}" data-code="${code}">
                <span class="check">✓</span>
                <span class="code">${code}</span>
                <span class="grid-name">${name}</span>
            </div>
        `;
    }).join('');

    // Add click handlers
    document.querySelectorAll('.grid-item').forEach(item => {
        item.addEventListener('click', () => {
            const code = item.dataset.code;
            if (selectedCurrencies.includes(code)) {
                if (selectedCurrencies.length > 1) {
                    selectedCurrencies = selectedCurrencies.filter(c => c !== code);
                    item.classList.remove('selected');
                } else {
                    showToast('至少需要一個幣別');
                }
            } else {
                selectedCurrencies.push(code);
                item.classList.add('selected');
            }
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Base amount change
    baseAmountEl.addEventListener('input', debounce(() => {
        baseAmount = parseFloat(baseAmountEl.value) || 0;
        localStorage.setItem('baseAmount', baseAmount.toString());
        renderCurrencyList();
    }, 200));

    // Base currency selector - cycle through selected currencies
    baseCurrencyEl.addEventListener('click', () => {
        if (selectedCurrencies.length < 2) {
            showToast('請先新增多個幣別');
            return;
        }
        const idx = selectedCurrencies.indexOf(baseCurrency);
        const nextIdx = (idx + 1) % selectedCurrencies.length;
        const prev = baseCurrency;
        baseCurrency = selectedCurrencies[nextIdx];
        // Move previous base to front of list
        selectedCurrencies = selectedCurrencies.filter(c => c !== baseCurrency);
        if (!selectedCurrencies.includes(prev)) selectedCurrencies.unshift(prev);
        localStorage.setItem('baseCurrency', baseCurrency);
        localStorage.setItem('selectedCurrencies', JSON.stringify(selectedCurrencies));
        renderAll();
        showToast(`基準幣別：${baseCurrency}`);
    });

    // Open modal
    addBtnEl.addEventListener('click', () => {
        currencySearchEl.value = '';
        renderCurrencyGrid();
        modalEl.classList.add('open');
    });

    // Close modal
    modalCloseEl.addEventListener('click', () => {
        modalEl.classList.remove('open');
    });

    modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) modalEl.classList.remove('open');
    });

    // Search filter
    currencySearchEl.addEventListener('input', () => {
        renderCurrencyGrid(currencySearchEl.value);
    });

    // Save currencies
    saveCurrencyBtnEl.addEventListener('click', () => {
        localStorage.setItem('selectedCurrencies', JSON.stringify(selectedCurrencies));
        modalEl.classList.remove('open');
        renderAll();
        showToast('幣別已儲存');
    });

    // Click on currency list item to set as base
    currencyListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.currency-item');
        if (item) {
            const prev = baseCurrency;
            baseCurrency = item.dataset.code;
            selectedCurrencies = selectedCurrencies.filter(c => c !== baseCurrency);
            if (!selectedCurrencies.includes(prev)) selectedCurrencies.unshift(prev);
            localStorage.setItem('baseCurrency', baseCurrency);
            localStorage.setItem('selectedCurrencies', JSON.stringify(selectedCurrencies));
            renderAll();
            showToast(`基準幣別：${baseCurrency}`);
        }
    });
}

// Show toast
function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => toastEl.classList.remove('show'), 2000);
}

// Debounce
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

// Get flag emoji from currency code
function getFlagEmoji(code) {
    const flags = {
        USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', JPY: '🇯🇵', TWD: '🇹🇼',
        CNY: '🇨🇳', KRW: '🇰🇷', HKD: '🇭🇰', AUD: '🇦🇺', CAD: '🇨🇦',
        CHF: '🇨🇭', SGD: '🇸🇬', NZD: '🇳🇿', SEK: '🇸🇪', NOK: '🇳🇴',
        DKK: '🇩🇰', MXN: '🇲🇽', INR: '🇮🇳', BRL: '🇧🇷', ZAR: '🇿🇦',
        RUB: '🇷🇺', TRY: '🇹🇷', THB: '🇹🇭', MYR: '🇲🇾', IDR: '🇮🇩',
        PHP: '🇵🇭', VND: '🇻🇳', AED: '🇦🇪', SAR: '🇸🇦',
        PLN: '🇵🇱', CZK: '🇨🇿', HUF: '🇭🇺', ILS: '🇮🇱', CLP: '🇨🇱',
        COP: '🇨🇴', PEN: '🇵🇪', ARS: '🇦🇷'
    };
    return flags[code] || '🏳️';
}

// Register Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('service-worker.js');
        } catch (error) {
            console.log('ServiceWorker registration failed:', error);
        }
    }
}
