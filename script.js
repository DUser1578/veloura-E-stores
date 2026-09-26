const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const cartKey = 'veloura-cart';

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

function getTotals(cart = getCart()) {
    const subtotal = cart.reduce((total, item) => total + Number(item.price), 0);
    const shipping = subtotal > 0 ? 18 : 0;
    const tax = subtotal * 0.08;
    const discount = subtotal > 150 ? 20 : 0;
    return { subtotal, shipping, tax, discount, total: subtotal + shipping + tax - discount };
}

function applyTheme() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    const savedTheme = localStorage.getItem('veloura-theme');
    document.body.classList.toggle('dark-mode', savedTheme === 'dark');
    toggle.textContent = savedTheme === 'dark' ? 'Light mode' : 'Dark mode';
}

function updateCartCount() {
    const count = document.getElementById('cartCount');
    if (count) count.textContent = String(getCart().length);
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

    const productCards = document.querySelectorAll('.product-card');
    document.querySelectorAll('.filter-btn').forEach((button) => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach((item) => item.classList.remove('active'));
            button.classList.add('active');
            const filter = button.textContent.trim().toLowerCase();
            productCards.forEach((card) => {
                const matches = filter === 'all' || card.dataset.category === filter || (filter === 'under $200' && Number(card.dataset.price) < 200);
                card.style.display = matches ? '' : 'none';
            });
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
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!getCart().length) return alert('Add an item to your bag before checking out.');
        window.location.href = 'payment.html';
    });
}

function setupPayment() {
    const form = document.getElementById('paymentForm');
    form?.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!getCart().length) return alert('Your bag is empty.');
        document.getElementById('paymentSuccess')?.classList.add('visible');
        localStorage.removeItem(cartKey);
    });
}

applyTheme();
setupShop();
renderCart();
renderOrderSummary();
renderCheckoutItems();
setupCheckout();
setupPayment();
