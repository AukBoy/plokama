const WHATSAPP_NUMBER = "94769129718";
const ADMIN_SESSION_KEY = "plokama_admin_session";
const config = window.PLOKAMA_CONFIG || {};
const SUPABASE_URL = (config.supabaseUrl || "").replace(/\/$/, "");
const SUPABASE_ANON_KEY = config.supabaseAnonKey || "";

function isBackendConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function backendConfigurationError() {
  return new Error("The product database is not configured yet. Please contact the store owner.");
}

function readAdminSession() {
  const storedSession = sessionStorage.getItem(ADMIN_SESSION_KEY);
  if (!storedSession) {
    return null;
  }

  try {
    return JSON.parse(storedSession);
  } catch (error) {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

function storeAdminSession(session) {
  sessionStorage.setItem(
    ADMIN_SESSION_KEY,
    JSON.stringify({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresAt: Date.now() + Number(session.expires_in || 3600) * 1000
    })
  );
}

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

async function parseResponse(response) {
  const text = await response.text();
  let result = null;

  if (text) {
    try {
      result = JSON.parse(text);
    } catch (error) {
      result = { message: text };
    }
  }

  if (!response.ok) {
    const message = result && (result.message || result.msg || result.error_description || result.error);
    throw new Error(message || `Request failed (${response.status}).`);
  }

  return result;
}

async function refreshAdminSession(session) {
  if (!session || !session.refreshToken) {
    clearAdminSession();
    throw new Error("Your admin session has expired. Please log in again.");
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refresh_token: session.refreshToken })
  });

  if (!response.ok) {
    try {
      await parseResponse(response);
    } catch (error) {
      if (response.status === 400 || response.status === 401) {
        clearAdminSession();
        throw new Error("Your admin session has expired. Please log in again.");
      }
      throw error;
    }
  }

  const refreshedSession = await parseResponse(response);
  storeAdminSession(refreshedSession);
  return refreshedSession.access_token;
}

async function getAdminAccessToken() {
  const session = readAdminSession();
  if (!session || !session.accessToken) {
    throw new Error("Please log in to manage products.");
  }

  if (session.expiresAt <= Date.now() + 30000) {
    return refreshAdminSession(session);
  }

  return session.accessToken;
}

async function supabaseRequest(path, options = {}) {
  if (!isBackendConfigured()) {
    throw backendConfigurationError();
  }

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (options.authenticated) {
    headers.Authorization = `Bearer ${await getAdminAccessToken()}`;
  } else {
    headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  if (response.status === 401 && options.authenticated) {
    clearAdminSession();
    document.dispatchEvent(new Event("admin-session-expired"));
    throw new Error("Your admin session has expired. Please log in again.");
  }
  return parseResponse(response);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-LK", {
    style: "currency",
    currency: "LKR",
    maximumFractionDigits: 0
  }).format(amount);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };
    return entities[character];
  });
}

function safeImageUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
  } catch (error) {
    return "";
  }
}

function setStatus(element, message, isError = false) {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle("hidden", !message);
  element.classList.toggle("status-error", isError);
  element.classList.toggle("status-success", Boolean(message) && !isError);
}

