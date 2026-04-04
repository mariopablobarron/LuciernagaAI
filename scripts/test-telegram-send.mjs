import dotenv from "dotenv";

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const explicitChatId = process.env.ADMIN_TELEGRAM_ID || process.env.TELEGRAM_CHAT_ID;

if (!token) {
  console.log("MISSING: TELEGRAM_BOT_TOKEN");
  process.exit(2);
}

async function main() {
  let chatId = explicitChatId;

  if (!chatId) {
    const updatesRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=50`);
    const updates = await updatesRes.json();

    if (!updates?.ok) {
      console.log("GET_UPDATES_FAILED");
      process.exit(1);
    }

    const ids = (updates.result || []).map((item) => item?.message?.chat?.id).filter(Boolean);

    chatId = ids.at(-1);
  }

  if (!chatId) {
    console.log("NO_CHAT_ID_FOUND");
    process.exit(3);
  }

  const text = `Prueba Telegram Luciernaga OK - ${new Date().toISOString()}`;
  const sendRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ chat_id: String(chatId), text }),
  });

  const sendPayload = await sendRes.json();
  if (sendPayload?.ok) {
    console.log("TELEGRAM_SEND_OK");
    return;
  }

  console.log("TELEGRAM_SEND_FAILED");
  process.exit(1);
}

main().catch(() => {
  console.log("TELEGRAM_SEND_FAILED");
  process.exit(1);
});
