// Імпортуємо потрібні бібліотеки
import express from 'express';          // сервер (API)
import cors from 'cors';                // дозволяє запити з інших доменів
import { readFileSync, writeFileSync } from 'fs'; // робота з файлами
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';   // генерація унікальних ID

// Отримуємо шлях до поточної папки
const __dirname = dirname(fileURLToPath(import.meta.url));

// Шлях до "бази даних" (json файл)
const DB_PATH = join(__dirname, 'db.json');

// Створюємо сервер
const app = express();

// Підключаємо middleware
app.use(cors());          // дозволяє фронтенду підключатись
app.use(express.json());  // дозволяє читати JSON з body

// Функція читання бази даних
const readDB = () => JSON.parse(readFileSync(DB_PATH, 'utf-8'));

// Функція запису в базу даних
const writeDB = (data) => writeFileSync(DB_PATH, JSON.stringify(data, null, 2));

// Дозволені значення
const ALLOWED_CATEGORIES = ['SKILL', 'FITNESS', 'READING'];
const ALLOWED_STATUSES   = ['ACTIVE', 'COMPLETED', 'ARCHIVED'];

// В залежності від категорії — різні одиниці
const UNIT_MAP = { SKILL: 'chapters', FITNESS: 'sessions', READING: 'books' };


// Перевіряє чи є зайві поля в запиті
function getUnsupportedKeys(body, allowedKeys) {
  return Object.keys(body).filter(k => !allowedKeys.includes(k));
}


// Головна функція валідації (перевірка даних з фронта)
function validateDtoIn(body, rules) {

  const invalidTypeKeyMap = {};   // неправильний тип (наприклад string замість number)
  const invalidValueKeyMap = {};  // неправильне значення (наприклад менше мінімуму)
  const missingKeyMap = {};       // відсутні обов’язкові поля

  // Проходимо по кожному правилу
  for (const [key, rule] of Object.entries(rules)) {
    const value = body[key];

    // Перевірка: чи є обов’язкове поле
    if (rule.required && (value === undefined || value === null || value === '')) {
      missingKeyMap[key] = `Field "${key}" is required`;
      continue;
    }

    // Якщо значення немає — пропускаємо
    if (value === undefined || value === null) continue;

    // Перевірка типу string
    if (rule.type === 'string' && typeof value !== 'string') {
      invalidTypeKeyMap[key] = `Field "${key}" must be a string`;
      continue;
    }

    // Перевірка типу number
    if (rule.type === 'number') {
      const num = Number(value);

      if (isNaN(num)) {
        invalidTypeKeyMap[key] = `Field "${key}" must be a number`;
        continue;
      }

      // Перевірка мін/макс
      if (rule.min !== undefined && num < rule.min)
        invalidValueKeyMap[key] = `Field "${key}" must be >= ${rule.min}`;

      if (rule.max !== undefined && num > rule.max)
        invalidValueKeyMap[key] = `Field "${key}" must be <= ${rule.max}`;
    }

    // Додаткові перевірки для string
    if (rule.type === 'string') {
      if (rule.minLength && value.length < rule.minLength)
        invalidValueKeyMap[key] = `Field "${key}" must be at least ${rule.minLength} characters`;

      if (rule.maxLength && value.length > rule.maxLength)
        invalidValueKeyMap[key] = `Field "${key}" must be at most ${rule.maxLength} characters`;

      if (rule.enum && !rule.enum.includes(value))
        invalidValueKeyMap[key] = `Field "${key}" must be one of: ${rule.enum.join(', ')}`;
    }

    // Перевірка дати
    if (rule.type === 'date') {
      // формат YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
        invalidValueKeyMap[key] = `Field "${key}" must be YYYY-MM-DD`;

      // не можна майбутню дату
      else if (rule.notFuture && value > new Date().toISOString().split('T')[0])
        invalidValueKeyMap[key] = `Field "${key}" cannot be a future date`;
    }
  }

  return { invalidTypeKeyMap, invalidValueKeyMap, missingKeyMap };
}


// Перевірка: чи є хоч одна помилка
function hasErrors(r) {
  return Object.keys(r.invalidTypeKeyMap).length > 0 ||
         Object.keys(r.invalidValueKeyMap).length > 0 ||
         Object.keys(r.missingKeyMap).length > 0;
}


// Пагінація (розбиває список на сторінки)
function paginate(items, query) {

  const pageIndex = Math.max(0, parseInt(query.pageIndex) || 0);
  const pageSize  = Math.min(100, Math.max(1, parseInt(query.pageSize) || 10));

  const total = items.length;

  // Вирізаємо потрібний шматок масиву
  const paged = items.slice(
    pageIndex * pageSize,
    (pageIndex + 1) * pageSize
  );

  return {
    itemList: paged,
    pageInfo: { pageIndex, pageSize, total }
  };
}


// ======================= PROJECT API =======================

// Отримати список проектів
app.get('/api/projects', (req, res) => {

  const db = readDB();
  const warnings = [];

  // Дозволені query параметри
  const allowedQuery = ['pageIndex', 'pageSize', 'status'];

  // Перевірка зайвих параметрів
  const uk = Object.keys(req.query).filter(k => !allowedQuery.includes(k));
  if (uk.length) {
    warnings.push({
      code: 'unsupportedKeys',
      message: 'DtoIn contains unsupported keys.',
      unsupportedKeyList: uk
    });
  }

  // Фільтр по статусу
  if (req.query.status && !ALLOWED_STATUSES.includes(req.query.status)) {
    return res.status(400).json({
      code: 'invalidDtoIn',
      message: 'DtoIn is not valid.',
      invalidValueKeyMap: {
        status: `Must be one of: ${ALLOWED_STATUSES.join(', ')}`
      }
    });
  }

  // Якщо є статус — фільтруємо
  let items = req.query.status
    ? db.projects.filter(p => p.status === req.query.status)
    : [...db.projects];

  // Пагінація
  const result = paginate(items, req.query);

  res.json({
    ...result,
    ...(warnings.length && { warnings })
  });
});
