const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const cartKey = 'veloura-cart';
const accountsKey = 'veloura-accounts';
const sessionKey = 'veloura-session';

function getCart() {
    try {
        return JSON.parse(localStorage.getItem(cartKey)) || [];
    } catch (error) {
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem(cartKey, JSON.stringify(cart));
}

function getAccounts() {
    try {
        return JSON.parse(localStorage.getItem(accountsKey)) || [];
    } catch (error) {
        return [];
    }
}

function getSignedInAccount() {
    try {
        const session = JSON.parse(localStorage.getItem(sessionKey));
        return getAccounts().find((account) => account.email === session?.email) || null;
    } catch (error) {
        return null;
    }
}

function setSignedInAccount(email) {
    localStorage.setItem(sessionKey, JSON.stringify({ email }));
}

function encodeBytes(bytes) {
    return btoa(String.fromCharCode(...new Uint8Array(bytes)));
}

async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' }, key, 256);
    return encodeBytes(hash);
}

function continueAfterSignIn() {
    const destination = getCart().length ? 'checkout.html' : 'index.html';
    window.location.href = destination;
}

function setupAccount() {
    const signInForm = document.getElementById('signInForm');
    const createForm = document.getElementById('createAccountForm');
    if (!signInForm || !createForm) return;

    const accountAccess = document.getElementById('accountAccess');
    const accountSession = document.getElementById('accountSession');
    const signInTab = document.getElementById('signInTab');
    const createTab = document.getElementById('createTab');
    const switchForm = (showCreate) => {
        signInForm.hidden = showCreate;
        createForm.hidden = !showCreate;
        signInTab.classList.toggle('active', !showCreate);
        createTab.classList.toggle('active', showCreate);
        signInTab.setAttribute('aria-selected', String(!showCreate));
        createTab.setAttribute('aria-selected', String(showCreate));
    };

    signInTab.addEventListener('click', () => switchForm(false));
    createTab.addEventListener('click', () => switchForm(true));

    const signedInAccount = getSignedInAccount();
    if (signedInAccount) {
        accountAccess.hidden = true;
        accountSession.hidden = false;
        document.getElementById('accountWelcome').textContent = `${signedInAccount.name} · ${signedInAccount.email}`;
        document.getElementById('signOutButton').addEventListener('click', () => {
            localStorage.removeItem(sessionKey);
            window.location.reload();
        });
    }

    signInForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = document.getElementById('signInMessage');
        const email = document.getElementById('signInEmail').value.trim().toLowerCase();
        const password = document.getElementById('signInPassword').value;
        const account = getAccounts().find((entry) => entry.email === email);
        if (!account) {
            message.textContent = 'No account was found for that email. Create an account to continue.';
            return;
        }
        try {
            const salt = Uint8Array.from(atob(account.salt), (character) => character.charCodeAt(0));
            const passwordHash = await hashPassword(password, salt);
            if (passwordHash !== account.passwordHash) {
                message.textContent = 'That password does not match. Please try again.';
                return;
            }
            setSignedInAccount(email);
            continueAfterSignIn();
        } catch (error) {
            message.textContent = 'Secure password checks are unavailable in this browser context. Open the site on localhost and try again.';
        }
    });

    createForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = document.getElementById('createAccountMessage');
        const name = document.getElementById('createName').value.trim();
        const email = document.getElementById('createEmail').value.trim().toLowerCase();
        const password = document.getElementById('createPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const accounts = getAccounts();
        if (accounts.some((account) => account.email === email)) {
            message.textContent = 'An account already exists for this email. Sign in instead.';
            return;
        }
        if (password !== confirmPassword) {
            message.textContent = 'The passwords do not match.';
            return;
        }
        try {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            accounts.push({ email, name, salt: encodeBytes(salt), passwordHash: await hashPassword(password, salt), delivery: {} });
            localStorage.setItem(accountsKey, JSON.stringify(accounts));
            setSignedInAccount(email);
            continueAfterSignIn();
        } catch (error) {
            message.textContent = 'Secure password checks are unavailable in this browser context. Open the site on localhost and try again.';
        }
    });
}

function requireAccount() {
    const isCheckoutPage = document.getElementById('detailsForm');
    const isPaymentPage = document.getElementById('paymentForm');
    if ((isCheckoutPage || isPaymentPage) && !getSignedInAccount()) {
        window.location.replace('account.html?return=checkout.html');
        return false;
    }
    return true;
}

