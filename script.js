const STORAGE_KEY = "phonecrest_products";
const WHATSAPP_NUMBER = "94769129718";
const ADMIN_USERNAME_HASH = "be3d98b53fe9e7b50dd4d67f8f73cfd067dc79a8904bfb28c69d0d755a9a98f1";
const ADMIN_PASSWORD_HASH = "a66dd0c341fc1c66f31623f81c2433630c7ee843b5265ba370c35dc0206635ef";
const ADMIN_SESSION_KEY = "phonecrest_admin_auth";

const defaultProducts = [];

function getProducts() {
  try {
    const savedProducts = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(savedProducts)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }

    if (savedProducts.length === 0) {
      return [];
    }

    if (defaultProducts.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
      return [];
    }

    const mergedProducts = savedProducts;
    const productMap = new Map();

    [...defaultProducts, ...mergedProducts].forEach((product) => {
      if (!product || !product.name) {
        return;
      }
      const key = product.id || product.name.toLowerCase();
      if (!productMap.has(key)) {
        productMap.set(key, product);
      }
    });

    const finalProducts = Array.from(productMap.values());

    if (finalProducts.length !== mergedProducts.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(finalProducts));
      return finalProducts;
    }

    return finalProducts;
  } catch (error) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
  }
}

function saveProducts(products) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function createBoxImage({ brand, title, subtitle, accent, base, detail, textColor = "#121a2a" }) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="900" viewBox="0 0 900 900">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${base}"/>
          <stop offset="100%" stop-color="#f2f5fb"/>
        </linearGradient>
      </defs>
      <rect width="900" height="900" fill="url(#bg)"/>
      <rect x="110" y="110" width="680" height="680" rx="26" fill="#f6f8fb" stroke="#d9e1ef" stroke-width="2"/>
      <rect x="165" y="155" width="570" height="430" rx="22" fill="${accent}"/>
      <rect x="220" y="196" width="120" height="58" rx="12" fill="#f2f5fb" opacity="0.9"/>
      <text x="280" y="235" font-size="28" font-weight="700" text-anchor="middle" fill="#1a2338" font-family="Arial, sans-serif">${brand}</text>
      <text x="450" y="338" font-size="68" font-weight="800" text-anchor="middle" fill="${textColor}" font-family="Arial, sans-serif">${title}</text>
      <text x="450" y="402" font-size="28" font-weight="600" text-anchor="middle" fill="#334155" font-family="Arial, sans-serif">${subtitle}</text>
      <rect x="210" y="455" width="480" height="120" rx="20" fill="#1e293b" opacity="0.12"/>
      <text x="450" y="532" font-size="112" font-weight="900" text-anchor="middle" fill="#0f172a" font-family="Arial, sans-serif">${detail}</text>
      <text x="450" y="640" font-size="26" font-weight="700" text-anchor="middle" fill="#0f172a" font-family="Arial, sans-serif">Power Bank</text>
      <rect x="285" y="680" width="330" height="26" rx="13" fill="#1f2937" opacity="0.15"/>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "TZS",
    maximumFractionDigits: 0
  }).format(amount);
}

