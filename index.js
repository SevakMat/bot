const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const { DateTime } = require('luxon');
const app = require("express")();
const cron = require('node-cron');

// verjnakan
const cryptosToWatch = [
  'BTCUSDT',
  'ETHUSDT',
  'ATOMUSDT',
  'SOLUSDT',
  'LINKUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'DOGEUSDT',
  'TRXUSDT',
  'MATICUSDT',
  'APTUSDT',
  'DOTUSDT',
  'LTCUSDT',
  'XLMUSDT',
  'BCHUSDT',
  'ALGOUSDT',
  'ETCUSDT',
  'AVAXUSDT',
  'XMRUSDT',
  'UNIUSDT',
  'ICPUSDT',
  'HBARUSDT',
  'FILUSDT',
  'VETUSDT',
  'AAVEUSDT',
  'ARBUSDT',
  'GRTUSDT',
  'AXSUSDT',
  'EGLDUSDT',
  'SANDUSDT',
  'XTZUSDT',
  'MANAUSDT',
  'EOSUSDT',
  'THETAUSDT',
  'FTMUSDT',
  'MINAUSDT',
  'KAVAUSDT',
  'FLOWUSDT',
  'GALAUSDT',
  'CHZUSDT',
  'APEUSDT',
  'IOTAUSDT',
  'ZECUSDT',
  'DYDXUSDT',
  'BTTUSDT',
  'COMPUSDT',
  'DASHUSDT',
  'BATUSDT',
  '1INCHUSDT',
  'ASTRUSDT',
  'GLMRUSDT',
  'NEARUSDT',
  'BICOUSDT',
];


const BOT_API_TOKEN = process.env.BOT_API_TOKEN;

class VossPrediction {
  constructor(crypto = 'BTCUSDT') {
    this.apiUrl = `https://fapi.binance.com/fapi/v1/klines?symbol=${crypto}&interval=1h`;
  }

  static whiten(series) {
    const diff = series.map((value, index) => {
      if (index < 2) return 0;
      return value - series[index - 2];
    });
    diff[0] = 0;
    diff[1] = series[1] - series[0];

    return diff.map(value => 0.5 * value);
  }

  static bpf(series, period, bandwidth) {
    const PIx2 = 4.0 * Math.asin(1.0);
    const alpha = PIx2 / period;
    const gamma = Math.cos(alpha * bandwidth);
    const delta = 1.0 / gamma - Math.sqrt(1.0 / (gamma * gamma) - 1.0);

    const band_pass = Array(series.length).fill(0);

    for (let i = 0; i < series.length; i++) {
      if (i < 2) continue;
      band_pass[i] = (1.0 - delta) * series[i] + Math.cos(alpha) * (1.0 + delta) * band_pass[i - 1] - delta * band_pass[i - 2];
    }

    return band_pass;
  }

  static vpf(series, bars_of_prediction) {
    const order = 3 * Math.min(3, bars_of_prediction);
    const voss = Array(series.length).fill(0);

    for (let j = 0; j < series.length; j++) {
      if (j < order) continue;
      let E = 0.0;

      for (let i = 0; i < order; i++) {
        E = voss[j - (order - i)] * (1 + i) / order + E;
      }

      voss[j] = 0.5 * (3.0 + order) * series[j] - E;
    }

    return voss;
  }


  static sma(src, m) {
    const coef = new Array(m).fill(1 / m);
    return src.map((value, index) => {
      const start = Math.max(0, index - m + 1);
      const end = index + 1;
      const sum = coef.reduce((acc, coeff, i) => acc + src[start + i] * coeff, 0);
      return sum;
    });
  }

  static stdev(src, m) {
    const squaredSrc = src.map((value) => value * value);
    const a = VossPrediction.sma(squaredSrc, m);
    const b = VossPrediction.sma(src, m).map((value) => value * value);
    return a.map((aValue, index) => Math.sqrt(aValue - b[index]));
  }

