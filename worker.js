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

function response(data, status = 200) {
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

async function getProducts(env) {
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

function authorized(request, env, body = {}) {
  const headerPassword =
    request.headers.get("X-Admin-Password") || "";

  const bodyPassword =
    body.password || "";

  const password =
    headerPassword || bodyPassword;

  return Boolean(
    env.ADMIN_PASSWORD &&
    password === env.ADMIN_PASSWORD
  );
}

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return response({});
    }

    /*
     * PRODUCTS API
     */

    if (url.pathname === "/api/products") {

      let body = {};

      if (request.method === "POST") {
        try {
          body = await request.json();
        } catch {
          body = {};
        }
      }

      const action =
        url.searchParams.get("action") ||
        body.action ||
        "list";

      /*
       * LOGIN
       */

      if (action === "login") {

        if (!authorized(request, env, body)) {
          return response(
            {
              ok: false,
              error: "Неверный пароль."
            },
            401
          );
        }

        const products =
          await getProducts(env);

        return response({
          ok: true,
          products
        });
      }

      /*
       * LIST
       */

      if (action === "list") {

        if (
          request.method === "POST" &&
          !authorized(request, env, body)
        ) {
          return response(
            {
              ok: false,
              error: "Неверный пароль."
            },
            401
          );
        }

        const products =
          await getProducts(env);

        return response({
          ok: true,
          products
        });
      }

      /*
       * SAVE
       */

      if (action === "save") {

        if (!authorized(request, env, body)) {
          return response(
            {
              ok: false,
              error: "Неверный пароль."
            },
            401
          );
        }

        if (!Array.isArray(body.products)) {
          return response(
            {
              ok: false,
              error: "Товары не переданы."
            },
            400
          );
        }

        await env.PRODUCTS.put(
          "products",
          JSON.stringify(body.products)
        );

        const saved =
          await env.PRODUCTS.get(
            "products",
            "json"
          );

        return response({
          ok: true,
          products: saved
        });
      }

      /*
       * LOGOUT
       */

      if (action === "logout") {
        return response({
          ok: true
        });
      }

      return response(
        {
          ok: false,
          error: "Неизвестная команда."
        },
        400
      );
    }

    /*
     * CREATE ORDER
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
          return response(
            {
              хорошо: false,
              ошибка: "Заполните обязательные поля."
            },
            400
          );
        }

        if (
          !env.BOT_TOKEN ||
          !env.ADMIN_CHAT_ID
        ) {
          return response(
            {
              хорошо: false,
              ошибка: "Telegram ещё не настроен."
            },
            500
          );
        }

        const lines =
          предметы
            .map(item =>
              `• ${item.имя} × ${item.количество} — ${Number(
                item.цена * item.количество
              ).toLocaleString("ru-RU")} ₽`
            )
            .join("\n");

        const telegram =
          telegramUser?.имя_пользователя
            ? `@${telegramUser.имя_пользователя}`
            : telegramUser?.имя || "не указан";

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

        const tg =
          await fetch(
            `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                chat_id: env.ADMIN_CHAT_ID,
                text
              })
            }
          );

        const result =
          await tg.json();

        if (!result.ok) {
          return response(
            {
              хорошо: false,
              ошибка:
                "Telegram не принял сообщение."
            },
            502
          );
        }

        return response({
          хорошо: true
        });

      } catch {
        return response(
          {
            хорошо: false,
            ошибка: "Ошибка сервера."
          },
          500
        );
      }
    }

    /*
     * ADMIN
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

    /*
     * STATIC SITE
     */

    return env.ASSETS.fetch(request);
  }
};
