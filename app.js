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
const ratesPanelEl = document.getElementById('ratesPanel');
const lastUpdateEl = document.getElementById('lastUpdate');
const toastEl = document.getElementById('toast');
const modalEl = document.getElementById('currencyModal');
const addBtnEl = document.getElementById('addBtn');
const modalCloseEl = document.getElementById('modalClose');
const currencySearchEl = document.getElementById('currencySearch');
const currencyGridEl = document.getElementById('currencyGrid');
const saveCurrencyBtnEl = document.getElementById('saveCurrencyBtn');

// Currency names (subset for display)
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
            sortCurrencies();
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

        sortCurrencies();

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
            sortCurrencies();
            showToast('使用離線緩存匯率');
        } else {
            showToast('無法取得匯率');
        }
    }
}

function sortCurrencies() {
    currencies.sort((a, b) => {
        if (a === baseCurrency) return -1;
        if (b === baseCurrency) return 1;
        return a.localeCompare(b);
    });
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

// Render everything
function renderAll() {
    baseAmountEl.value = baseAmount;
    baseCurrencyEl.textContent = `${baseCurrency} ▾`;
    renderCurrencyList();
    renderRatesPanel();
}

function renderCurrencyList() {
    // Show selected currencies (excluding base) in left panel
    const listCurrencies = selectedCurrencies.filter(c => c !== baseCurrency);

    if (listCurrencies.length === 0) {
        currencyListEl.innerHTML = '<p class="empty-hint">點擊 + 新增幣別</p>';
        return;
    }

    currencyListEl.innerHTML = listCurrencies.map(code => {
        const rate = getRate(code);
        const name = currencyNames[code] || code;
        return `
            <div class="currency-item" data-code="${code}">
                <div>
                    <span class="flag">${getFlagEmoji(code)}</span>
                    <span class="code">${code}</span>
                    <div class="name">${name}</div>
                </div>
                <div>
                    <div class="rate">${rate.toFixed(4)}</div>
                    <div class="unit">${baseCurrency} → ${code}</div>
                </div>
            </div>
        `;
    }).join('');
}

function renderRatesPanel() {
    const amount = parseFloat(baseAmount) || 0;

    if (selectedCurrencies.length === 0) {
        ratesPanelEl.innerHTML = '<p class="empty-hint">點擊右上角 + 新增幣別</p>';
        return;
    }

    ratesPanelEl.innerHTML = selectedCurrencies.map(code => {
        const rate = getRate(code);
        const converted = amount * rate;
        const name = currencyNames[code] || code;

        return `
            <div class="rate-card" data-code="${code}">
                <div class="rate-card-header">
                    <div>
                        <div class="code">${getFlagEmoji(code)} ${code}</div>
                        <div class="name">${name}</div>
                    </div>
                    <span class="rate-badge">${baseCurrency} → ${code}</span>
                </div>
                <div class="converted">${converted.toFixed(4)} ${code}</div>
                <div class="rate-info">1 ${baseCurrency} = ${rate.toFixed(4)} ${code}</div>
            </div>
        `;
    }).join('');
}

function renderCurrencyGrid(filter = '') {
    const filterUpper = filter.toUpperCase();
    const allCurrencies = [...currencies].sort();

    currencyGridEl.innerHTML = allCurrencies.map(code => {
        const isSelected = selectedCurrencies.includes(code);
        const name = currencyNames[code] || code;
        return `
            <div class="grid-item ${isSelected ? 'selected' : ''}" data-code="${code}">
                <span class="check">✓</span>
                <span class="code">${code}</span>
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
        renderRatesPanel();
    }, 200));

    // Base currency selector (simple: just cycle through selected)
    baseCurrencyEl.addEventListener('click', () => {
        if (selectedCurrencies.length < 2) {
            showToast('請先新增多個幣別');
            return;
        }
        const idx = selectedCurrencies.indexOf(baseCurrency);
        const nextIdx = (idx + 1) % selectedCurrencies.length;
        const prev = baseCurrency;
        baseCurrency = selectedCurrencies[nextIdx];
        selectedCurrencies = selectedCurrencies.filter(c => c !== baseCurrency);
        if (!selectedCurrencies.includes(prev)) selectedCurrencies.unshift(prev);
        localStorage.setItem('baseCurrency', baseCurrency);
        localStorage.setItem('selectedCurrencies', JSON.stringify(selectedCurrencies));
        renderAll();
        showToast(`基準幣別：${baseCurrency}`);
    });

    // Open modal
    addBtnEl.addEventListener('click', () => {
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

    // Click on currency list item to use it
    currencyListEl.addEventListener('click', (e) => {
        const item = e.target.closest('.currency-item');
        if (item) {
            // Set as base currency
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

    // Click on rate card
    ratesPanelEl.addEventListener('click', (e) => {
        const card = e.target.closest('.rate-card');
        if (card) {
            // Copy converted amount to clipboard
            const text = card.querySelector('.converted').textContent;
            navigator.clipboard?.writeText(text).then(() => {
                showToast('已複製');
            });
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
