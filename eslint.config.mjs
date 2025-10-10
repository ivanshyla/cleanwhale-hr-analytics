import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // ✅ БЕЗОПАСНОСТЬ: Включены правила для production
    rules: {
      // Запрет console.* (используйте logger из @/lib/logger)
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
      // Запрет eval и подобных опасных функций
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
    ignores: [
      // Игнорируем только необходимое
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'dist/**',
      '*.config.js',
      '*.config.mjs',
      '*.config.ts',
    ],
  },
];

export default eslintConfig;
