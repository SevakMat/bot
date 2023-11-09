import axios from 'axios';
import { DateTime } from 'luxon';
import { bpf, correlation, vpf, whiten } from './calculating.js';

export const predict = async (crossingTime, cryptoCurrencie) => {

  const apiUrl = `https://fapi.binance.com/fapi/v1/klines?symbol=${cryptoCurrencie}&interval=1h`;

  const response = await axios.get(apiUrl);
  const data = response.data;
  const df = data.map(item => item.map(parseFloat));
  const closeColumn = df.map(row => row[4]);

  const whitened = whiten(closeColumn);
  const BPF = bpf(whitened, 20, 0.25);
  const VPF = vpf(BPF, 20);

  const barIndex = Array.from({ length: df.length }, (_, i) => i);
  const correlationArray = correlation(closeColumn, barIndex, 20);

  const intersections = [];

  for (let i = 0; i < BPF.length; i++) {
    if (i < 1) continue;

    const isCrossing = Math.sign(BPF[i - 1] - VPF[i - 1]) !== Math.sign(BPF[i] - VPF[i])
    const crossingLessZero = (BPF[i - 1] < 0 && VPF[i - 1] < 0)


    if (isCrossing && crossingLessZero) {

      if (cryptoCurrencie === "BTCUSDT") {
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