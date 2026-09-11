(function () {
  'use strict';

  const KEY = 'seouldrop_favorites_v1';
  let favoriteIds = loadFavorites();

  function loadFavorites() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(data) ? data.map(String) : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites() {
    localStorage.setItem(KEY, JSON.stringify(favoriteIds));
  }

  function isFavorite(id) {
    return favoriteIds.includes(String(id));
  }

  function getProducts() {
    return Array.isArray(window.products) ? window.products : [];
  }

  function getProduct(id) {
    return getProducts().find(
      p => String(p.id) === String(id)
    );
  }

  function escapeText(value) {
    if (typeof window.escapeHtml === 'function') {
      return window.escapeHtml(String(value ?? ''));
    }

    return String(value ?? '').replace(/[&<>"']/g, function (m) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      }[m];
    });
  }

  function getImage(product) {
    if (
      product &&
      Array.isArray(product.images) &&
      product.images.length
    ) {
      return product.images.find(Boolean) || '';
    }

    return product && product.image
      ? product.image
      : '';
  }

  function toggleFavorite(id) {
    id = String(id);

    if (isFavorite(id)) {
      favoriteIds = favoriteIds.filter(
        x => x !== id
      );
    } else {
      favoriteIds.push(id);
    }

    saveFavorites();
    updateHearts();
    updateFavoriteButton();
    renderFavorites();
  }

  function updateHearts() {
    document
      .querySelectorAll('.favorite-heart')
      .forEach(function (button) {

        const id = button.dataset.id;
        const active = isFavorite(id);

        button.textContent = active ? '❤️' : '♡';

        button.classList.toggle(
          'is-favorite',
          active
        );

        button.setAttribute(
          'aria-label',
          active
            ? 'Убрать из избранного'
            : 'Добавить в избранное'
        );
      });
  }

  function addHeartsToCards() {
    document
      .querySelectorAll('#products .card')
      .forEach(function (card) {

        const id = card.dataset.id;

        if (!id) return;

        if (
          card.querySelector('.favorite-heart')
        ) {
          return;
        }

        const button =
          document.createElement('button');

        button.type = 'button';
        button.className = 'favorite-heart';
        button.dataset.id = id;

        button.textContent =
          isFavorite(id) ? '❤️' : '♡';

        button.onclick = function (event) {
          event.preventDefault();
          event.stopPropagation();

          toggleFavorite(id);
        };

        card.appendChild(button);
      });

    updateHearts();
  }

  function createFavoritesNavigation() {
    const nav =
      document.querySelector('.bottom-inner');

    if (!nav) return;

    if (
      nav.querySelector('.favorites-nav')
    ) {
      return;
    }

    const button =
      document.createElement('button');

    button.type = 'button';
    button.className =
      'nav favorites-nav';

    button.innerHTML =
      '<strong>♡</strong> Избранное ' +
      '<span class="favorites-count"></span>';

    button.onclick = function () {
      showFavorites();
    };

    nav.appendChild(button);

    nav.style.gridTemplateColumns =
      'repeat(4, 1fr)';
  }

  function createFavoritesSection() {
    if (
      document.getElementById(
        'favoritesSection'
      )
    ) {
      return;
    }

    const section =
      document.createElement('section');

    section.id = 'favoritesSection';
    section.className = 'section';
    section.style.display = 'none';

    section.innerHTML = `
      <div class="section-head">
        <h2>❤️ Избранное</h2>
        <span
          class="product-count"
          id="favoritesCount">
        </span>
      </div>

      <div
        id="favoritesGrid"
        class="grid">
      </div>
    `;

    const catalog =
      document.getElementById(
        'catalogSection'
      );

    if (
      catalog &&
      catalog.parentNode
    ) {
      catalog.parentNode.insertBefore(
        section,
        catalog.nextSibling
      );
    }
  }

  function renderFavorites() {
    createFavoritesSection();

    const grid =
      document.getElementById(
        'favoritesGrid'
      );

    const count =
      document.getElementById(
        'favoritesCount'
      );

    if (!grid) return;

    const list =
      getProducts().filter(function (product) {
        return isFavorite(product.id);
      });

    if (count) {
      count.textContent =
        list.length +
        (list.length === 1
          ? ' товар'
          : ' товаров');
    }

    if (!list.length) {

      grid.innerHTML = `
        <div
          class="message"
          style="grid-column:1/-1;text-align:center;">
          ❤️ Здесь пока ничего нет.
          <br><br>
          Нажми ♡ на товаре,
          чтобы добавить его
          в избранное.
        </div>
      `;

      return;
    }

    grid.innerHTML =
      list.map(function (product) {

        const image =
          getImage(product);

        const price =
          typeof window.formatPrice === 'function'
            ? window.formatPrice(product.price)
            : Number(
                product.price || 0
              ).toLocaleString(
                'ru-RU'
              ) + ' ₽';

        return `
          <article
            class="fav-card">

            <div
              class="fav-photo"
              data-action="open">

              ${
                image
                  ? `<img
                       src="${escapeText(image)}"
                       alt="">`
                  : '🛍️'
              }

            </div>

            <div class="fav-info">

              <div
                class="fav-name"
                data-action="open">

                ${escapeText(
                  product.name ||
                  'Товар'
                )}

              </div>

              <div class="fav-price">
                ${price}
              </div>

              <button
                type="button"
                class="fav-add">

                🛒 В корзину

              </button>

              <button
                type="button"
                class="fav-remove">

                ♡ Убрать

              </button>

            </div>

          </article>
        `;
      }).join('');

    const cards =
      grid.querySelectorAll(
        '.fav-card'
      );

    cards.forEach(function (card, index) {

      const product = list[index];

      const openElements =
        card.querySelectorAll(
          '[data-action="open"]'
        );

      openElements.forEach(
        function (element) {

          element.onclick =
            function () {

              if (
                typeof window.openProduct ===
                'function'
              ) {
                window.openProduct(
                  product
                );
              }

            };
        }
      );

      const add =
        card.querySelector(
          '.fav-add'
        );

      if (add) {
        add.onclick = function () {

          if (
            typeof window.addToCart ===
            'function'
          ) {
            window.addToCart(
              product
            );
          }

        };
      }

      const remove =
        card.querySelector(
          '.fav-remove'
        );

      if (remove) {
        remove.onclick =
          function () {
            toggleFavorite(
              product.id
            );
          };
      }
    });
  }

  function updateFavoriteButton() {

    const count =
      document.querySelector(
        '.favorites-count'
      );

    if (count) {
      count.textContent =
        favoriteIds.length
          ? ' ' + favoriteIds.length
          : '';
    }

    const icon =
      document.querySelector(
        '.favorites-nav strong'
      );

    if (icon) {
      icon.textContent =
        favoriteIds.length
          ? '❤️'
          : '♡';
    }
  }

  function showFavorites() {

    createFavoritesSection();
    renderFavorites();

    const catalog =
      document.getElementById(
        'catalogSection'
      );

    const favorites =
      document.getElementById(
        'favoritesSection'
      );

    if (catalog) {
      catalog.style.display =
        'none';
    }

    if (favorites) {
      favorites.style.display =
        'block';

      favorites.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }

    document
      .querySelectorAll('.nav')
      .forEach(function (item) {
        item.classList.remove(
          'active'
        );
      });

    const button =
      document.querySelector(
        '.favorites-nav'
      );

    if (button) {
      button.classList.add(
        'active'
      );
    }
  }

  function showCatalog() {

    const catalog =
      document.getElementById(
        'catalogSection'
      );

    const favorites =
      document.getElementById(
        'favoritesSection'
      );

    if (favorites) {
      favorites.style.display =
        'none';
    }

    if (catalog) {
      catalog.style.display =
        'block';
    }

    document
      .querySelectorAll('.nav')
      .forEach(function (item) {
        item.classList.remove(
          'active'
        );
      });

    const catalogButton =
      document.querySelector(
        '.bottom-inner .nav'
      );

    if (catalogButton) {
      catalogButton.classList.add(
        'active'
      );
    }
  }

  function addStyles() {

    const style =
      document.createElement(
        'style'
      );

    style.textContent = `

      .favorite-heart {
        position: absolute;
        top: 9px;
        right: 9px;
        z-index: 20;

        width: 38px;
        height: 38px;

        border-radius: 50%;
        border: 1px solid
          rgba(255,145,209,.35);

        background:
          rgba(5,3,8,.78);

        color: #fff;

        font-size: 21px;

        display: flex;
        align-items: center;
        justify-content: center;

        cursor: pointer;

        backdrop-filter: blur(6px);

        padding: 0;
      }

      .favorite-heart.is-favorite {
        background:
          rgba(255,79,179,.20);

        border-color:
          rgba(255,145,209,.65);
      }

      .fav-card {
        background:
          linear-gradient(
            180deg,
            var(--panel2),
            var(--panel)
          );

        border:
          1px solid var(--line);

        border-radius: 19px;

        overflow: hidden;
      }

      .fav-photo {
        height: 180px;

        display: flex;
        align-items: center;
        justify-content: center;

        background:
          radial-gradient(
            circle,
            rgba(255,79,179,.18),
            transparent 52%
          ),
          #09050b;

        cursor: pointer;
      }

      .fav-photo img {
        width: 100%;
        height: 100%;

        object-fit: contain;

        padding: 10px;
      }

      .fav-info {
        padding: 12px;
      }

      .fav-name {
        font-weight: 750;
        font-size: 14px;

        min-height: 38px;

        line-height: 1.35;

        cursor: pointer;
      }

      .fav-price {
        font-size: 17px;
        font-weight: 850;

        margin-top: 4px;
      }

      .fav-add,
      .fav-remove {
        width: 100%;

        margin-top: 9px;

        border-radius: 12px;

        padding: 9px;

        cursor: pointer;

        font-weight: 700;
      }

      .fav-add {
        border:
          1px solid
          rgba(255,145,209,.32);

        background:
          rgba(255,79,179,.10);

        color: #fff;
      }

      .fav-remove {
        border:
          1px solid var(--line);

        background:
          var(--panel);

        color:
          var(--muted);

        font-size: 11px;
      }

    `;

    document.head.appendChild(
      style
    );
  }

  function init() {

    addStyles();

    createFavoritesNavigation();

    createFavoritesSection();

    addHeartsToCards();

    renderFavorites();

    updateFavoriteButton();

    const productsBox =
      document.getElementById(
        'products'
      );

    if (productsBox) {

      const observer =
        new MutationObserver(
          function () {

            addHeartsToCards();

            const section =
              document.getElementById(
                'favoritesSection'
              );

            if (
              section &&
              section.style.display !==
              'none'
            ) {
              renderFavorites();
            }

          }
        );

      observer.observe(
        productsBox,
        {
          childList: true,
          subtree: true
        }
      );
    }

    const catalogNav =
      document.querySelector(
        '.bottom-inner .nav'
      );

    if (catalogNav) {

      catalogNav.addEventListener(
        'click',
        function () {

          setTimeout(
            showCatalog,
            0
          );

        }
      );
    }
  }

  if (
    document.readyState ===
    'loading'
  ) {

    document.addEventListener(
      'DOMContentLoaded',
      init
    );

  } else {

    init();

  }

})();
