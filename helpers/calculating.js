
export const whiten = (series) => {
  const diff = series.map((value, index) => {
    if (index < 2) return 0;
    return value - series[index - 2];
  });
  diff[0] = 0;
  diff[1] = series[1] - series[0];

  return diff.map(value => 0.5 * value);
}

export const bpf = (series, period, bandwidth) => {
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

export const vpf = (series, bars_of_prediction) => {
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


export const sma = (src, m) => {
  const coef = new Array(m).fill(1 / m);
  return src.map((value, index) => {
    const start = Math.max(0, index - m + 1);
    const end = index + 1;
    const sum = coef.reduce((acc, coeff, i) => acc + src[start + i] * coeff, 0);
    return sum;
  });
}

export const stdev = (src, m) => {
  const squaredSrc = src.map((value) => value * value);
  const a = sma(squaredSrc, m);
  const b = sma(src, m).map((value) => value * value);
  return a.map((aValue, index) => Math.sqrt(aValue - b[index]));
}

export const correlation = (sorce, indexArray, periodCorrelation) => {

  const xy = sorce.map((xValue, index) => {
    return xValue * indexArray[index]
  });
  const cov = sma(xy, periodCorrelation).map((value, index) => value - sma(sorce, periodCorrelation)[index] * sma(indexArray, periodCorrelation)[index]);
  const den = stdev(sorce, periodCorrelation).map((xValue, index) => xValue * stdev(indexArray, periodCorrelation)[index]);
  return cov.map((covValue, index) => covValue / den[index]);
}
