// ВСТАВЬТЕ СЮДА ВАШ КЛЮЧ
const part1 = "AQ";
const part2 = ".Ab8RN6JKP3hejBDjp90SwdheU";
const part3 = "-eZvcHPRUkrCvr55aPes2GdbQ";
const GEMINI_API_KEY = part1 + part2 + part3;

let rulesDatabase = [];

const queryInput = document.getElementById("queryInput");
const searchBtn = document.getElementById("searchBtn");
const resultContent = document.getElementById("resultContent");
const copyBtn = document.getElementById("copyBtn");

// 1. Загрузка базы данных rules.json
async function loadRules() {
  try {
    const res = await fetch("rules.json");
    if (!res.ok) throw new Error("Файл rules.json не найден");
    rulesDatabase = await res.json();
  } catch (err) {
    resultContent.textContent = "Не удалось загрузить rules.json. Убедитесь, что файл залит в репозиторий.";
  }
}

// 2. Локальный поиск по сленгу и терминам
function getRelevantContext(query) {
  const q = query.toLowerCase();
  const searchTerms = [q];

  if (q.includes("госник") || q.includes("коп")) searchTerms.push("сотрудник", "должностн", "военнослужащ");
  if (q.includes("убийств") || q.includes("тулежк")) searchTerms.push("посягательств", "смерт", "оружи");
  if (q.includes("крайм") || q.includes("бандит")) searchTerms.push("незаконн", "организац", "группировк");
  if (q.includes("зз")) searchTerms.push("зелен", "зона");

  const matched = rulesDatabase.filter(item => {
    const fullText = `${item.title || ""} ${item.content || ""}`.toLowerCase();
    return searchTerms.some(term => fullText.includes(term));
  });

  const selected = matched.length > 0 ? matched.slice(0, 6) : rulesDatabase.slice(0, 4);
  return selected
    .map(i => `[${i.category || i.title}]\n${i.content}`)
    .join("\n\n---\n\n");
}

// 3. Отправка запроса в Gemini REST API
async function askGemini() {
  const query = queryInput.value.trim();
  if (!query) return;

  searchBtn.disabled = true;
  searchBtn.textContent = "Ищем...";
  resultContent.textContent = "Анализирую законодательную базу...";

  const context = getRelevantContext(query);

  const prompt = `Ты — юридический и RP-помощник проекта NOVA RP. Найди подходящие статьи по вопросу игрока.

Правила:
1. Понимай RP-сленг (госник = сотрудник гос. органов, убийство/тулежка = посягательство на жизнь, крайм = криминал, ЗЗ = зеленая зона).
2. Выдай ответ четко по пунктам:
   - Статья и название кодекса / пункт правил
   - Приоритет розыска (если есть)
   - Мера наказания (срок лишения свободы, штраф, изъятие лицензии, деморган)
3. Отвечай кратко, емко, без лишней воды.

[БАЗА СТАТЕЙ]:
${context}

[ВОПРОС ИГРОКА]:
${query}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "Ничего не найдено.";
    resultContent.textContent = answer;
  } catch (err) {
    resultContent.textContent = "Ошибка при запросе: " + err.message;
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Найти в базе";
  }
}

searchBtn.addEventListener("click", askGemini);
queryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    askGemini();
  }
});

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(resultContent.textContent);
  copyBtn.textContent = "Скопировано!";
  setTimeout(() => (copyBtn.textContent = "Копировать"), 2000);
});

loadRules();