function openWhatsApp(product) {
  const message = `Hi, I would like to order ${product.name} (${product.category}) for ${formatCurrency(product.price)}. Please confirm availability and delivery details.`;
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

async function getProducts() {
  const rows = await supabaseRequest(
    "/rest/v1/products?select=id,name,category,price,image,description&order=created_at.desc"
  );
  return Array.isArray(rows) ? rows : [];
}

function renderProductCards(products, productGrid) {
  if (products.length === 0) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <h3>No products available yet</h3>
        <p>Our catalog is being updated. Contact us on WhatsApp for current availability.</p>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = products
    .map(
      (product) => `
        <article class="product-card" data-id="${escapeHtml(product.id)}" tabindex="0">
          <img src="${escapeHtml(safeImageUrl(product.image))}" alt="${escapeHtml(product.name)}" />
          <div class="product-body">
            <div class="product-meta">
              <span class="category-pill">${escapeHtml(product.category)}</span>
              <span class="product-price">${formatCurrency(product.price)}</span>
            </div>
            <h3>${escapeHtml(product.name)}</h3>
            <p>${escapeHtml(product.description)}</p>
            <div class="card-actions">
              <button class="secondary-btn" type="button" data-detail-id="${escapeHtml(product.id)}">View details</button>
              <button class="primary-btn" type="button" data-buy-id="${escapeHtml(product.id)}">Buy now</button>
            </div>
          </div>
        </article>
      `
    )
    .join("");
}

async function setupHomePage() {
  const productGrid = document.querySelector("#product-grid");
  if (!productGrid) {
    return;
  }

  productGrid.innerHTML = '<p class="catalog-status">Loading products…</p>';

  try {
    const products = await getProducts();
    renderProductCards(products, productGrid);
    if (products.length === 0) {
      return;
    }

    const modal = document.querySelector("#product-modal");
    const modalTitle = document.querySelector("#modal-title");
    const modalCategory = document.querySelector("#modal-category");
    const modalPrice = document.querySelector("#modal-price");
    const modalDescription = document.querySelector("#modal-description");
    const modalImage = document.querySelector("#modal-image");
    const buyNowButton = document.querySelector("#buy-now-btn");

    const showProduct = (product) => {
      modalTitle.textContent = product.name;
      modalCategory.textContent = product.category;
      modalPrice.textContent = formatCurrency(product.price);
      modalDescription.textContent = product.description;
      modalImage.src = safeImageUrl(product.image);
      modalImage.alt = product.name;
      buyNowButton.dataset.buyId = product.id;
      modal.classList.remove("hidden");
    };

    const closeModal = () => modal.classList.add("hidden");

    productGrid.addEventListener("click", (event) => {
      const target = event.target;
      const detailButton = target.closest("[data-detail-id]");
      const buyButton = target.closest("[data-buy-id]");

      if (detailButton) {
        event.stopPropagation();
        const product = products.find((item) => item.id === detailButton.dataset.detailId);
        if (product) showProduct(product);
        return;
      }

      if (buyButton) {
        event.stopPropagation();
        const product = products.find((item) => item.id === buyButton.dataset.buyId);
        if (product) openWhatsApp(product);
        return;
      }

      const card = target.closest(".product-card");
      const product = card && products.find((item) => item.id === card.dataset.id);
      if (product) showProduct(product);
    });

    buyNowButton.addEventListener("click", () => {
      const product = products.find((item) => item.id === buyNowButton.dataset.buyId);
      if (product) openWhatsApp(product);
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
  } catch (error) {
    productGrid.innerHTML = `
      <div class="empty-state">
        <h3>We couldn’t load the catalog</h3>
        <p>${escapeHtml(error.message)} If the problem continues, contact us on WhatsApp.</p>
      </div>
    `;
  }
}

function setupAdminPage() {
  const form = document.querySelector("#product-form");
  const productList = document.querySelector("#admin-product-list");
  const saveButton = document.querySelector("#save-product-btn");
  const resetButton = document.querySelector("#reset-form-btn");
  const status = document.querySelector("#admin-status");

  if (!form || !productList) {
    return null;
  }

  const resetForm = () => {
    form.reset();
    document.querySelector("#product-id").value = "";
    saveButton.textContent = "Save product";
  };

  const renderAdminProducts = async () => {
    productList.innerHTML = '<p class="catalog-status">Loading inventory…</p>';
    try {
      const products = await getProducts();
      productList.innerHTML = products
        .map(
          (product) => `
            <article class="admin-product-item">
              <img src="${escapeHtml(safeImageUrl(product.image))}" alt="${escapeHtml(product.name)}" />
              <div class="admin-product-copy">
                <h3>${escapeHtml(product.name)}</h3>
                <p><strong>${escapeHtml(product.category)}</strong> · ${formatCurrency(product.price)}</p>
                <p>${escapeHtml(product.description)}</p>
              </div>
              <div class="admin-product-actions">
                <button class="secondary-btn" type="button" data-edit-id="${escapeHtml(product.id)}">Edit</button>
                <button class="primary-btn" type="button" data-delete-id="${escapeHtml(product.id)}">Delete</button>
              </div>
            </article>
          `
        )
        .join("");

      if (products.length === 0) {
        productList.innerHTML = '<p class="catalog-status">No products have been added yet.</p>';
      }

      productList.querySelectorAll("[data-edit-id]").forEach((button) => {
        button.addEventListener("click", () => {
          const product = products.find((item) => item.id === button.dataset.editId);
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

      productList.querySelectorAll("[data-delete-id]").forEach((button) => {
        button.addEventListener("click", async () => {
          if (!window.confirm("Delete this product from the store?")) return;

          button.disabled = true;
          try {
            await supabaseRequest(`/rest/v1/products?id=eq.${encodeURIComponent(button.dataset.deleteId)}`, {
              method: "DELETE",
              authenticated: true
            });
            setStatus(status, "Product deleted.");
            await renderAdminProducts();
            resetForm();
          } catch (error) {
            button.disabled = false;
            setStatus(status, error.message, true);
          }
        });
      });
    } catch (error) {
      productList.innerHTML = `<p class="catalog-status status-error">${escapeHtml(error.message)}</p>`;
      if (!readAdminSession()) {
        document.dispatchEvent(new Event("admin-session-expired"));
      }
    }
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const productId = document.querySelector("#product-id").value;
    const image = formData.get("image").toString().trim();
    const product = {
      name: formData.get("name").toString().trim(),
      category: formData.get("category").toString().trim(),
      price: Number(formData.get("price")),
      image,
      description: formData.get("description").toString().trim()
    };

    if (!product.name || !product.category || !product.description || !Number.isFinite(product.price) || product.price <= 0) {
      setStatus(status, "Enter a name, category, description, and a price greater than zero.", true);
      return;
    }
    if (!/^https?:\/\//i.test(image)) {
      setStatus(status, "Use an image URL beginning with http:// or https://.", true);
      return;
    }

    saveButton.disabled = true;
    setStatus(status, "");
    try {
      const path = productId
        ? `/rest/v1/products?id=eq.${encodeURIComponent(productId)}`
        : "/rest/v1/products";
      await supabaseRequest(path, {
        method: productId ? "PATCH" : "POST",
        body: product,
        authenticated: true,
        headers: { Prefer: "return=representation" }
      });
      setStatus(status, productId ? "Product updated." : "Product added.");
      resetForm();
      await renderAdminProducts();
    } catch (error) {
      setStatus(status, error.message, true);
    } finally {
      saveButton.disabled = false;
    }
  });

  resetButton.addEventListener("click", () => {
    resetForm();
    setStatus(status, "");
  });

  return renderAdminProducts;
}

function setupAdminAuth(renderAdminProducts) {
  const loginPanel = document.querySelector("#admin-login-panel");
  const adminContent = document.querySelector("#admin-content");
  const loginForm = document.querySelector("#admin-login-form");
  const loginStatus = document.querySelector("#admin-login-status");
  const logoutButton = document.querySelector("#admin-logout-btn");

  if (!loginPanel || !adminContent || !loginForm) {
    return;
  }

  const setAuthView = (isAuthenticated) => {
    loginPanel.classList.toggle("hidden", isAuthenticated);
    adminContent.classList.toggle("hidden", !isAuthenticated);
  };

  if (!isBackendConfigured()) {
    setAuthView(false);
    setStatus(loginStatus, "The store database is not configured. Add the Supabase project URL and anon key to config.js.", true);
    loginForm.querySelector("button[type='submit']").disabled = true;
    return;
  }

  const session = readAdminSession();
  setAuthView(Boolean(session));

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#admin-email").value.trim();
    const password = document.querySelector("#admin-password").value;
    const loginButton = loginForm.querySelector("button[type='submit']");
    loginButton.disabled = true;
    setStatus(loginStatus, "");

    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      const authenticatedSession = await parseResponse(response);
      storeAdminSession(authenticatedSession);
      loginForm.reset();
      setAuthView(true);
      await renderAdminProducts();
    } catch (error) {
      setStatus(loginStatus, error.message, true);
    } finally {
      loginButton.disabled = false;
    }
  });

  document.addEventListener("admin-session-expired", () => {
    clearAdminSession();
    setAuthView(false);
    setStatus(loginStatus, "Your admin session has expired. Please log in again.", true);
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      const currentSession = readAdminSession();
      clearAdminSession();
      setAuthView(false);
      setStatus(loginStatus, "");
      if (currentSession && currentSession.accessToken) {
        try {
          const response = await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
            method: "POST",
            headers: {
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${currentSession.accessToken}`
            }
          });
          if (!response.ok) {
            await parseResponse(response);
          }
        } catch (error) {
          setStatus(loginStatus, `Signed out on this device, but server sign-out failed: ${error.message}`, true);
        }
      }
    });
  }

  if (session && renderAdminProducts) {
    renderAdminProducts();
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setupHomePage();
  setupAdminAuth(setupAdminPage());
});