  static correlation(sorce, indexArray, periodCorrelation) {

    const xy = sorce.map((xValue, index) => {
      return xValue * indexArray[index]
    });
    const cov = VossPrediction.sma(xy, periodCorrelation).map((value, index) => value - VossPrediction.sma(sorce, periodCorrelation)[index] * VossPrediction.sma(indexArray, periodCorrelation)[index]);
    const den = VossPrediction.stdev(sorce, periodCorrelation).map((xValue, index) => xValue * VossPrediction.stdev(indexArray, periodCorrelation)[index]);
    return cov.map((covValue, index) => covValue / den[index]);
  }

  async predict(crossingTime, isBTC) {
    const response = await axios.get(this.apiUrl);
    const data = response.data;
    const df = data.map(item => item.map(parseFloat));

    const closeColumn = df.map(row => row[4]);

    const whitened = VossPrediction.whiten(closeColumn);
    const BPF = VossPrediction.bpf(whitened, 20, 0.25);
    const VPF = VossPrediction.vpf(BPF, 20);

    const barIndex = Array.from({ length: df.length }, (_, i) => i);
    const correlationArray = VossPrediction.correlation(closeColumn, barIndex, 20);

    const intersections = [];

    for (let i = 0; i < BPF.length; i++) {
      if (i < 1) continue;
      if (Math.sign(BPF[i - 1] - VPF[i - 1]) !== Math.sign(BPF[i] - VPF[i]) && (BPF[i - 1] < 0 && VPF[i - 1] < 0)) {
        if (isBTC) {
          intersections.push(i);
        } else {
          if (correlationArray[i] > 0.50 || correlationArray[i - 1] > 0.50)
            intersections.push(i);
        }
      }
    }

    const lastIntersectionIndex = intersections[intersections.length - 1];
    const lastIntersectionTime = DateTime.fromSeconds(df[lastIntersectionIndex][0] / 1000, { zone: 'utc' });
    const lastUpdateTime = DateTime.fromSeconds(df[df.length - 1][0] / 1000, { zone: 'utc' });
    const lastIntersectionHoursBefore = lastUpdateTime.diff(lastIntersectionTime, 'hours').hours;

    // 0 - KLOR JAMIC MINCH ES PAHY ORINAK ETE HIMA 15:06 A EXEL A 15:00-HIMA
    //1 - ARDEN LRACAC KLOR JAMI U NAXORD KLOR JAMI MEJ , ORINAK ETE HIMA 15:06 A EXEL A 13:00-14:00
    // CANKACAC CANDLE CUYC A TALIS ET PAHIC IRA JAMIN GUMARAC TIMEFRAMEN 

    if (lastIntersectionHoursBefore < crossingTime) {
      return Intl.DateTimeFormat("en", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(df[lastIntersectionIndex][0]));
    }

    return null;
  }
}

const bot = new TelegramBot(BOT_API_TOKEN, { polling: false });

async function main() {
  const predictionBRC = await new VossPrediction("BTCUSDT").predict(2, true);
  // skzbic stugum enq btc hatum a te che , ete ha gnum enq mnacacnenq stugum 
  let findSomething = false
  if (predictionBRC) {
    await bot.sendMessage('-970782359', "BTC henc nor hatec");
    for (const crypto of cryptosToWatch) {
      const prediction = await new VossPrediction(crypto).predict(2, false);
      if (prediction) {
        const message = ` ${crypto} - ${prediction}`;
        findSomething = true
        await bot.sendMessage('-970782359', message);
      }
    }
  }
  if (findSomething) {
    await bot.sendMessage('-970782359', "That's it for 1 hour");
  } else {
    await bot.sendMessage('-970782359', "Bot is working  but not result");
  }
}


app.listen(8080, () => {
  console.log("server running on port 8080")
  cron.schedule('0 * * * *', () => {
    console.log('running a task every minute');
    main();
  });
  // main();


})