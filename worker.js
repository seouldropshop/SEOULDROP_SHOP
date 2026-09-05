const DEFAULT_PRODUCTS = [
  {
    id: "dynamite",
    name: "BTS — DYNAMITE",
    price: 5000,
    category: "Альбомы",
    description: "BTS — DYNAMITE",
    available: true,
    image: ""
  },
  {
    id: "ynwa",
    name: "BTS — You Never Walk Alone",
    price: 1925,
    category: "Альбомы",
    description: "BTS — You Never Walk Alone",
    available: true,
    image: ""
  },
  {
    id: "butter",
    name: "BTS — Butter",
    price: 3335,
    category: "Альбомы",
    description: "BTS — Butter",
    available: true,
    image: ""
  }
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password"
    }
  });
}

async function loadProducts(env) {
  const saved = await env.PRODUCTS.get("products", "json");

  if (Array.isArray(saved)) {
    return saved;
  }

  await env.PRODUCTS.put(
    "products",
    JSON.stringify(DEFAULT_PRODUCTS)
  );

  return DEFAULT_PRODUCTS;
}

function checkPassword(request, env) {
  const password = request.headers.get("X-Admin-Password");

  return Boolean(
    env.ADMIN_PASSWORD &&
    password &&
    password === env.ADMIN_PASSWORD
  );
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json({});
    }

    // Получить товары
    if (
      url.pathname === "/api/products" ||
      url.pathname === "/.netlify/functions/products"
    ) {
      try {
        const products = await loadProducts(env);

        return json({
          ok: true,
          products
        });
      } catch (error) {
        return json(
          {
            ok: false,
            error: "Ошибка чтения каталога."
          },
          500
        );
      }
    }

    // Сохранить товары
    if (
      (url.pathname === "/api/products" ||
        url.pathname === "/.netlify/functions/products") &&
      request.method === "POST"
    ) {
      if (!checkPassword(request, env)) {
        return json(
          {
            ok: false,
            error: "Неверный пароль администратора."
          },
          401
        );
      }

      try {
        const body = await request.json();

        if (!Array.isArray(body.products)) {
          return json(
            {
              ok: false,
              error: "Неверный формат товаров."
            },
            400
          );
        }

        await env.PRODUCTS.put(
          "products",
          JSON.stringify(body.products)
        );

        return json({
          ok: true,
          products: body.products
        });
      } catch (error) {
        return json(
          {
            ok: false,
            error: "Ошибка сохранения каталога."
          },
          500
        );
      }
    }

    // Создание заказа
    if (
      (url.pathname === "/api/create-order" ||
        url.pathname === "/.netlify/functions/create-order") &&
      request.method === "POST"
    ) {
      try {
        const body = await request.json();

        const {
          имя,
          телефон,
          адрес,
          комментарий,
          предметы,
          общий,
          telegramUser
        } = body;

        if (
          !имя ||
          !телефон ||
          !адрес ||
          !Array.isArray(предметы) ||
          !предметы.length
        ) {
          return json(
            {
              хорошо: false,
              ошибка: "Заполните обязательные поля."
            },
            400
          );
        }

        if (!env.BOT_TOKEN || !env.ADMIN_CHAT_ID) {
          return json(
            {
              хорошо: false,
              ошибка: "Telegram ещё не настроен."
            },
            500
          );
        }

        const линии = предметы
          .map(
            элемент =>
              `• ${элемент.имя} × ${элемент.количество} — ${Number(
                элемент.цена * элемент.количество
              ).toLocaleString("ru-RU")} ₽`
          )
          .join("\n");

        const telegram =
          telegramUser?.имя_пользователя
            ? `@${telegramUser.имя_пользователя}`
            : telegramUser?.имя || "не указан";

        const текст =
          `🛍 НОВЫЙ ЗАКАЗ SEOULDROP\n\n` +
          `${линии}\n\n` +
          `💰 Итого: ${Number(общий || 0).toLocaleString(
            "ru-RU"
          )} ₽\n\n` +
          `👤 Имя: ${имя}\n` +
          `📞 Телефон: ${телефон}\n` +
          `📍 Адрес: ${адрес}` +
          (комментарий
            ? `\n💬 Комментарий: ${комментарий}`
            : "") +
          `\n\n👤 Telegram: ${telegram}`;

        const response = await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              chat_id: env.ADMIN_CHAT_ID,
              text: текст
            })
          }
        );

        const result = await response.json();

        if (!result.ok) {
          return json(
            {
              хорошо: false,
              ошибка: "Telegram не принял сообщение."
            },
            502
          );
        }

        return json({
          хорошо: true
        });
      } catch (error) {
        return json(
          {
            хорошо: false,
            ошибка: "Ошибка сервера."
          },
          500
        );
      }
    }

    // Админка
    if (url.pathname === "/admin") {
      return env.ASSETS.fetch(
        new Request(
          new URL("/admin.html", request.url),
          request
        )
      );
    }

    // Магазин
    return env.ASSETS.fetch(request);
  }
};
