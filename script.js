// ===== SETTINGS =====

// Free exchange rate API (no API key needed). All rates are based on 1 US Dollar.
const API_URL = "https://open.er-api.com/v6/latest/USD";

// The popular currencies shown in the list, with flag and full name
const POPULAR = [
  { code: "PKR", flag: "🇵🇰", name: "Pakistani Rupee" },
  { code: "INR", flag: "🇮🇳", name: "Indian Rupee" },
  { code: "EUR", flag: "🇪🇺", name: "Euro" },
  { code: "GBP", flag: "🇬🇧", name: "British Pound" },
  { code: "AED", flag: "🇦🇪", name: "UAE Dirham" },
  { code: "SAR", flag: "🇸🇦", name: "Saudi Riyal" },
  { code: "CAD", flag: "🇨🇦", name: "Canadian Dollar" },
  { code: "AUD", flag: "🇦🇺", name: "Australian Dollar" },
  { code: "BDT", flag: "🇧🇩", name: "Bangladeshi Taka" },
  { code: "CNY", flag: "🇨🇳", name: "Chinese Yuan" },
];

// ===== GET THE PAGE ELEMENTS WE NEED =====
const amountInput = document.getElementById("amount");
const fromSelect = document.getElementById("from-currency");
const toSelect = document.getElementById("to-currency");
const swapBtn = document.getElementById("swap-btn");
const resultFrom = document.getElementById("result-from");
const resultTo = document.getElementById("result-to");
const resultRate = document.getElementById("result-rate");
const errorBox = document.getElementById("error-box");
const retryBtn = document.getElementById("retry-btn");
const lastUpdated = document.getElementById("last-updated");
const popularTitle = document.getElementById("popular-title");
const popularList = document.getElementById("popular-list");

// This will hold the exchange rates after we download them
let rates = null;

// ===== HELPER FUNCTIONS =====

// Makes numbers look nice, e.g. 278450.2534 -> "278,450.25"
function formatNumber(number) {
  // Very small numbers need more decimals so they don't show as 0.00
  const decimals = number !== 0 && Math.abs(number) < 0.01 ? 6 : 2;
  return number.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

// Gets the full name of a currency, e.g. "USD" -> "US Dollar"
function getCurrencyName(code) {
  const popular = POPULAR.find((c) => c.code === code);
  if (popular) return popular.name;
  try {
    const names = new Intl.DisplayNames(["en"], { type: "currency" });
    return names.of(code);
  } catch (e) {
    return code;
  }
}

// Gets a flag emoji for a currency, e.g. "USD" -> 🇺🇸 (uses the first 2 letters)
function getFlag(code) {
  const popular = POPULAR.find((c) => c.code === code);
  if (popular) return popular.flag;
  if (code.startsWith("X")) return "🏳️"; // special codes (gold, etc.) have no country
  const letters = code.slice(0, 2).toUpperCase();
  return String.fromCodePoint(...[...letters].map((l) => 127397 + l.charCodeAt(0)));
}

// Converts an amount from one currency to another.
// All rates are "per 1 USD", so we go: from-currency -> USD -> to-currency
function convert(amount, from, to) {
  return (amount / rates[from]) * rates[to];
}

// ===== FILL THE DROPDOWNS WITH ALL CURRENCIES =====
function fillDropdowns() {
  const codes = Object.keys(rates).sort();
  fromSelect.innerHTML = "";
  toSelect.innerHTML = "";

  codes.forEach((code) => {
    const text = `${getFlag(code)} ${code} - ${getCurrencyName(code)}`;
    fromSelect.add(new Option(text, code));
    toSelect.add(new Option(text, code));
  });

  // Default choices
  fromSelect.value = "USD";
  toSelect.value = "PKR";
}

// ===== UPDATE THE RESULT ON THE SCREEN =====
function updateResult() {
  if (!rates) return; // rates not loaded yet

  const amount = parseFloat(amountInput.value);
  const from = fromSelect.value;
  const to = toSelect.value;

  // If the box is empty or not a valid number, ask for a number
  if (isNaN(amount) || amount < 0) {
    resultFrom.textContent = "Please enter a valid amount";
    resultTo.textContent = "";
    resultRate.textContent = "";
    popularList.innerHTML = "";
    return;
  }

  // Main result
  const converted = convert(amount, from, to);
  resultFrom.textContent = `${formatNumber(amount)} ${from} =`;
  resultTo.textContent = `${formatNumber(converted)} ${to}`;
  resultRate.textContent = `1 ${from} = ${formatNumber(convert(1, from, to))} ${to}`;

  // Popular conversions list
  popularTitle.textContent = `${formatNumber(amount)} ${from} in popular currencies`;
  popularList.innerHTML = "";
  POPULAR.forEach((currency) => {
    const value = convert(amount, from, currency.code);
    const item = document.createElement("li");
    item.innerHTML = `
      <div class="currency-info">
        <span class="flag">${currency.flag}</span>
        <div>
          <div class="code">${currency.code}</div>
          <div class="name">${currency.name}</div>
        </div>
      </div>
      <div class="value">${formatNumber(value)}</div>
    `;
    popularList.appendChild(item);
  });
}

// ===== DOWNLOAD THE LIVE RATES FROM THE INTERNET =====
async function loadRates() {
  errorBox.hidden = true;
  resultFrom.textContent = "Loading rates…";

  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    // The API says "success" when everything is OK
    if (data.result !== "success") throw new Error("API error");

    rates = data.rates;
    fillDropdowns();

    // Show when the rates were last updated (in the user's local time)
    const date = new Date(data.time_last_update_unix * 1000);
    lastUpdated.textContent = "Rates last updated: " + date.toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    updateResult();
  } catch (error) {
    // Something went wrong (no internet, API down, etc.) - show a friendly message
    resultFrom.textContent = "";
    resultTo.textContent = "";
    resultRate.textContent = "";
    errorBox.hidden = false;
  }
}

// ===== LISTEN FOR WHAT THE USER DOES =====

// Update the result every time the user types or picks a currency
amountInput.addEventListener("input", updateResult);
fromSelect.addEventListener("change", updateResult);
toSelect.addEventListener("change", updateResult);

// Swap button: switch the "from" and "to" currencies
swapBtn.addEventListener("click", () => {
  const temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;
  updateResult();
});

// "Try again" button in the error message
retryBtn.addEventListener("click", loadRates);

// ===== START: load the rates when the page opens =====
loadRates();
