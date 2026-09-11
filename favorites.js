(function () {
  'use strict';

  const STORAGE_KEY = 'seouldrop_favorites_v1';

  function getFavorites() {
    try {
      const data = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || '[]'
      );

      return Array.isArray(data)
        ? data.map(String)
        : [];
    } catch (e) {
      return [];
    }
  }

  function saveFavorites(list) {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(list)
      );
    } catch (e) {}
  }

  function isFavorite(id) {
    return getFavorites().includes(String(id));
  }

  function toggleFavorite(id) {
    id = String(id);

    let list = getFavorites();

    if (list.includes(id)) {
      list = list.filter(function (item) {
        return item !== id;
      });
    } else {
      list.push(id);
    }

    saveFavorites(list);

    updateHearts();
    updateFavoritesCount();
    renderFavorites();
  }

  function updateHearts() {
    document
      .querySelectorAll('.favorite-heart')
      .forEach(function (button) {

        const id = button.dataset.id;

        if (!id) return;

        const active = isFavorite(id);

        button.textContent =
          active ? '❤️' : '♡';

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

  function getCardId(card) {
    return card.dataset.id || '';
  }

  function addHearts() {
    document
      .querySelectorAll('#products .card')
      .forEach(function (card) {

        const id = getCardId(card);

        if (!id) return;

        if (
          card.querySelector(
            '.favorite-heart'
          )
        ) {
          return;
        }

        const button =
          document.createElement('button');

        button.type = 'button';

        button.className =
          'favorite-heart';

        button.dataset.id = id;

        button.textContent =
          isFavorite(id)
            ? '❤️'
            : '♡';

        button.onclick =
          function (event) {

            event.preventDefault();
            event.stopPropagation();

            toggleFavorite(id);
          };

        card.appendChild(button);
      });

    updateHearts();
  }

  function createNavigation() {
    const nav =
      document.querySelector(
        '.bottom-inner'
      );

    if (!nav) return;

    if (
      nav.querySelector(
        '.favorites-nav'
      )
    ) {
      return;
    }

    const button =
      document.createElement('button');

    button.type = 'button';

    button.className =
      'nav favorites-nav';

    button.innerHTML =
      '<strong>♡</strong>' +
      'Избранное ' +
      '<span class="favorites-count"></span>';

    button.onclick =
      function () {
        showFavorites();
      };

    nav.appendChild(button);

    nav.style.gridTemplateColumns =
      'repeat(4,1fr)';
  }

  function updateFavoritesCount() {
    const count =
      document.querySelector(
        '.favorites-count'
      );

    if (!count) return;

    const total =
      getFavorites().length;

    count.textContent =
      total ? total : '';
  }

  function createSection() {
    if (
      document.getElementById(
        'favoritesSection'
      )
    ) {
      return;
    }

    const section =
      document.createElement('section');

    section.id =
      'favoritesSection';

    section.className =
      'section';

    section.style.display =
      'none';

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
    createSection();

    const grid =
      document.getElementById(
        'favoritesGrid'
      );

    const count =
      document.getElementById(
        'favoritesCount'
      );

    if (!grid) return;

    const favoriteIds =
      getFavorites();

    const cards =
      Array.from(
        document.querySelectorAll(
          '#products .card'
        )
      );

    const favoriteCards =
      cards.filter(function (card) {
        return favoriteIds.includes(
          getCardId(card)
        );
      });

    if (count) {
      count.textContent =
        favoriteCards.length +
        (
          favoriteCards.length === 1
            ? ' товар'
            : ' товаров'
        );
    }

    if (!favoriteCards.length) {

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

    grid.innerHTML = '';

    favoriteCards.forEach(
      function (originalCard) {

        const clone =
          originalCard.cloneNode(true);

        clone
          .querySelectorAll(
            '.favorite-heart'
          )
          .forEach(function (heart) {

            heart.onclick =
              function (event) {

                event.preventDefault();
                event.stopPropagation();

                toggleFavorite(
                  originalCard.dataset.id
                );
              };
          });

        clone
          .querySelectorAll(
            'button'
          )
          .forEach(function (button) {

            if (
              button.classList.contains(
                'favorite-heart'
              )
            ) {
              return;
            }

            button.onclick =
              function (event) {

                event.preventDefault();
                event.stopPropagation();

                const originalButton =
                  originalCard.querySelector(
                    '.' +
                    button.className
                      .split(' ')
                      .join('.')
                  );

                if (originalButton) {
                  originalButton.click();
                }
              };
          });

        clone.onclick =
          function (event) {

            if (
              event.target.closest(
                'button'
              )
            ) {
              return;
            }

            originalCard.click();
          };

        grid.appendChild(clone);
      }
    );
  }

  function showFavorites() {
    createSection();

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
  }

  function addStyles() {
    if (
      document.getElementById(
        'favoritesStyles'
      )
    ) {
      return;
    }

    const style =
      document.createElement('style');

    style.id =
      'favoritesStyles';

    style.textContent = `
      .favorite-heart {
        position:absolute;
        top:9px;
        right:9px;
        z-index:20;

        width:38px;
        height:38px;

        border-radius:50%;
        border:1px solid
          rgba(255,145,209,.35);

        background:
          rgba(5,3,8,.78);

        color:#fff;

        font-size:21px;

        display:flex;
        align-items:center;
        justify-content:center;

        cursor:pointer;

        padding:0;
      }

      .favorite-heart.is-favorite {
        background:
          rgba(255,79,179,.20);

        border-color:
          rgba(255,145,209,.65);
      }
    `;

    document.head.appendChild(
      style
    );
  }

  function init() {
    addStyles();
    createNavigation();
    createSection();
    addHearts();
    updateFavoritesCount();

    const products =
      document.getElementById(
        'products'
      );

    if (products) {

      const observer =
        new MutationObserver(
          function () {
            addHearts();
            updateFavoritesCount();
          }
        );

      observer.observe(
        products,
        {
          childList:true,
          subtree:true
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
            50
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
