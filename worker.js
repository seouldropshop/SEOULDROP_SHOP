const DEFAULT_PRODUCTS = [
  {
    id: "dynamite",
    name: "BTS — DYNAMITE",
    price: 5000,
    category: "albums",
    description: "BTS — DYNAMITE",
    available: true,
    image: ""
  },
  {
    id: "ynwa",
    name: "BTS — You Never Walk Alone",
    price: 1925,
    category: "albums",
    description: "BTS — You Never Walk Alone",
    available: true,
    image: ""
  },
  {
    id: "butter",
    name: "BTS — Butter",
    price: 3335,
    category: "albums",
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
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password"
    }
  });
}

async function readProducts(env) {
  const value = await env.PRODUCTS.get("products", "json");

  if (Array.isArray(value)) {
    return value;
  }

  await env.PRODUCTS.put(
    "products",
    JSON.stringify(DEFAULT_PRODUCTS)
  );

  return DEFAULT_PRODUCTS;
}

function validPassword(request, env, body) {
  const header = request.headers.get("X-Admin-Password") || "";
  const bodyPassword = body?.password || "";

  return Boolean(
    env.ADMIN_PASSWORD &&
    (header === env.ADMIN_PASSWORD ||
     bodyPassword === env.ADMIN_PASSWORD)
  );
}

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return json({});
    }

    /*
     * ПРОВЕРКА KV
     */
    if (url.pathname === "/api/test-kv") {

      try {

        await env.PRODUCTS.put(
          "test",
          "работает"
        );

        const value =
          await env.PRODUCTS.get("test");

        return json({
          ok: true,
          kv: true,
          value
        });

      } catch (error) {

        return json({
          ok: false,
          error: error.message
        }, 500);
      }
    }

    /*
     * ТОВАРЫ
     */
    if (url.pathname === "/api/products") {

      let body = {};

      if (request.method === "POST") {
        try {
          body = await request.json();
        } catch {
          return json({
            ok: false,
            error: "Неверный JSON."
          }, 400);
        }
      }

      const action =
        url.searchParams.get("action") ||
        body.action ||
        "list";

      /*
       * ВХОД
       */
      if (action === "login") {

        if (!validPassword(request, env, body)) {
          return json({
            ok: false,
            error: "Неверный пароль."
          }, 401);
        }

        return json({
          ok: true
        });
      }

      /*
       * СПИСОК
       */
      if (action === "list") {

        const products =
          await readProducts(env);

        return json({
          ok: true,
          products
        });
      }

      /*
       * СОХРАНЕНИЕ
       */
      if (action === "save") {

        if (!validPassword(request, env, body)) {
          return json({
            ok: false,
            error: "Неверный пароль."
          }, 401);
        }

        if (!Array.isArray(body.products)) {
          return json({
            ok: false,
            error: "Список товаров не передан."
          }, 400);
        }

        const data =
          JSON.stringify(body.products);

        await env.PRODUCTS.put(
          "products",
          data
        );

        const check =
          await env.PRODUCTS.get(
            "products",
            "json"
          );

        return json({
          ok: true,
          products: check
        });
      }

      /*
       * ВЫХОД
       */
      if (action === "logout") {
        return json({
          ok: true
        });
      }

      return json({
        ok: false,
        error: "Неизвестная команда."
      }, 400);
    }

    /*
     * ЗАКАЗ
     */
    if (
      (
        url.pathname === "/api/create-order" ||
        url.pathname === "/.netlify/functions/create-order"
      ) &&
      request.method === "POST"
    ) {

      try {

        const body =
          await request.json();

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
          return json({
            хорошо: false,
            ошибка: "Заполните обязательные поля."
          }, 400);
        }

        if (
          !env.BOT_TOKEN ||
          !env.ADMIN_CHAT_ID
        ) {
          return json({
            хорошо: false,
            ошибка: "Telegram ещё не настроен."
          }, 500);
        }

        const lines =
          предметы.map(item =>
            `• ${item.имя} × ${item.количество} — ${Number(
              item.цена * item.количество
            ).toLocaleString("ru-RU")} ₽`
          ).join("\n");

        const telegram =
          telegramUser?.имя_пользователя
            ? `@${telegramUser.имя_пользователя}`
            : telegramUser?.имя ||
              "не указан";

        const text =
          `🛍 НОВЫЙ ЗАКАЗ SEOULDROP\n\n` +
          `${lines}\n\n` +
          `💰 Итого: ${Number(
            общий || 0
          ).toLocaleString("ru-RU")} ₽\n\n` +
          `👤 Имя: ${имя}\n` +
          `📞 Телефон: ${телефон}\n` +
          `📍 Адрес: ${адрес}` +
          (
            комментарий
              ? `\n💬 Комментарий: ${комментарий}`
              : ""
          ) +
          `\n\n👤 Telegram: ${telegram}`;

        const response =
          await fetch(
            `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                chat_id: env.ADMIN_CHAT_ID,
                text
              })
            }
          );

        const result =
          await response.json();

        if (!result.ok) {
          return json({
            хорошо: false,
            ошибка: "Telegram не принял сообщение."
          }, 502);
        }

        return json({
          хорошо: true
        });

      } catch (error) {

        return json({
          хорошо: false,
          ошибка: "Ошибка сервера."
        }, 500);
      }
    }

    /*
     * АДМИНКА
     */
    if (url.pathname === "/admin") {

      return env.ASSETS.fetch(
        new Request(
          new URL(
            "/admin.html",
            request.url
          ),
          request
        )
      );
    }

    return env.ASSETS.fetch(request);
  }
};
