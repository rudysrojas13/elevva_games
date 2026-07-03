const crypto = require('crypto');

async function testDigiseller() {
  const sellerId = '1461942';
  const apiKey = '75AD41D93D08419B833A490684DE4655';
  const timestamp = Math.floor(Date.now() / 1000);
  const sign = crypto.createHash('sha256').update(apiKey + timestamp).digest('hex');

  const loginRes = await fetch('https://api.digiseller.com/api/apilogin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ seller_id: parseInt(sellerId), timestamp, sign }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  // Let's try English lang
  const prodRes = await fetch(`https://api.digiseller.com/api/products/5409724/data?token=${token}&lang=en-US`, {
    headers: { 'Accept': 'application/json' }
  });
  const prodData = await prodRes.json();
  const p = prodData.product;
  
  console.log("DESC in en-US:", (p.info || p.add_info).substring(0, 100));
  console.log("OPTIONS:", JSON.stringify(p.options, null, 2));
}

testDigiseller();
