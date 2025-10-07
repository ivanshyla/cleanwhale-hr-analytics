import bcrypt from 'bcryptjs';

const password = 'password123';
const hashFromDB = '$2a$10$Rn0QYGQ4/a0X.W7KSpl5IuOhNvYrNY4dyRGKUPKMwpPeyZRkCT/NC';

console.log('Testing password...\n');
console.log(`Password: "${password}"`);
console.log(`Hash from DB: ${hashFromDB}\n`);

bcrypt.compare(password, hashFromDB).then(isMatch => {
  console.log(`Does "${password}" match the hash?`, isMatch ? '✅ YES' : '❌ NO');
  
  if (!isMatch) {
    console.log('\n⚠️ Password does NOT match!');
    console.log('Generating new hash for comparison...');
    
    bcrypt.hash(password, 10).then(newHash => {
      console.log(`New hash: ${newHash}`);
      
      // Test if new hash works
      bcrypt.compare(password, newHash).then(testMatch => {
        console.log(`New hash works?`, testMatch ? '✅ YES' : '❌ NO');
      });
    });
  } else {
    console.log('\n✅ Password is correct!');
  }
});

