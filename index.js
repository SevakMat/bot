import express from 'express';
import nodeCron from "node-cron"
import { cryptosToWatch } from "./cryptoList.js"
import { mailSender } from './helpers/mailSender.js';
import { predict } from './helpers/predict.js';

const app = express();
const cron = nodeCron

async function main() {

  const predictionBRC = await predict(2, "BTCUSDT");
  let findSomething = false

  if (predictionBRC) {
    mailSender("BTC crossed just now")
    for (const crypto of cryptosToWatch) {
      const prediction = await predict(2, crypto);
      if (prediction) {
        const message = ` ${crypto} - ${prediction}`;
        findSomething = true
        mailSender(message)
      }
    }
  }
  if (findSomething) {
    mailSender("That's it for 1 hour")
  } else {
    mailSender("Bot is working  but not result")
  }
  console.log("done");
}

async function detect() {
  console.log("server running without checking BTC")

  let findSomething = false

  for (const crypto of cryptosToWatch) {
    const prediction = await predict(2, crypto);
    if (prediction) {
      findSomething = true
      console.log(crypto);
    }
  }
  if (findSomething) {
    console.log("That's it for 1 hour");
  } else {
    console.log("Bot is working  but not result");
  }
  console.log("done");
}


app.listen(8080, () => {
  console.log("server running on port 8080")
  cron.schedule('0 * * * *', () => {
    console.log('running a task every minute');
    main();
  });

  // detect()


})