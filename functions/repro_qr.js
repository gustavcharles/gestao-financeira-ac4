const fetch = require('node-fetch');

async function test() {
    try {
        const url = "https://us-central1-controle-contas-ac4.cloudfunctions.net/whatsappGetQRCode?adminKey=ac4migrate2026";
        const response = await fetch(url);
        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response JSON Keys:", Object.keys(data));
        console.log("Success:", data.success);
        console.log("Data struct:", JSON.stringify(data.data, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

test();
