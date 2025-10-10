// Test AI Chat API with real auth

console.log('🔐 Step 1: Login as country_manager...');

const loginRes = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    login: 'admin',
    password: 'admin123'
  })
});

const cookies = loginRes.headers.get('set-cookie');
console.log('Login status:', loginRes.status);
console.log('Cookies:', cookies ? 'Got cookies' : 'No cookies');

if (!cookies) {
  console.log('❌ Login failed!');
  process.exit(1);
}

console.log('\n🤖 Step 2: Call AI Chat API...');

const aiRes = await fetch('http://localhost:3000/api/ai-chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': cookies
  },
  body: JSON.stringify({
    question: 'Как дела у команды?',
    period: 'week'
  })
});

console.log('AI Chat status:', aiRes.status);
console.log('AI Chat status text:', aiRes.statusText);

const responseText = await aiRes.text();
console.log('\nResponse body:');
console.log(responseText);

try {
  const json = JSON.parse(responseText);
  console.log('\nParsed JSON:');
  console.log(JSON.stringify(json, null, 2));
} catch (e) {
  console.log('Response is not JSON');
}

