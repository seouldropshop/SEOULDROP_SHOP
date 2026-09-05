<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SEOULDROP | Админка</title>

<style>
:root{
  --bg:#050308;
  --panel:#0e0912;
  --panel2:#160d1b;
  --pink:#ff4fb3;
  --violet:#a76cff;
  --text:#fff7fc;
  --muted:#bcaabd;
  --line:rgba(255,111,194,.18)
}

*{box-sizing:border-box}

body{
  margin:0;
  background:
    radial-gradient(circle at 15% 5%,rgba(255,79,179,.14),transparent 28%),
    radial-gradient(circle at 90% 20%,rgba(167,108,255,.14),transparent 30%),
    var(--bg);
  color:var(--text);
  font-family:Inter,system-ui,-apple-system,sans-serif
}

.wrap{
  max-width:760px;
  margin:auto;
  padding:22px 14px 50px
}

.brand{
  font-weight:900;
  letter-spacing:.12em;
  font-size:20px;
  margin-bottom:4px
}

.muted{color:var(--muted)}

.panel{
  background:linear-gradient(180deg,var(--panel2),var(--panel));
  border:1px solid var(--line);
  border-radius:22px;
  padding:18px;
  margin-top:16px
}

.input,select,textarea{
  width:100%;
  background:#0b0610;
  color:#fff;
  border:1px solid var(--line);
  border-radius:13px;
  padding:12px;
  font:inherit;
  margin-top:6px
}

.btn{
  border:0;
  border-radius:13px;
  padding:12px 16px;
  background:linear-gradient(90deg,var(--pink),var(--violet));
  color:white;
  font-weight:800;
  cursor:pointer
}

.btn.secondary{
  background:var(--panel);
  border:1px solid var(--line)
}

.row{
  display:flex;
  gap:8px;
  align-items:center;
  justify-content:space-between
}

.products{
  display:grid;
  gap:12px
}

.product{
  display:grid;
  grid-template-columns:70px 1fr auto;
  gap:12px;
  align-items:center;
  background:#0b0610;
  border:1px solid var(--line);
  border-radius:16px;
  padding:10px
}

.product img{
  width:70px;
  height:70px;
  object-fit:contain;
  border-radius:10px;
  background:#050308
}

.actions{
  display:flex;
  gap:8px;
  flex-wrap:wrap
}

.login{
  max-width:430px;
  margin:12vh auto
}

.hidden{display:none}

.formgrid{
  display:grid;
  gap:10px
}

.check{
  display:flex;
  align-items:center;
  gap:8px;
  margin-top:8px
}

.preview{
  max-width:120px;
  max-height:120px;
  border-radius:12px;
  display:none;
  margin-top:8px
}
</style>
</head>

<body>

<div class="wrap">

<div class="brand">SEOULDROP</div>
<div class="muted">Админка каталога</div>

<section id="login" class="panel login">

<h2>🔐 Вход</h2>

<input
  class="input"
  id="password"
  type="password"
  placeholder="Пароль администратора"
>

<button
  class="btn"
  style="width:100%;margin-top:12px"
  onclick="login()"
>
Войти
</button>

<div
  id="loginError"
  class="muted"
  style="margin-top:10px"
></div>

</section>

<main id="app" class="hidden">

<div class="row" style="margin-top:18px">

<h2 style="margin:0">Товары</h2>

<button
  class="btn"
  onclick="newProduct()"
>
＋ Добавить
</button>

</div>

<div
  id="products"
  class="products"
  style="margin-top:12px"
></div>

<div
  class="row"
  style="margin-top:16px"
>

<button
  class="btn"
  onclick="saveAll()"
>
💾 Сохранить изменения
</button>

<button
  class="btn secondary"
  onclick="logout()"
>
Выйти
</button>

</div>

<section
  id="editor"
  class="panel hidden"
>

<div class="row">

<h2
  id="editorTitle"
  style="margin:0"
>
Товар
</h2>

<button
  class="btn secondary"
  onclick="closeEditor()"
>
✕
</button>

</div>

<div
  class="formgrid"
  style="margin-top:12px"
>

<label>
Название
<input
  class="input"
  id="fName"
>
</label>

<label>
Цена
<input
  class="input"
  id="fPrice"
  type="number"
  min="0"
>
</label>

<label>
Категория

<select
  class="input"
  id="fCategory"
>

<option value="albums">
💿 Альбомы
</option>

<option value="photocards">
🃏 Photocards
</option>

<option value="merch">
🎁 Merch
</option>

<option value="cosmetics">
🧴 Косметика
</option>

<option value="sweets">
🍪 Сладости
</option>

</select>

</label>

<label>
Описание

<textarea
  class="input"
  id="fDesc"
  rows="3"
></textarea>

</label>

<label class="check">

<input
  id="fAvailable"
  type="checkbox"
>

В наличии

</label>

<label>

Фото

<input
  class="input"
  id="fImage"
  type="file"
  accept="image/*"
>

<img
  id="preview"
  class="preview"
>

</label>

<button
  class="btn"
  onclick="applyEditor()"
>
Готово
</button>

</div>

</section>

</main>

</div>

<script>

let products = [];
let editing = null;
let imageData = null;
let adminPassword = "";


/* API */

