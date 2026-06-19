async function run() {
  console.log('=== VERIFY ORDER/TICKET HISTORY ENDPOINT ===');

  try {
    // 1. Log in to get the token
    const loginRes = await fetch('http://localhost:3000/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'audience@example.com',
        password: 'Password123!',
      }),
    });

    const loginData = await loginRes.json() as any;
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${JSON.stringify(loginData)}`);
    }

    const token = loginData.data.accessToken;
    console.log('Login successful! Access token acquired.');

    // 2. Fetch history
    const historyRes = await fetch('http://localhost:3000/api/v1/tickets/history', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const historyData = await historyRes.json() as any;
    if (!historyRes.ok) {
      throw new Error(`Fetch history failed: ${JSON.stringify(historyData)}`);
    }

    console.log('\n--- History Data ---');
    console.log(JSON.stringify(historyData.data, null, 2));
    console.log('\n✅ SUCCESS: History endpoint verified successfully!');
  } catch (err: any) {
    console.error('\n❌ FAILURE:', err.message);
  }
}

run();
