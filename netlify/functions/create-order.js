exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Method not allowed"
      })
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    const {
      name,
      phone,
      address,
      comment,
      items,
      total,
      telegramUser
    } = body;

    if (
      !name ||
      !phone ||
      !address ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Заполните обязательные поля и добавьте товар."
        })
      };
    }

    const token = process.env.BOT_TOKEN;
    const chatId = process.env.ADMIN_CHAT_ID;

    if (!token || !chatId) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Не настроены BOT_TOKEN или ADMIN_CHAT_ID."
        })
      };
    }

    const products = items
      .map((item) => {
        const sum = Number(item.price) * Number(item.qty);

        return `• ${item.name} × ${item.qty} — ${sum.toLocaleString("ru-RU")} ₽`;
      })
      .join("\n");

    const telegramName =
      telegramUser?.username
        ? `@${telegramUser.username}`
        : telegramUser?.first_name || "не указан";

    const message =
      `🛍 НОВЫЙ ЗАКАЗ SEOULDROP\n\n` +
      `${products}\n\n` +
      `💰 Итого: ${Number(total || 0).toLocaleString("ru-RU")} ₽\n\n` +
      `👤 Имя: ${name}\n` +
      `📞 Телефон: ${phone}\n` +
      `📍 Адрес: ${address}\n` +
      `${comment ? `💬 Комментарий: ${comment}\n` : ""}` +
      `\n👤 Telegram: ${telegramName}`;

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message
        })
      }
    );

    const result = await response.json();

    if (!result.ok) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ok: false,
          error: "Telegram не принял сообщение."
        })
      };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: true
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ok: false,
        error: "Ошибка сервера."
      })
    };
  }
};
