import TelegramBot from 'node-telegram-bot-api';

export const mailSender = async (message) => {

  const BOT_API_TOKEN = process.env.BOT_API_TOKEN;
  const TELEGRAM_API_CODE = process.env.TELEGRAM_API_CODE;
  const bot = new TelegramBot(BOT_API_TOKEN, { polling: false });
  await bot.sendMessage(TELEGRAM_API_CODE, message);
}