function getTotals(cart = getCart()) {
    const subtotal = cart.reduce((total, item) => total + Number(item.price), 0);
    const shipping = subtotal > 0 && subtotal <= 120 ? 18 : 0;
    const tax = subtotal * 0.08;
    const discount = subtotal > 150 ? 20 : 0;
    return { subtotal, shipping, tax, discount, total: subtotal + shipping + tax - discount };
}

function applyTheme() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    const savedTheme = localStorage.getItem('veloura-theme');
    const darkMode = savedTheme === 'dark';
    document.body.classList.toggle('dark-mode', darkMode);
    toggle.textContent = darkMode ? '☀' : '☾';
    toggle.setAttribute('aria-label', darkMode ? 'Switch to light mode' : 'Switch to dark mode');
    toggle.setAttribute('title', darkMode ? 'Switch to light mode' : 'Switch to dark mode');
}

function updateCartCount() {
    const count = document.getElementById('cartCount');
    if (count) count.textContent = String(getCart().length);
}

function setupMobileNavigation() {
    document.querySelectorAll('.menu-toggle').forEach((button) => {
        const navigation = document.getElementById(button.getAttribute('aria-controls'));
        if (!navigation) return;

        const setOpen = (isOpen) => {
            navigation.classList.toggle('mobile-open', isOpen);
            button.setAttribute('aria-expanded', String(isOpen));
            button.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
        };

        button.addEventListener('click', () => setOpen(button.getAttribute('aria-expanded') !== 'true'));
        navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
        document.addEventListener('click', (event) => {
            if (!navigation.contains(event.target) && !button.contains(event.target)) setOpen(false);
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') setOpen(false);
        });
    });
}

