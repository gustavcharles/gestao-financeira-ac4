const fetch = require('node-fetch');

async function test() {
  try {
    const url = "https://us-central1-controle-contas-ac4.cloudfunctions.net/whatsappSendTest?adminKey=ac4migrate2026";
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: "556299999999", message: "Hello from test script" })
    });
    const data = await response.json();
    console.log("Status:", response.status);
    console.log("Data:", data);
  } catch (e) {
    console.error("Error:", e.message);
  }
}

test();
