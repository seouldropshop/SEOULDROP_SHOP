const ADMIN_CHAT_ID = "8600388356";
const CATALOG_URL = "https://seouldrop-shop.outemnikova.workers.dev";

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
  return new Response(
    JSON.stringify(data),
    {
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
    }
  );
}

async function telegram(env, method, body) {
  if (!env.BOT_TOKEN) {
    return {
      ok: false,
      description: "BOT_TOKEN отсутствует"
    };
  }

  try {
    const r = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
      }
    );

    return await r.json();
  } catch (e) {
    return {
      ok: false,
      description:
        e.message || "telegram_request_failed"
    };
  }
}

async function sendTelegramGreeting(env, chatId) {
  const result = await telegram(
    env,
    "sendMessage",
    {
      chat_id: chatId,
      text:
        "💜 Добро пожаловать в SEOULDROP! 🇰🇷\n\n" +
        "Здесь ты найдёшь оригинальные K-POP альбомы, винил, карты, мерч, косметику и сладости из Кореи.\n\n" +
        "🛍 Открывай наш каталог и выбирай любимые товары!",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🛍 ОТКРЫТЬ КАТАЛОГ",
              web_app: {
                url: CATALOG_URL
              }
            }
          ]
        ]
      }
    }
  );

  if (env.PRODUCTS) {
    await env.PRODUCTS.put(
      "last_telegram_send_error",
      JSON.stringify({
        time: new Date().toISOString(),
        chatId,
        ok: Boolean(result.ok),
        errorCode: result.error_code || null,
        description: result.description || null
      })
    );
  }

  return result;
}

async function ensureTelegramWebhook(
  env,
  webhookUrl
) {
  if (!env.BOT_TOKEN || !env.PRODUCTS) return;

  try {
    const current = await env.PRODUCTS.get(
      "telegram_webhook_ready"
    );

    if (current === webhookUrl) return;

    const result = await telegram(
      env,
      "setWebhook",
      {
        url: webhookUrl,
        allowed_updates: ["message"]
      }
    );

    if (result.ok) {
      await env.PRODUCTS.put(
        "telegram_webhook_ready",
        webhookUrl
      );

      await env.PRODUCTS.delete(
        "last_telegram_webhook_error"
      );
    } else {
      await env.PRODUCTS.put(
        "last_telegram_webhook_error",
        JSON.stringify({
          time: new Date().toISOString(),
          errorCode:
            result.error_code || null,
          description:
            result.description || null
        })
      );
    }
  } catch (e) {
    await env.PRODUCTS.put(
      "last_telegram_webhook_error",
      JSON.stringify({
        time: new Date().toISOString(),
        error: e.message
      })
    );
  }
}

async function readProducts(env) {
  try {
    const value = await env.PRODUCTS.get(
      "products",
      "json"
    );

    if (Array.isArray(value)) {
      return value;
    }

    await env.PRODUCTS.put(
      "products",
      JSON.stringify(DEFAULT_PRODUCTS)
    );
  } catch (e) {}

  return DEFAULT_PRODUCTS;
}

function validPassword(
  request,
  env,
  body = {}
) {
  const header =
    request.headers.get(
      "X-Admin-Password"
    ) || "";

  return Boolean(
    env.ADMIN_PASSWORD &&
      (
        header === env.ADMIN_PASSWORD ||
        body.password === env.ADMIN_PASSWORD
      )
  );
}

function getStatus(product) {
  return (
    product.status ||
    (
      product.available === false
        ? "out_of_stock"
        : "in_stock"
    )
  );
}

function getStock(product) {
  const n = Number(product.stock);

  return Number.isFinite(n) && n >= 0
    ? Math.floor(n)
    : 0;
}