async function api(action, body){

  const headers = {
    "Content-Type":"application/json"
  };

  if(adminPassword){
    headers["X-Admin-Password"] = adminPassword;
  }

  let url = "/api/products";

  if(action === "list"){
    url += "?action=list";
  }

  const options = {
    method: action === "list" ? "GET" : "POST",
    headers
  };

  if(action !== "list"){
    options.body = JSON.stringify(body || {});
  }

  const response = await fetch(url, options);

  const data = await response
    .json()
    .catch(() => ({
      error:"Ошибка ответа сервера"
    }));

  if(!response.ok){
    throw new Error(
      data.error || "Ошибка"
    );
  }

  return data;
}


/* LOGIN */

async function login(){

  const password =
    document.getElementById("password").value.trim();

  if(!password){
    document.getElementById("loginError").textContent =
      "Введите пароль";
    return;
  }

  try{

    adminPassword = password;

    const data = await api("list");

    if(!Array.isArray(data.products)){
      throw new Error(
        "Не удалось загрузить каталог"
      );
    }

    products = data.products;

    document
      .getElementById("login")
      .classList.add("hidden");

    document
      .getElementById("app")
      .classList.remove("hidden");

    render();

  }catch(error){

    adminPassword = "";

    document
      .getElementById("loginError")
      .textContent = error.message;

  }
}


/* LOAD */

async function load(){

  try{

    const data = await api("list");

    products = data.products || [];

    render();

  }catch(error){

    alert(error.message);

  }
}


/* RENDER */

function render(){

  const box =
    document.getElementById("products");

  box.innerHTML = "";

  products.forEach((product,index)=>{

    const element =
      document.createElement("div");

    element.className = "product";

    element.innerHTML = `

      <img
        src="${product.image || ""}"
        onerror="this.style.visibility='hidden'"
      >

      <div>

        <b>${esc(product.name)}</b>

        <div class="muted">

          ${Number(product.price)
            .toLocaleString("ru-RU")} ₽

          ·

          ${
            product.available
              ? "🟢 В наличии"
              : "🔴 Нет в наличии"
          }

        </div>

      </div>

      <div class="actions">

        <button
          class="btn secondary"
          onclick="edit(${index})"
        >
          Изменить
        </button>

        <button
          class="btn secondary"
          onclick="removeProduct(${index})"
        >
          Удалить
        </button>

      </div>
    `;

    box.appendChild(element);

  });

}


/* ESCAPE */

function esc(value){

  return String(value || "")
    .replace(
      /[&<>"']/g,
      char => ({
        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#39;"
      }[char])
    );

}


/* NEW PRODUCT */

function newProduct(){

  editing = null;
  imageData = null;

  document
    .getElementById("editorTitle")
    .textContent = "Новый товар";

  fill({
    name:"",
    price:0,
    category:"albums",
    description:"",
    available:true,
    image:null
  });

  document
    .getElementById("editor")
    .classList.remove("hidden");

}


/* EDIT */

function edit(index){

  editing = index;
  imageData = null;

  document
    .getElementById("editorTitle")
    .textContent = "Изменить товар";

  fill(products[index]);

  document
    .getElementById("editor")
    .classList.remove("hidden");

}


/* FILL */

function fill(product){

  document.getElementById("fName").value =
    product.name || "";

  document.getElementById("fPrice").value =
    product.price || 0;

  document.getElementById("fCategory").value =
    product.category || "albums";

  document.getElementById("fDesc").value =
    product.description || "";

  document.getElementById("fAvailable").checked =
    !!product.available;

  const preview =
    document.getElementById("preview");

  preview.src =
    product.image || "";

  preview.style.display =
    product.image ? "block" : "none";

  document.getElementById("fImage").value = "";

}


/* CLOSE EDITOR */

function closeEditor(){

  document
    .getElementById("editor")
    .classList.add("hidden");

}


/* IMAGE */

document
  .getElementById("fImage")
  .addEventListener(
    "change",
    ()=>{
      
      const file =
        document.getElementById("fImage").files[0];

      if(!file)return;

      const reader =
        new FileReader();

      reader.onload = ()=>{

        imageData = reader.result;

        const preview =
          document.getElementById("preview");

        preview.src = imageData;
        preview.style.display = "block";

      };

      reader.readAsDataURL(file);

    }
  );


/* APPLY EDITOR */

function applyEditor(){

  const old =
    editing === null
      ? null
      : products[editing];

  const product = {

    id:
      old?.id ||
      ("p_" + Date.now()),

    name:
      document
        .getElementById("fName")
        .value
        .trim() ||
      "Без названия",

    price:
      Number(
        document
          .getElementById("fPrice")
          .value
      ) || 0,

    category:
      document
        .getElementById("fCategory")
        .value,

    description:
      document
        .getElementById("fDesc")
        .value
        .trim(),

    available:
      document
        .getElementById("fAvailable")
        .checked,

    image:
      imageData !== null
        ? imageData
        : (old?.image || null)

  };

  if(editing === null){

    products.push(product);

  }else{

    products[editing] = product;

  }

  render();
  closeEditor();

}


/* DELETE */

function removeProduct(index){

  if(
    confirm(
      "Удалить этот товар?"
    )
  ){

    products.splice(index,1);

    render();

  }

}


/* SAVE */

async function saveAll(){

  try{

    await api(
      "save",
      {
        products: products
      }
    );

    alert(
      "Изменения сохранены 💜"
    );

  }catch(error){

    alert(
      error.message
    );

  }

}


/* LOGOUT */

function logout(){

  adminPassword = "";

  location.reload();

}

</script>

</body>
</html>
