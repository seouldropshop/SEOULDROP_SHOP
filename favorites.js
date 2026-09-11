(function(){
  const KEY = 'seouldrop_favorites_v1';
  let favoriteIds = load();

  function load(){
    try{
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.map(String) : [];
    }catch(e){
      return [];
    }
  }

  function save(){
    localStorage.setItem(KEY, JSON.stringify(favoriteIds));
  }

  function isFavorite(id){
    return favoriteIds.includes(String(id));
  }

  function productById(id){
    try{
      return products.find(p => String(p.id) === String(id));
    }catch(e){
      return null;
    }
  }

  function esc(v){
    if(typeof escapeHtml === 'function'){
      return escapeHtml(String(v ?? ''));
    }
    return String(v ?? '').replace(/[&<>"']/g, m => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[m]));
  }

  function imgOf(p){
    return (Array.isArray(p?.images) ? p.images.filter(Boolean) : [])[0]
      || p?.image
      || '';
  }

  function toggle(id){
    id = String(id);

    if(isFavorite(id)){
      favoriteIds = favoriteIds.filter(x => x !== id);
    }else{
      favoriteIds.push(id);
    }

    save();
    updateHearts();
    renderFavorites();
    updateFavoriteBadge();
  }

  function updateHearts(){
    document.querySelectorAll('.favorite-heart').forEach(btn => {
      const id = btn.dataset.id;
      const fav = isFavorite(id);

      btn.textContent = fav ? '❤️' : '♡';
      btn.classList.toggle('is-favorite', fav);
      btn.setAttribute(
        'aria-label',
        fav ? 'Убрать из избранного' : 'Добавить в избранное'
      );
    });
  }

  function decorateCards(){
    document.querySelectorAll('#products .card').forEach(card => {
      const id = card.dataset.id;

      if(!id || card.querySelector('.favorite-heart')) return;

      const btn = document.createElement('button');

      btn.type = 'button';
      btn.className = 'favorite-heart';
      btn.dataset.id = id;
      btn.textContent = isFavorite(id) ? '❤️' : '♡';

      btn.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        toggle(id);
      };

      card.appendChild(btn);
    });

    updateHearts();
  }

  function ensureNav(){
    const nav = document.querySelector('.bottom-inner');

    if(!nav || nav.querySelector('.favorites-nav')) return;

    const btn = document.createElement('button');

    btn.type = 'button';
    btn.className = 'nav favorites-nav';

    btn.innerHTML =
      '<strong>♡</strong> Избранное <span class="favorites-count"></span>';

    btn.onclick = showFavorites;

    nav.appendChild(btn);
    nav.style.gridTemplateColumns = 'repeat(4,1fr)';
  }

  function ensureSection(){
    if(document.getElementById('favoritesSection')) return;

    const section = document.createElement('section');

    section.id = 'favoritesSection';
    section.className = 'section';
    section.style.display = 'none';

    section.innerHTML = `
      <div class="section-head">
        <h2>❤️ Избранное</h2>
        <span class="product-count" id="favoritesCount"></span>
      </div>

      <div id="favoritesGrid" class="grid"></div>
    `;

    const catalog = document.getElementById('catalogSection');

    if(catalog && catalog.parentNode){
      catalog.parentNode.insertBefore(section, catalog.nextSibling);
    }
  }

  function renderFavorites(){
    ensureSection();

    const grid = document.getElementById('favoritesGrid');
    const count = document.getElementById('favoritesCount');

    if(!grid) return;

    let list = [];

    try{
      list = products.filter(p => isFavorite(p.id));
    }catch(e){
      list = [];
    }

    if(count){
      count.textContent = list.length
        ? `${list.length} товар(ов)`
        : '0 товаров';
    }

    if(!list.length){
      grid.innerHTML = `
        <div class="message" style="grid-column:1/-1">
          ❤️ Здесь пока ничего нет.<br><br>
          Нажми ♡ на товаре, чтобы добавить его в избранное.
        </div>
      `;
      return;
    }

    grid.innerHTML = list.map(p => {
      const image = imgOf(p);

      return `
        <article class="fav-card">

          <div class="fav-photo">
            ${
              image
              ? `<img src="${esc(image)}" alt="">`
              : '🛍️'
            }
          </div>

          <div class="fav-info">

            <div class="fav-name">
              ${esc(p.name || 'Товар')}
            </div>

            <div class="fav-price">
              ${
                typeof formatPrice === 'function'
                ? formatPrice(p.price)
                : `${Number(p.price || 0).toLocaleString('ru-RU')} ₽`
              }
            </div>

            <button type="button" class="fav-add">
              🛒 В корзину
            </button>

            <button type="button" class="fav-remove">
              Удалить из избранного
            </button>

          </div>

        </article>
      `;
    }).join('');

    grid.querySelectorAll('.fav-card').forEach((card, i) => {
      const p = list[i];

      card.querySelector('.fav-photo').onclick = () => {
        if(typeof openProduct === 'function'){
          openProduct(p);
        }
      };

      card.querySelector('.fav-name').onclick = () => {
        if(typeof openProduct === 'function'){
          openProduct(p);
        }
      };

      card.querySelector('.fav-add').onclick = () => {
        if(typeof addToCart === 'function'){
          addToCart(p);
        }
      };

      card.querySelector('.fav-remove').onclick = () => {
        toggle(p.id);
      };
    });
  }

  function updateFavoriteBadge(){
    const c = document.querySelector('.favorites-count');

    if(c){
      c.textContent = favoriteIds.length
        ? ` ${favoriteIds.length}`
        : '';
    }

    const n = document.querySelector('.favorites-nav strong');

    if(n){
      n.textContent = favoriteIds.length ? '❤️' : '♡';
    }
  }

  function showFavorites(){
    ensureSection();
    renderFavorites();

    const catalog = document.getElementById('catalogSection');
    const section = document.getElementById('favoritesSection');

    if(catalog){
      catalog.style.display = 'none';
    }

    if(section){
      section.style.display = 'block';

      section.scrollIntoView({
        behavior:'smooth',
        block:'start'
      });
    }

    document.querySelectorAll('.nav').forEach(n => {
      n.classList.remove('active');
    });

    const f = document.querySelector('.favorites-nav');

    if(f){
      f.classList.add('active');
    }
  }

  function showCatalog(){
    const catalog = document.getElementById('catalogSection');
    const section = document.getElementById('favoritesSection');

    if(section){
      section.style.display = 'none';
    }

    if(catalog){
      catalog.style.display = 'block';

      catalog.scrollIntoView({
        behavior:'smooth',
        block:'start'
      });
    }

    document.querySelectorAll('.nav').forEach(n => {
      n.classList.remove('active');
    });

    const c = document.querySelector('.bottom-inner .nav');

    if(c){
      c.classList.add('active');
    }
  }

  function init(){

    const style = document.createElement('style');

    style.textContent = `
      .favorite-heart{
        position:absolute;
        top:9px;
        right:9px;
        z-index:10;
        width:38px;
        height:38px;
        border:1px solid rgba(255,145,209,.28);
        border-radius:50%;
        background:rgba(5,3,8,.72);
        color:#fff;
        font-size:20px;
        line-height:1;
        display:flex;
        align-items:center;
        justify-content:center;
        cursor:pointer;
        backdrop-filter:blur(6px);
      }

      .favorite-heart.is-favorite{
        background:rgba(255,79,179,.18);
        border-color:rgba(255,145,209,.55);
      }

      .