function renderCart() {
    const cartItems = document.getElementById('cartItems');
    if (!cartItems) return;
    const cart = getCart();
    const totals = getTotals(cart);

    cartItems.innerHTML = cart.length ? cart.map((item, index) => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" />
            <div><h4>${item.name}</h4><p>Qty: 1</p></div>
            <div class="cart-item-price">
                <span>${currency.format(item.price)}</span>
                <button class="remove-item" data-index="${index}">Remove</button>
            </div>
        </div>
    `).join('') : '<div style="padding: 22px; color: var(--muted);">Your cart is empty.</div>';

    const values = {
        cartSubtotal: totals.subtotal,
        cartShipping: totals.shipping,
        cartTotal: totals.total
    };
    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = currency.format(value);
    });

    cartItems.querySelectorAll('.remove-item').forEach((button) => {
        button.addEventListener('click', () => {
            const updatedCart = getCart();
            updatedCart.splice(Number(button.dataset.index), 1);
            saveCart(updatedCart);
            renderCart();
            updateCartCount();
        });
    });
    updateCartCount();
}

function setupShop() {
    const overlay = document.getElementById('cartOverlay');
    const openButton = document.getElementById('openCartBtn');
    const closeButton = document.getElementById('closeCartBtn');
    const toggle = document.getElementById('themeToggle');
    const searchToggle = document.getElementById('searchToggle');
    const searchPanel = document.getElementById('searchPanel');
    const searchInput = document.getElementById('productSearch');
    const searchClear = document.getElementById('searchClear');
    const searchStatus = document.getElementById('searchStatus');

    openButton?.addEventListener('click', () => overlay?.classList.add('open'));
    closeButton?.addEventListener('click', () => overlay?.classList.remove('open'));
    overlay?.addEventListener('click', (event) => {
        if (event.target === overlay) overlay.classList.remove('open');
    });
    toggle?.addEventListener('click', () => {
        const isDark = !document.body.classList.contains('dark-mode');
        localStorage.setItem('veloura-theme', isDark ? 'dark' : 'light');
        applyTheme();
    });

    const productCards = document.querySelectorAll('.product-card');
    const catalogSections = document.querySelectorAll('.catalog-section');
    let activeFilter = 'all';
    const applyCatalogFilters = () => {
        const query = searchInput.value.trim().toLowerCase();
        let visibleCount = 0;
        productCards.forEach((card) => {
            const searchableText = `${card.dataset.name} ${card.dataset.category} ${card.textContent}`.toLowerCase();
            const department = card.querySelector('.product-meta > span')?.textContent.trim().toLowerCase();
            const tag = card.querySelector('.tag')?.textContent.trim().toLowerCase();
            const matchesFilter = activeFilter === 'all'
                || (activeFilter === 'new' && (card.dataset.category === 'new' || tag === 'new'))
                || (activeFilter === 'bestsellers' && (card.dataset.category === 'bestsellers' || tag === 'bestseller'))
                || (activeFilter === 'under $200' && Number(card.dataset.price) < 200)
                || (activeFilter === 'accessories' && department === 'accessories');
            const matches = matchesFilter && (!query || searchableText.includes(query));
            card.style.display = matches ? '' : 'none';
            if (matches) visibleCount += 1;
        });
        catalogSections.forEach((section) => {
            const hasVisibleProduct = [...section.querySelectorAll('.product-card')]
                .some((card) => card.style.display !== 'none');
            section.hidden = (Boolean(query) || activeFilter !== 'all') && !hasVisibleProduct;
        });
        searchStatus.textContent = query || activeFilter !== 'all'
            ? `${visibleCount} result${visibleCount === 1 ? '' : 's'}`
            : '';
    };

    searchToggle?.addEventListener('click', () => {
        const isOpen = searchPanel.classList.toggle('open');
        searchPanel.setAttribute('aria-hidden', String(!isOpen));
        if (isOpen) searchInput.focus();
    });
    searchInput?.addEventListener('input', applyCatalogFilters);
    searchClear?.addEventListener('click', () => {
        searchInput.value = '';
        applyCatalogFilters();
        searchInput.focus();
    });

    document.querySelectorAll('.add-to-cart').forEach((button) => {
        button.addEventListener('click', () => {
            const card = button.closest('.product-card');
            const cart = getCart();
            cart.push({ name: card.dataset.name, price: Number(card.dataset.price), image: card.dataset.image });
            saveCart(cart);
            renderCart();
            button.textContent = 'Added';
            button.style.background = 'var(--success)';
            setTimeout(() => { button.textContent = 'Add'; button.style.background = ''; }, 700);
        });
    });

    document.querySelectorAll('.wishlist').forEach((button) => {
        button.addEventListener('click', () => {
            button.classList.toggle('saved');
            button.textContent = button.classList.contains('saved') ? '♥' : '♡';
        });
    });

    document.querySelectorAll('.filter-btn').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            activeFilter = button.textContent.trim().toLowerCase();
            applyCatalogFilters();
        });
    });
}

function renderOrderSummary() {
    const totals = getTotals();
    const values = { summarySubtotal: totals.subtotal, summaryShipping: totals.shipping, summaryTax: totals.tax, summaryTotal: totals.total };
    Object.entries(values).forEach(([id, value]) => {
        const element = document.getElementById(id);
        if (element) element.textContent = currency.format(value);
    });
    const discount = document.getElementById('summaryDiscount');
    if (discount) discount.textContent = `-${currency.format(totals.discount)}`;
}

function renderCheckoutItems() {
    const list = document.getElementById('checkoutItems');
    if (!list) return;
    const cart = getCart();
    list.innerHTML = cart.length ? cart.map((item) => `<li><span>${item.name}</span><strong>${currency.format(item.price)}</strong></li>`).join('') : '<li>Your bag is empty.</li>';
}

function setupCheckout() {
    const form = document.getElementById('detailsForm');
    const account = getSignedInAccount();
    if (form && account) {
        const emailInput = document.getElementById('email');
        emailInput.value = account.email;
        emailInput.readOnly = true;
        Object.entries(account.delivery || {}).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input && value) input.value = value;
        });
        document.getElementById('name').value = account.name;
    }
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!getCart().length) return alert('Add an item to your bag before checking out.');
        const signedIn = getSignedInAccount();
        if (!signedIn) {
            window.location.href = 'account.html?return=checkout.html';
            return;
        }
        const accounts = getAccounts();
        const accountIndex = accounts.findIndex((entry) => entry.email === signedIn.email);
        accounts[accountIndex].delivery = {
            address: document.getElementById('address').value.trim(),
            city: document.getElementById('city').value.trim(),
            country: document.getElementById('country').value
        };
        localStorage.setItem(accountsKey, JSON.stringify(accounts));
        window.location.href = 'payment.html';
    });
}

function setupPayment() {
    const form = document.getElementById('paymentForm');
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!getCart().length) return alert('Your bag is empty.');
        if (!getSignedInAccount()) {
            window.location.href = 'account.html?return=checkout.html';
            return;
        }
        document.getElementById('paymentSuccess')?.classList.add('visible');
        localStorage.removeItem(cartKey);
    });
}

applyTheme();
setupAccount();
setupMobileNavigation();
setupShop();
renderCart();
renderOrderSummary();
renderCheckoutItems();
setupCheckout();
setupPayment();
requireAccount();