function normalizeProduct(product) {
  const status = getStatus(product);

  let stock =
    status === "in_stock"
      ? getStock(product)
      : 0;

  let finalStatus = status;

  if (
    status === "in_stock" &&
    stock === 0
  ) {
    finalStatus = "out_of_stock";
  }

  const images =
    Array.isArray(product.images)
      ? product.images.filter(Boolean)
      : (
          product.image
            ? [product.image]
            : []
        );

  return {
    ...product,

    status: finalStatus,

    stock:
      finalStatus === "in_stock"
        ? stock
        : 0,

    available:
      finalStatus !== "out_of_stock",

    images,

    image:
      images[0] ||
      product.image ||
      null
  };
}

async function sendTelegramOrder(
  env,
  text
) {
  const result = await telegram(
    env,
    "sendMessage",
    {
      chat_id: ADMIN_CHAT_ID,
      text
    }
  );

  return result.ok
    ? { ok: true }
    : {
        ok: false,
        reason: "telegram_rejected",
        telegramError:
          result.description || ""
      };
}

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    const url =
      new URL(request.url);

    if (
      request.method === "OPTIONS"
    ) {
      return json({});
    }

    if (
      request.method !== "POST" &&
      url.pathname !==
        "/telegram/webhook"
    ) {
      ctx.waitUntil(
        ensureTelegramWebhook(
          env,
          `${url.origin}/telegram/webhook`
        )
      );
    }

    /* TELEGRAM WEBHOOK */

    if (
      request.method === "POST" &&
      url.pathname ===
        "/telegram/webhook"
    ) {
      try {
        const update =
          await request.json();

        await env.PRODUCTS.put(
          "last_telegram_update",
          JSON.stringify({
            receivedAt:
              new Date().toISOString(),
            update
          })
        );

        if (
          update.message?.chat?.type ===
            "private" &&
          update.message.chat.id
        ) {
          await sendTelegramGreeting(
            env,
            update.message.chat.id
          );
        }

        return json({
          ok: true
        });
      } catch (error) {
        await env.PRODUCTS.put(
          "last_telegram_webhook_error",
          JSON.stringify({
            time:
              new Date().toISOString(),
            error:
              error.message
          })
        );

        return json(
          {
            ok: false,
            error:
              error.message
          },
          400
        );
      }
    }

    /* ПОСЛЕДНЕЕ ВХОДЯЩЕЕ СООБЩЕНИЕ */

    if (
      url.pathname ===
      "/api/telegram-last-update"
    ) {
      try {
        const data =
          await env.PRODUCTS.get(
            "last_telegram_update"
          );

        return json({
          received: Boolean(data),
          update: data
            ? JSON.parse(data)
            : null
        });
      } catch (error) {
        return json(
          {
            received: false,
            error:
              error.message
          },
          500
        );
      }
    }

    /* ПОСЛЕДНЯЯ ОШИБКА ОТПРАВКИ */

    if (
      url.pathname ===
      "/api/telegram-send-error"
    ) {
      try {
        const data =
          await env.PRODUCTS.get(
            "last_telegram_send_error"
          );

        return json({
          exists: Boolean(data),
          error: data
            ? JSON.parse(data)
            : null
        });
      } catch (error) {
        return json(
          {
            exists: false,
            error:
              error.message
          },
          500
        );
      }
    }

    /* WEBHOOK INFO */

    if (
      url.pathname ===
      "/api/webhook-info"
    ) {
      const result =
        await telegram(
          env,
          "getWebhookInfo",
          {}
        );

      if (!result.ok) {
        return json(
          {
            ok: false,
            error:
              result.description ||
              "Telegram error"
          },
          500
        );
      }

      return json({
        ok: true,
        url:
          result.result.url,
        pending:
          result.result
            .pending_update_count,
        lastError:
          result.result
            .last_error_message ||
          null,
        lastErrorDate:
          result.result
            .last_error_date ||
          null
      });
    }

    /* ТЕСТ ПРИВЕТСТВИЯ */

    if (
      url.pathname ===
      "/api/test-greeting"
    ) {
      const result =
        await sendTelegramGreeting(
          env,
          ADMIN_CHAT_ID
        );

      return json({
        test: true,
        sentTo: ADMIN_CHAT_ID,
        result
      });
    }

    /* ПРОВЕРКА TELEGRAM */

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

    /* ПРОВЕРКА KV */

    if (
      url.pathname ===
      "/api/test-kv"
    ) {
      try {
        await env.PRODUCTS.put(
          "test",
          "работает"
        );

        return json({
          ok: true,
          kv: true,
          value:
            await env.PRODUCTS.get(
              "test"
            )
        });
      } catch (error) {
        return json(
          {
            ok: false,
            kv: false,
            error:
              error.message
          },
          500
        );
      }
    }

    /* API ТОВАРОВ */

    if (
      url.pathname ===
      "/api/products"
    ) {
      let body = {};

      if (
        request.method === "POST"
      ) {
        try {
          body =
            await request.json();
        } catch {
          return json(
            {
              ok: false,
              error:
                "Неверный JSON."
            },
            400
          );
        }
      }

      const action =
        url.searchParams.get(
          "action"
        ) ||
        body.action ||
        "list";

      /* ВХОД В АДМИНКУ */

      if (action === "login") {
        if (
          !validPassword(
            request,
            env,
            body
          )
        ) {
          return json(
            {
              ok: false,
              error:
                "Неверный пароль."
            },
            401
          );
        }

        return json({
          ok: true
        });
      }

      /* ПОЛУЧЕНИЕ ТОВАРОВ */

      if (action === "list") {
        return json({
          ok: true,
          products:
            await readProducts(env)
        });
      }

      /* СОХРАНЕНИЕ ОДНОГО ТОВАРА */

      if (
        action === "save-one"
      ) {
        if (
          !validPassword(
            request,
            env,
            body
          )
        ) {
          return json(
            {
              ok: false,
              error:
                "Неверный пароль."
            },
            401
          );
        }

        if (
          !body.product ||
          !body.product.id
        ) {
          return json(
            {
              ok: false,
              error:
                "Товар не передан."
            },
            400
          );
        }

        const products =
          await readProducts(env);

        const product =
          normalizeProduct(
            body.product
          );

        const index =
          products.findIndex(
            p =>
              String(p.id) ===
              String(product.id)
          );

        if (index === -1) {
          products.push(product);
        } else {
          products[index] =
            product;
        }

        await env.PRODUCTS.put(
          "products",
          JSON.stringify(products)
        );

        return json({
          ok: true
        });
      }

      /* УДАЛЕНИЕ ОДНОГО ТОВАРА */

      if (
        action === "delete-one"
      ) {
        if (
          !validPassword(
            request,
            env,
            body
          )
        ) {
          return json(
            {
              ok: false,
              error:
                "Неверный пароль."
            },
            401
          );
        }

        if (!body.id) {
          return json(
            {
              ok: false,
              error:
                "ID товара не передан."
            },
            400
          );
        }

        const products =
          await readProducts(env);

        const filtered =
          products.filter(
            p =>
              String(p.id) !==
              String(body.id)
          );

        await env.PRODUCTS.put(
          "products",
          JSON.stringify(filtered)
        );

        return json({
          ok: true
        });
      }

      /* СТАРОЕ СОХРАНЕНИЕ
         ОСТАВЛЕНО ДЛЯ СОВМЕСТИМОСТИ */

      if (
        action === "save"
      ) {
        if (
          !validPassword(
            request,
            env,
            body
          )
        ) {
          return json(
            {
              ok: false,
              error:
                "Неверный пароль."
            },
            401
          );
        }

        if (
          !Array.isArray(
            body.products
          )
        ) {
          return json(
            {
              ok: false,
              error:
                "Список товаров не передан."
            },
            400
          );
        }

        const products =
          body.products.map(
            normalizeProduct
          );

        await env.PRODUCTS.put(
          "products",
          JSON.stringify(products)
        );

        return json({
          ok: true,
          products
        });
      }

      /* ВЫХОД */

      if (
        action === "logout"
      ) {
        return json({
          ok: true
        });
      }

      return json(
        {
          ok: false,
          error:
            "Неизвестная команда."
        },
        400
      );
    }

    /* СОЗДАНИЕ ЗАКАЗА */

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
              ошибка:
                "Заполните обязательные поля."
            },
            400
          );
        }

        if (!env.BOT_TOKEN) {
          return json(
            {
              хорошо: false,
              ошибка:
                "Telegram ещё не настроен."
            },
            500
          );
        }

        const products =
          await readProducts(env);

        /* ПРОВЕРКА НАЛИЧИЯ */

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
                p.name ===
                item.имя
            );

          if (!found) {
            return json(
              {
                хорошо: false,
                ошибка:
                  `Товар "${item.имя}" больше недоступен.`
              },
              409
            );
          }

          const status =
            getStatus(found);

          if (
            status === "preorder"
          ) {
            continue;
          }

          if (
            status ===
            "out_of_stock"
          ) {
            return json(
              {
                хорошо: false,
                ошибка:
                  `Товар "${found.name}" нет в наличии.`
              },
              409
            );
          }

          const stock =
            getStock(found);

          const requested =
            Number(
              item.количество || 0
            );

          if (
            requested <= 0
          ) {
            return json(
              {
                хорошо: false,
                ошибка:
                  "Неверное количество товара."
              },
              400
            );
          }

          if (
            requested > stock
          ) {
            return json(
              {
                хорошо: false,
                ошибка:
                  `Товара "${found.name}" осталось только ${stock} шт.`
              },
              409
            );
          }
        }

        /* ФОРМИРОВАНИЕ ЗАКАЗА */

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

              return (
                `• ${item.имя} × ${quantity} — ` +
                `${(
                  price * quantity
                ).toLocaleString(
                  "ru-RU"
                )} ₽`
              );
            })
            .join("\n");

        let telegramUserText =
          "не указан";

        if (
          telegramUser?.имя_пользователя
        ) {
          telegramUserText =
            `@${telegramUser.имя_пользователя}`;
        } else if (
          telegramUser?.имя
        ) {
          telegramUserText =
            telegramUser.имя;
        }

        const text =
          `🛍 НОВЫЙ ЗАКАЗ SEOULDROP\n\n` +
          `${lines}\n\n` +
          `💰 Итого: ${Number(
            общий || 0
          ).toLocaleString(
            "ru-RU"
          )} ₽\n\n` +
          `👤 Имя: ${имя}\n` +
          `📞 Телефон: ${телефон}\n` +
          `📍 Адрес: ${адрес}` +
          (
            комментарий
              ? `\n💬 Комментарий: ${комментарий}`
              : ""
          ) +
          `\n\n👤 Telegram: ${telegramUserText}`;

        /* ОТПРАВКА В TELEGRAM */

        const sent =
          await sendTelegramOrder(
            env,
            text
          );

        if (!sent.ok) {
          return json(
            {
              хорошо: false,
              ошибка:
                "Telegram не принял сообщение."
            },
            502
          );
        }

        /* УМЕНЬШЕНИЕ ОСТАТКОВ */

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
                p.name ===
                item.имя
            );

          if (
            !found ||
            getStatus(found) !==
              "in_stock"
          ) {
            continue;
          }

          const newStock =
            Math.max(
              0,
              getStock(found) -
                Number(
                  item.количество || 0
                )
            );

          found.stock =
            newStock;

          found.status =
            newStock === 0
              ? "out_of_stock"
              : "in_stock";

          found.available =
            newStock !== 0;
        }

        await env.PRODUCTS.put(
          "products",
          JSON.stringify(products)
        );

        return json({
          хорошо: true
        });

      } catch (error) {
        return json(
          {
            хорошо: false,
            ошибка:
              "Ошибка сервера."
          },
          500
        );
      }
    }

    /* АДМИНКА */

    if (
      url.pathname === "/admin"
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

    /* СТАТИЧЕСКИЕ ФАЙЛЫ */

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
      "SEOULDROP Worker работает, но ASSETS binding не подключен.",
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
