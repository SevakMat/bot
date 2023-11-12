import fetch from "node-fetch";
import crypto from "crypto";
import { apiPaths } from "../constants/byBitUrls"

export class ByBitClient {
  apiUrl = "https://api.bybit.com";
  apis = apiPaths;
  recvWindow = 5000;

  constructor(key, secret) {
    this.apiKey = key;
    this.apiSecret = secret;
  }

  toUrlSearchParams(paramsObject) {
    return new URLSearchParams(paramsObject).toString();
  }

  getHeaders(signature, timestamp) {
    return {
      'Content-Type': 'application/json; charset=utf-8',
      'X-BAPI-SIGN': signature,
      'X-BAPI-API-KEY': this.apiKey,
      'X-BAPI-TIMESTAMP': timestamp,
      'X-BAPI-RECV-WINDOW': this.recvWindow
    }
  }

  generateSignature(body, time) {
    const stringSimple = time + this.apiKey + this.recvWindow + body;
    const signature = crypto.createHmac('sha256', this.apiSecret).update(stringSimple).digest('hex');

    return signature;
  }

  fetchOrderList() {
    return this.get(
      this.apiPaths.getOrderList,
      this.toUrlSearchParams({ limit: 10 })
    );
  }

  placeOrder(body) {
    return this.post(
      this.apiPaths.placeOrder,
      body
    );
  }

  get(url, params) {
    const path = params ? `${url}?${params}` : url;
    const currentTime = new Date().getTime();
    const headers = this.getHeaders(
      this.generateSignature(params, currentTime),
      currentTime
    );

    return fetch(`${this.apiUrl}${path}`, { method: "GET", headers })
    .then(this.toJson)
    .catch(this.handleError)
  }

  post(url, body) {
    const jsonBody = JSON.stringify(body);
    const currentTime = new Date().getTime();
    const headers = this.getHeaders(
      this.generateSignature(jsonBody, currentTime),
      currentTime
    );

    return fetch(`${this.apiUrl}${url}`, {
      method: "POST",
      headers,
      body: jsonBody
    })
    .then(this.toJson)
    .catch(this.handleError)
  }

  toJson (res) {
    return res.json();
  };

  handleError (error) {
    return { error: true, error };
  };
}
