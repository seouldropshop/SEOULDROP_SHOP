export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Отправка заказа в Telegram
    if (url.pathname === "/api/create-order" && request.method === "POST") {
      try {
        const body = await request.json();

        const { name, phone, address, comment, items, total, telegramUser } = body;

        if (!name || !phone || !address || !Array.isArray(items) || !items.length) {
          return Response.json(
            { ok: false, error: "Заполните обязательные поля и добавьте товар." },
            { status: 400 }
          );
        }

        if (!env.BOT_TOKEN || !env.ADMIN_CHAT_ID) {
          return Response.json(
            { ok: false, error: "Переменные Telegram ещё не настроены." },
            { status: 500 }
          );
        }

        const lines = items.map(item =>
          `• ${item.name} × ${item.qty} — ${Number(item.price * item.qty).toLocaleString("ru-RU")} ₽`
        ).join("\n");

        const telegram =
          telegramUser?.username
            ? `@${telegramUser.username}`
            : (telegramUser?.first_name || "не указан");

        const text =
          `🛍 НОВЫЙ ЗАКАЗ SEOULDROP\n\n` +
          `${lines}\n\n` +
          `💰 Итого: ${Number(total || 0).toLocaleString("ru-RU")} ₽\n\n` +
          `👤 Имя: ${name}\n` +
          `📞 Телефон: ${phone}\n` +
          `📍 Адрес: ${address}` +
          `${comment ? `\n💬 Комментарий: ${comment}` : ""}\n\n` +
          `👤 Telegram: ${telegram}`;

        const response = await fetch(
          `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: env.ADMIN_CHAT_ID,
              text
            })
          }
        );

        const result = await response.json();

        if (!result.ok) {
          return Response.json(
            { ok: false, error: "Telegram не принял сообщение." },
            { status: 502 }
          );
        }

        return Response.json({ ok: true });

      } catch (error) {
        return Response.json(
          { ok: false, error: "Ошибка сервера." },
          { status: 500 }
        );
      }
    }

    // Обычные страницы магазина
    return env.ASSETS.fetch(request);
  }
};