function openWhatsApp(product) {
  const message = `Hi, I would like to order ${product.name} (${product.category}) for ${formatCurrency(product.price)}. Please confirm availability and delivery details.`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

function setupHomePage() {
  const products = getProducts();
  const productGrid = document.querySelector("#product-grid");
  if (!productGrid) {
    return;
  }

  if (products.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <h3>No products available yet</h3>
        <p>Add inventory from the admin panel to display products in the store.</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = products
    .map(
      (product) => `
        <article class="product-card" data-id="${product.id}" tabindex="0">
          <img src="${product.image}" alt="${product.name}" />
          <div class="product-body">
            <div class="product-meta">
              <span class="category-pill">${product.category}</span>
              <span class="product-price">${formatCurrency(product.price)}</span>
            </div>
            <h3>${product.name}</h3>
            <p>${product.description}</p>
            <div class="card-actions">
              <button class="secondary-btn" type="button" data-detail-id="${product.id}">View details</button>
              <button class="primary-btn" type="button" data-buy-id="${product.id}">Buy now</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  const modal = document.querySelector("#product-modal");
  const modalTitle = document.querySelector("#modal-title");
  const modalCategory = document.querySelector("#modal-category");
  const modalPrice = document.querySelector("#modal-price");
  const modalDescription = document.querySelector("#modal-description");
  const modalImage = document.querySelector("#modal-image");
  const buyNowBtn = document.querySelector("#buy-now-btn");

  const closeModal = () => {
    modal.classList.add("hidden");
  };

  document.querySelectorAll("[data-detail-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const product = products.find((item) => item.id === button.dataset.detailId);
      if (!product) return;

      modalTitle.textContent = product.name;
      modalCategory.textContent = product.category;
      modalPrice.textContent = formatCurrency(product.price);
      modalDescription.textContent = product.description;
      modalImage.src = product.image;
      modalImage.alt = product.name;
      buyNowBtn.dataset.buyId = product.id;
      modal.classList.remove("hidden");
    });
  });

  document.querySelectorAll("[data-buy-id]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const product = products.find((item) => item.id === button.dataset.buyId);
      if (product) {
        openWhatsApp(product);
      }
    });
  });

  productGrid.addEventListener("click", (event) => {
    const card = event.target.closest(".product-card");
    if (!card) return;
    if (event.target.closest("button")) return;

    const product = products.find((item) => item.id === card.dataset.id);
    if (!product) return;

    modalTitle.textContent = product.name;
    modalCategory.textContent = product.category;
    modalPrice.textContent = formatCurrency(product.price);
    modalDescription.textContent = product.description;
    modalImage.src = product.image;
    modalImage.alt = product.name;
    buyNowBtn.dataset.buyId = product.id;
    modal.classList.remove("hidden");
  });

  buyNowBtn.addEventListener("click", () => {
    const product = products.find((item) => item.id === buyNowBtn.dataset.buyId);
    if (product) {
      openWhatsApp(product);
    }
  });

  document.querySelectorAll(".close-modal").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.querySelector("[data-close-modal='true']").addEventListener("click", closeModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) {
      closeModal();
    }
  });
}

async function hashString(value) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function setupAdminAuth() {
  const loginPanel = document.querySelector("#admin-login-panel");
  const adminContent = document.querySelector("#admin-content");
  const loginForm = document.querySelector("#admin-login-form");
  const loginError = document.querySelector("#admin-login-error");
  const logoutButton = document.querySelector("#admin-logout-btn");

  if (!loginPanel || !adminContent || !loginForm) {
    return;
  }

  const setAuthView = (isAuthenticated) => {
    loginPanel.classList.toggle("hidden", isAuthenticated);
    adminContent.classList.toggle("hidden", !isAuthenticated);
  };

  const authenticated = sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
  setAuthView(authenticated);

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.querySelector("#admin-username").value.trim();
    const password = document.querySelector("#admin-password").value.trim();
    const usernameHash = await hashString(username);
    const passwordHash = await hashString(password);

    if (usernameHash === ADMIN_USERNAME_HASH && passwordHash === ADMIN_PASSWORD_HASH) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      setAuthView(true);
      loginForm.reset();
      if (loginError) {
        loginError.classList.add("hidden");
      }
      return;
    }

    if (loginError) {
      loginError.classList.remove("hidden");
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
      setAuthView(false);
      loginForm.reset();
      if (loginError) {
        loginError.classList.add("hidden");
      }
    });
  }
}

function setupAdminPage() {
  const form = document.querySelector("#product-form");
  const productList = document.querySelector("#admin-product-list");
  const saveButton = document.querySelector("#save-product-btn");
  const resetButton = document.querySelector("#reset-form-btn");
  const restoreSampleButton = document.querySelector("#reset-sample-data-btn");

  if (!form || !productList) {
    return;
  }

  const renderAdminProducts = () => {
    const products = getProducts();

    productList.innerHTML = products
      .map(
        (product) => `
          <article class="admin-product-item">
            <img src="${product.image}" alt="${product.name}" />
            <div class="admin-product-copy">
              <h3>${product.name}</h3>
              <p><strong>${product.category}</strong> · ${formatCurrency(product.price)}</p>
              <p>${product.description}</p>
            </div>
            <div class="admin-product-actions">
              <button class="secondary-btn" type="button" data-edit-id="${product.id}">Edit</button>
              <button class="primary-btn" type="button" data-delete-id="${product.id}">Delete</button>
            </div>
          </article>
        `
      )
      .join("");

    document.querySelectorAll("[data-edit-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const product = getProducts().find((item) => item.id === button.dataset.editId);
        if (!product) return;

        document.querySelector("#product-id").value = product.id;
        document.querySelector("#product-name").value = product.name;
        document.querySelector("#product-category").value = product.category;
        document.querySelector("#product-price").value = product.price;
        document.querySelector("#product-image").value = product.image;
        document.querySelector("#product-description").value = product.description;
        saveButton.textContent = "Update product";
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    document.querySelectorAll("[data-delete-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const products = getProducts();
        const nextProducts = products.filter((item) => item.id !== button.dataset.deleteId);
        saveProducts(nextProducts);
        renderAdminProducts();
        resetForm();
      });
    });
  };

  const resetForm = () => {
    form.reset();
    document.querySelector("#product-id").value = "";
    saveButton.textContent = "Save product";
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const productId = document.querySelector("#product-id").value;
    const product = {
      id: productId || `p${Date.now()}`,
      name: formData.get("name").toString().trim(),
      category: formData.get("category").toString().trim(),
      price: Number(formData.get("price")),
      image: formData.get("image").toString().trim(),
      description: formData.get("description").toString().trim()
    };

    if (!product.name || !product.category || !product.image || !product.description || !product.price) {
      return;
    }

    const products = getProducts();
    const existingIndex = products.findIndex((item) => item.id === product.id);

    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.unshift(product);
    }

    saveProducts(products);
    renderAdminProducts();
    resetForm();
  });

  resetButton.addEventListener("click", resetForm);

  restoreSampleButton.addEventListener("click", () => {
    saveProducts(defaultProducts);
    renderAdminProducts();
    resetForm();
  });

  renderAdminProducts();
}

window.addEventListener("DOMContentLoaded", () => {
  setupHomePage();
  setupAdminAuth();
  setupAdminPage();
});
