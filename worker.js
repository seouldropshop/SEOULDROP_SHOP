const ADMIN_CHAT_ID = "8600388356";

const DEFAULT_PRODUCTS = [
  {
    id: "dynamite",
    name: "BTS — DYNAMITE",
    price: 5000,
    category: "albums",
    description: "BTS — DYNAMITE",
    available: true,
    status: "preorder",
    stock: 0,
    image: ""
  },
  {
    id: "ynwa",
    name: "BTS — You Never Walk Alone",
    price: 1925,
    category: "albums",
    description: "BTS — You Never Walk Alone",
    available: true,
    status: "in_stock",
    stock: 0,
    image: ""
  },
  {
    id: "butter",
    name: "BTS — Butter",
    price: 3335,
    category: "albums",
    description: "BTS — Butter",
    available: true,
    status: "in_stock",
    stock: 0,
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
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Admin-Password"
    }
  });
}

async function readProducts(env) {
  try {
    const value =
      await env.PRODUCTS.get("products", "json");

    if (Array.isArray(value)) {
      return value;
    }

    await env.PRODUCTS.put(
      "products",
      JSON.stringify(DEFAULT_PRODUCTS)
    );

    return DEFAULT_PRODUCTS;

  } catch (error) {
    return DEFAULT_PRODUCTS;
  }
}

function validPassword(request, env, body = {}) {
  const headerPassword =
    request.headers.get("X-Admin-Password") || "";

  const bodyPassword =
    body.password || "";

  return Boolean(
    env.ADMIN_PASSWORD &&
    (
      headerPassword === env.ADMIN_PASSWORD ||
      bodyPassword === env.ADMIN_PASSWORD
    )
  );
}

function getStatus(product) {
  if (product.status) {
    return product.status;
  }

  return product.available === false
    ? "out_of_stock"
    : "in_stock";
}

function getStock(product) {
  const stock = Number(product.stock);

  if (
    !Number.isFinite(stock) ||
    stock < 0
  ) {
    return 0;
  }

  return Math.floor(stock);
}

async function sendTelegramOrder(env, text) {
  if (!env.BOT_TOKEN) {
    return {
      ok: false,
      reason: "telegram_not_configured"
    };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: text
        })
      }
    );

    const result =
      await response.json();

    if (!result.ok) {
      return {
        ok: false,
        reason: "telegram_rejected",
        telegramError:
          result.description || ""
      };
    }

    return {
      ok: true
    };

  } catch (error) {
    return {
      ok: false,
      reason: "telegram_request_failed"
    };
  }
}

