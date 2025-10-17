import fs from 'fs';

const filePath = 'src/app/api/country-aggregates/route.ts';
let content = fs.readFileSync(filePath, 'utf-8');

// Заменяем блок валидации на упрощённый
const oldValidation = `    console.log('📊 Processing country aggregates:', {
      weekIso,
      itemsCount: items.length,
      firstItem: items[0]
    });

    // Валидируем каждый item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.cityId) {
        console.error(\`❌ Item \${i} missing cityId:\`, item);
        return NextResponse.json(
          { message: \`Item \${i}: отсутствует cityId\` },
          { status: 400 }
        );
      }
      
      const cityId = parseInt(item.cityId);
      if (isNaN(cityId)) {
        console.error(\`❌ Item \${i} invalid cityId:\`, item.cityId);
        return NextResponse.json(
          { message: \`Item \${i}: cityId должно быть число, получено \${item.cityId}\` },
          { status: 400 }
        );
      }
    }`;

const newValidation = `    console.log('📊 Processing country aggregates:', {
      weekIso,
      itemsCount: items.length,
      firstItem: items[0]
    });`;

content = content.replace(oldValidation, newValidation);

fs.writeFileSync(filePath, content);
console.log('✅ Fixed country-aggregates.ts - removed strict validation');
