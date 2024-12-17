// Replace with your Deriv API credentials
const derivToken = "t9ShTseddAjVhwX"; // Replace with Deriv API Token
const derivAppId = "66584";    // Replace with Deriv App ID

// WebSocket Connection
const ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=" + derivAppId);

let tickData = [];
const period = 5; // RSI period
const symbol = "R_100"; // Volatility 100 Index

ws.onopen = () => {
  console.log("Connected to Deriv API");

  // Subscribe to tick data
  ws.send(JSON.stringify({
    ticks: symbol,
    subscribe: 1
  }));
};

let lastTick = null;

ws.onmessage = (message) => {
  const data = JSON.parse(message.data);

  if (data.tick) {
    const tick = data.tick.quote;
    const liveTickElement = document.getElementById("live-tick");

    // Update tick data and change color
    liveTickElement.innerText = tick.toFixed(2);
    if (lastTick !== null) {
      if (tick > lastTick) {
        liveTickElement.className = "tick-data up"; // Blue for upward movement
      } else if (tick < lastTick) {
        liveTickElement.className = "tick-data down"; // Red for downward movement
      }
    }
    lastTick = tick;

    tickData.push(tick);

    // Maintain the tick data size
    if (tickData.length > period + 1) {
      tickData.shift();
    }

    if (tickData.length >= period + 1) {
      const rsiValue = calculateRSI(tickData, period);
      const smaValue = calculateSMA(tickData, period);

      document.getElementById("rsi-value").innerText = rsiValue.toFixed(2);
      document.getElementById("sma-value").innerText = smaValue.toFixed(2);

      let signal = "Neutral";

      // Confirm trade signals using RSI and SMA
      if (rsiValue > 70 && tick < smaValue) {
        signal = "SELL Signal Confirmed";
        placeTrade("PUT");
      } else if (rsiValue < 30 && tick > smaValue) {
        signal = "BUY Signal Confirmed";
        placeTrade("CALL");
      }

      document.getElementById("signal").innerText = signal;
    }
  }

  // Handle trade response
  if (data.buy) {
    document.getElementById("trade-status").innerText = "Trade Placed: " + data.buy.contract_type;
    console.log("Trade Placed:", data);
  }
};

// Calculate RSI
function calculateRSI(data, period) {
  let gains = 0, losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses -= change;
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

// Calculate SMA
function calculateSMA(data, period) {
  const sum = data.slice(-period).reduce((a, b) => a + b, 0);
  return sum / period;
}

// Place a trade
function placeTrade(contractType) {
  ws.send(JSON.stringify({
    buy: 1,
    price: 10, // Stake amount
    parameters: {
      amount: 10,
      basis: "stake",
      contract_type: contractType,
      currency: "USD",
      duration: 5,
      duration_unit: "t",
      symbol: symbol
    }
  }));

  document.getElementById("trade-status").innerText = `Placing ${contractType} trade...`;
}