export default {

  async fetch(request, env) {

    const url =
      new URL(request.url);

    if (request.method === "OPTIONS") {
      return json({});
    }

    /*
     * ПРОВЕРКА TELEGRAM
     *
     * Сам BOT_TOKEN никогда
     * не показывается.
     */
    if (
      url.pathname ===
      "/api/debug-telegram"
    ) {

      return json({
        ok: true,

        botToken:
          Boolean(env.BOT_TOKEN),

        adminChatId:
          Boolean(ADMIN_CHAT_ID),

        botTokenLength:
          env.BOT_TOKEN
            ? env.BOT_TOKEN.length
            : 0,

        adminChatIdLength:
          ADMIN_CHAT_ID.length
      });
    }

    /*
     * ПРОВЕРКА KV
     */
    if (
      url.pathname ===
      "/api/test-kv"
    ) {

      try {

        await env.PRODUCTS.put(
          "test",
          "работает"
        );

        const value =
          await env.PRODUCTS.get(
            "test"
          );

        return json({
          ok: true,
          kv: true,
          value
        });

      } catch (error) {

        return json({
          ok: false,
          kv: false,
          error: error.message
        }, 500);
      }
    }

    /*
     * API ТОВАРОВ
     */
    if (
      url.pathname ===
      "/api/products"
    ) {

      let body = {};

      if (request.method === "POST") {

        try {

          body =
            await request.json();

        } catch {

          return json({
            ok: false,
            error:
              "Неверный JSON."
          }, 400);
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

        if (
          !validPassword(
            request,
            env,
            body
          )
        ) {

          return json({
            ok: false,
            error:
              "Неверный пароль."
          }, 401);
        }

        return json({
          ok: true
        });
      }

      /*
       * LIST
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
       * SAVE
       */
      if (action === "save") {

        if (
          !validPassword(
            request,
            env,
            body
          )
        ) {

          return json({
            ok: false,
            error:
              "Неверный пароль."
          }, 401);
        }

        if (
          !Array.isArray(
            body.products
          )
        ) {

          return json({
            ok: false,
            error:
              "Список товаров не передан."
          }, 400);
        }

        /*
         * Нормализуем остатки.
         *
         * Для preorder и
         * out_of_stock остаток = 0.
         */
        const products =
          body.products.map(
            product => {

              const status =
                getStatus(product);

              let stock = 0;

              if (
                status ===
                "in_stock"
              ) {

                stock =
                  getStock(product);
              }

              let finalStatus =
                status;

              if (
                status ===
                "in_stock" &&
                stock === 0
              ) {

                finalStatus =
                  "out_of_stock";
              }

              return {
                ...product,

                status:
                  finalStatus,

                stock:
                  finalStatus ===
                  "in_stock"
                    ? stock
                    : 0,

                available:
                  finalStatus !==
                  "out_of_stock"
              };
            }
          );

        await env.PRODUCTS.put(
          "products",
          JSON.stringify(products)
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
       * LOGOUT
       */
      if (action === "logout") {

        return json({
          ok: true
        });
      }

      return json({
        ok: false,
        error:
          "Неизвестная команда."
      }, 400);
    }

    /*
     * СОЗДАНИЕ ЗАКАЗА
     */
    if (
      (
        url.pathname ===
        "/api/create-order" ||

        url.pathname ===
        "/.netlify/functions/create-order"
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

        /*
         * ОБЯЗАТЕЛЬНЫЕ ПОЛЯ
         */
        if (
          !имя ||
          !телефон ||
          !адрес ||
          !Array.isArray(
            предметы
          ) ||
          !предметы.length
        ) {

          return json({
            хорошо: false,
            ошибка:
              "Заполните обязательные поля."
          }, 400);
        }

        /*
         * TELEGRAM
         */
        if (!env.BOT_TOKEN) {

          return json({
            хорошо: false,
            ошибка:
              "Telegram ещё не настроен."
          }, 500);
        }

        /*
         * ЧИТАЕМ АКТУАЛЬНЫЕ ОСТАТКИ
         */
        const products =
          await readProducts(env);

        /*
         * ПРОВЕРЯЕМ ВСЕ ТОВАРЫ
         * ДО ОТПРАВКИ ЗАКАЗА
         */
        for (
          const item of предметы
        ) {

          const product =
            products.find(
              p =>
                String(p.id) ===
                String(item.id)
            );

          /*
           * Если по какой-то причине
           * id не передан, ищем
           * по названию.
           */
          const found =
            product ||
            products.find(
              p =>
                p.name === item.имя
            );

          if (!found) {

            return json({
              хорошо: false,
              ошибка:
                `Товар "${item.имя}" ` +
                `больше недоступен.`
            }, 409);
          }

          const status =
            getStatus(found);

          /*
           * Под заказ можно покупать
           * без ограничения.
           */
          if (
            status ===
            "preorder"
          ) {
            continue;
          }

          /*
           * Нет в наличии
           */
          if (
            status ===
            "out_of_stock"
          ) {

            return json({
              хорошо: false,
              ошибка:
                `Товар "${found.name}" ` +
                `нет в наличии.`
            }, 409);
          }

          /*
           * В наличии
           */
          const stock =
            getStock(found);

          const requested =
            Number(
              item.количество || 0
            );

          if (
            requested <= 0
          ) {

            return json({
              хорошо: false,
              ошибка:
                "Неверное количество товара."
            }, 400);
          }

          if (
            requested > stock
          ) {

            return json({
              хорошо: false,
              ошибка:
                `Товара "${found.name}" ` +
                `осталось только ${stock} шт.`
            }, 409);
          }
        }

        /*
         * ФОРМИРУЕМ ЗАКАЗ
         */
        const lines =
          предметы
            .map(item => {

              const quantity =
                Number(
                  item.количество || 0
                );

              const price =
                Number(
                  item.цена || 0
                );

              const sum =
                price * quantity;

              return (
                `• ${item.имя} × ${quantity} — ` +
                `${sum.toLocaleString("ru-RU")} ₽`
              );
            })
            .join("\n");

        /*
         * TELEGRAM ПОЛЬЗОВАТЕЛЯ
         */
        let telegram =
          "не указан";

        if (
          telegramUser &&
          telegramUser.имя_пользователя
        ) {

          telegram =
            `@${telegramUser.имя_пользователя}`;

        } else if (
          telegramUser &&
          telegramUser.имя
        ) {

          telegram =
            telegramUser.имя;
        }

        /*
         * СООБЩЕНИЕ
         */
        const text =
          `🛍 НОВЫЙ ЗАКАЗ SEOULDROP\n\n` +
          `${lines}\n\n` +
          `💰 Итого: ` +
          `${Number(общий || 0).toLocaleString("ru-RU")} ₽\n\n` +
          `👤 Имя: ${имя}\n` +
          `📞 Телефон: ${телефон}\n` +
          `📍 Адрес: ${адрес}` +
          (
            комментарий
              ? `\n💬 Комментарий: ${комментарий}`
              : ""
          ) +
          `\n\n👤 Telegram: ${telegram}`;

        /*
         * СНАЧАЛА ОТПРАВЛЯЕМ
         * ЗАКАЗ В TELEGRAM
         */
        const telegramResult =
          await sendTelegramOrder(
            env,
            text
          );

        if (
          !telegramResult.ok
        ) {

          return json({
            хорошо: false,
            ошибка:
              "Telegram не принял сообщение."
          }, 502);
        }

        /*
         * TELEGRAM ПРИНЯЛ ЗАКАЗ.
         *
         * ТЕПЕРЬ УМЕНЬШАЕМ ОСТАТКИ.
         */
        for (
          const item of предметы
        ) {

          const found =
            products.find(
              p =>
                String(p.id) ===
                String(item.id)
            ) ||
            products.find(
              p =>
                p.name === item.имя
            );

          if (!found) {
            continue;
          }

          const status =
            getStatus(found);

          /*
           * Под заказ не списываем.
           */
          if (
            status ===
            "preorder"
          ) {
            continue;
          }

          /*
           * Списываем только
           * товары со склада.
           */
          if (
            status ===
            "in_stock"
          ) {

            const quantity =
              Number(
                item.количество || 0
              );

            const oldStock =
              getStock(found);

            const newStock =
              Math.max(
                0,
                oldStock -
                quantity
              );

            found.stock =
              newStock;

            /*
             * Если стало 0 —
             * автоматически
             * "Нет в наличии".
             */
            if (
              newStock === 0
            ) {

              found.status =
                "out_of_stock";

              found.available =
                false;

            } else {

              found.status =
                "in_stock";

              found.available =
                true;
            }
          }
        }

        /*
         * СОХРАНЯЕМ НОВЫЕ ОСТАТКИ
         */
        await env.PRODUCTS.put(
          "products",
          JSON.stringify(products)
        );

        /*
         * УСПЕШНЫЙ ЗАКАЗ
         */
        return json({
          хорошо: true
        });

      } catch (error) {

        return json({
          хорошо: false,
          ошибка:
            "Ошибка сервера."
        }, 500);
      }
    }

    /*
     * АДМИНКА
     */
    if (
      url.pathname ===
      "/admin"
    ) {

      if (
        env.ASSETS &&
        typeof env.ASSETS.fetch ===
          "function"
      ) {

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

      return new Response(
        "ASSETS binding не подключен.",
        {
          status: 500,
          headers: {
            "Content-Type":
              "text/plain; charset=utf-8"
          }
        }
      );
    }

    /*
     * СТАТИЧЕСКИЕ ФАЙЛЫ
     */
    if (
      env.ASSETS &&
      typeof env.ASSETS.fetch ===
        "function"
    ) {

      return env.ASSETS.fetch(
        request
      );
    }

    return new Response(
      "SEOULDROP Worker работает, " +
      "но ASSETS binding не подключен.",
      {
        status: 500,
        headers: {
          "Content-Type":
            "text/plain; charset=utf-8"
        }
      }
    );
  }
};
