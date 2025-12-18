const express = require("express");
const cors = require("cors");
const Tesseract = require("tesseract.js");
const sharp = require("sharp");
const { getSystemPrompt } = require("./prompts");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  let responseBody = null;

  res.json = function (body) {
    responseBody = body;
    return originalJson(body);
  };

  res.send = function (body) {
    if (typeof body === "object") {
      responseBody = body;
    }
    return originalSend(body);
  };

  res.on("finish", () => {
    console.log({
      method: req.method,
      body: req.body,
      path: req.path,
      timestamp: new Date().toISOString(),
      statusCode: res.statusCode,
      response: responseBody,
    });
  });

  next();
});

let currentSessionId = null;
let conversationHistory = [];
let isInitializingSession = false;
let ollamaModel = "deepseek-coder:6.7b";
let visionModel = "llava:7b";
let systemPrompt = "";
let ollamaUrl = "http://localhost:11434";
let responseLanguage = "ru";
let programmingLanguage = "JavaScript";

async function extractTextWithTesseract(imageBase64) {
  try {
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBuffer = Buffer.from(base64Data, "base64");

    const processedBuffer = await sharp(imageBuffer)
      .grayscale() // Черно-белое
      .normalize() // Улучшаем контраст
      .linear(1.1, 0) // Увеличиваем контраст
      .sharpen({ sigma: 1 }) // Повышаем резкость
      .threshold(128) // Бинаризация для текста
      .toBuffer();

    // 2. Используем Tesseract для английского (LeetCode на англ)
    console.log("🔍 Запускаю Tesseract OCR...");
    const {
      data: { text },
    } = await Tesseract.recognize(processedBuffer, "eng", {
      logger: (m) => console.log("OCR progress:", m.status),
      tessedit_char_whitelist:
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 .:!?[]()+-=<>{}\"'",
    });

    console.log("✅ OCR извлечен текст:", text.substring(0, 200) + "...");
    return text.trim();
  } catch (error) {
    console.error("❌ Tesseract error:", error.message);
    return null;
  }
}

// ===== КОМБИНИРОВАННЫЙ АНАЛИЗ ИЗОБРАЖЕНИЙ =====

async function analyzeImageWithVision(imageBase64, question) {
  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    console.log("🖼️ Анализируем изображение через llava...");

    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: visionModel,
        prompt:
          question ||
          "Опиши подробно что изображено на этой картинке. Особое внимание удели тексту, числам, формулам.",
        images: [cleanBase64],
        stream: false,
        options: {
          temperature: 0.1,
          num_predict: 1500,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Vision error: ${response.status}`);
    }

    const data = await response.json();
    console.log("✅ llava анализ завершен");
    return data.response;
  } catch (error) {
    console.error("Vision analysis error:", error.message);
    throw error;
  }
}

async function extractProblemFromImage(imageBase64) {
  console.log("📸 Начинаю анализ изображения задачи...");

  // 1. Параллельно запускаем OCR и llava
  const [ocrText, visionDescription] = await Promise.all([
    extractTextWithTesseract(imageBase64),
    analyzeImageWithVision(
      imageBase64,
      "Это скриншот задачи LeetCode. Извлеки максимально точно: " +
        "1. Номер задачи (например, 1658) " +
        "2. Название задачи " +
        "3. Условие задачи " +
        "4. Примеры ввода/вывода " +
        "5. Ограничения"
    ).catch(() => "Не удалось проанализировать"),
  ]);

  // 2. Комбинируем результаты
  let combinedText = "";

  if (ocrText && ocrText.length > 50) {
    combinedText += "=== ТОЧНЫЙ ТЕКСТ ИЗ OCR ===\n";
    combinedText += ocrText + "\n\n";
  }

  combinedText += "=== ОПИСАНИЕ ОТ VISION-МОДЕЛИ ===\n";
  combinedText += visionDescription + "\n\n";

  console.log(
    "📝 Комбинированный результат:",
    combinedText.substring(0, 300) + "..."
  );
  return combinedText;
}

// ===== УЛУЧШЕННЫЙ РЕШАТЕЛЬ ЗАДАЧ =====

async function solveAlgorithmFromImage(imageBase64, userQuestion = "") {
  try {
    // 1. Извлекаем текст из изображения
    const imageDescription = await extractProblemFromImage(imageBase64);

    const languageName = responseLanguage;

    const problemPrompt = `РЕШИ ЗАДАЧУ.

ИСХОДНОЕ ИЗОБРАЖЕНИЕ СОДЕРЖИТ:
${imageDescription}

${userQuestion ? `ДОПОЛНИТЕЛЬНЫЙ ВОПРОС: ${userQuestion}` : ""}

СЛЕДУЙ ФОРМАТУ ОТВЕТА:
1. Название алгоритма/подхода
2. Кратко основная идея решения и сложность (O() времени и памяти)
3. Решение на языке программирования ${programmingLanguage}
4. Комментарии на основных моментах: условия, циклы, ключевые операции

ВАЖНО:
- ОБЯЗАТЕЛЬНО отвечай на ${languageName} языке
- ОБЯЗАТЕЛЬНО используй язык программирования ${programmingLanguage}, НЕ используй другие языки
- Будь максимально точен в условии задачи`;

    console.log("🤔 Отправляю задачу в deepseek-coder...");

    const codeResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: problemPrompt,
          },
        ],
        stream: true,
        options: {
          temperature: 0.1, // Низкая для точности
          num_predict: 4000, // Больше для сложных задач
          top_p: 0.9,
        },
      }),
    });

    if (!codeResponse.ok) {
      throw new Error(`Code model error: ${codeResponse.status}`);
    }

    // 3. Обрабатываем stream
    const reader = codeResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;

        try {
          const json = JSON.parse(line);
          const content = json.message?.content || "";
          if (content) {
            fullResponse += content;
          }
        } catch (e) {}
      }
    }

    console.log("✅ Задача решена, длина ответа:", fullResponse.length);

    // 4. Сохраняем в историю
    const userMessageText = userQuestion || "Реши задачу с изображения";
    const historyEntry = saveConversationTurn(
      userMessageText,
      fullResponse,
      true
    );

    return {
      success: true,
      response: fullResponse,
      extractedText: imageDescription.substring(0, 500),
      sessionId: historyEntry.sessionId,
    };
  } catch (error) {
    console.error("❌ Ошибка решения задачи:", error.message);
    return {
      success: false,
      error: error.message,
      suggestion:
        "Попробуйте ввести задачу текстом или загрузить более четкое изображение",
    };
  }
}

// ===== ОСТАЛЬНЫЕ ФУНКЦИИ (оставляем как есть) =====

function initializeNewSession() {
  currentSessionId = Date.now().toString();
  conversationHistory = [];
  console.log({ sessionId: currentSessionId });
  return currentSessionId;
}

function saveConversationTurn(userMessage, aiResponse, imageProcessed = false) {
  if (!currentSessionId) {
    initializeNewSession();
  }

  const conversationTurn = {
    timestamp: Date.now(),
    transcription: userMessage.trim(),
    ai_response: aiResponse.trim(),
    has_image: imageProcessed,
  };

  conversationHistory.push(conversationTurn);
  console.log("💾 Сохранен ответ в историю");

  return {
    sessionId: currentSessionId,
    turn: conversationTurn,
    fullHistory: conversationHistory,
  };
}

async function sendMessage(text, imageBase64 = null) {
  if (!currentSessionId) {
    await initializeOllamaSession("", "leetcode");
  }

  try {
    if (imageBase64) {
      return await solveAlgorithmFromImage(imageBase64, text);
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    conversationHistory.forEach((turn) => {
      messages.push({
        role: "user",
        content: turn.transcription,
      });
      messages.push({
        role: "assistant",
        content: turn.ai_response,
      });
    });

    messages.push({
      role: "user",
      content: text,
    });

    console.log("💬 Отправляю сообщение в Ollama...");

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: messages,
        stream: true,
        options: {
          temperature: 0.7,
          num_predict: 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = "";
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim() === "") continue;

        try {
          const json = JSON.parse(line);
          const content = json.message?.content || "";
          if (content) {
            fullResponse += content;
          }
        } catch (e) {}
      }
    }

    console.log("✅ Получен ответ от Ollama, длина:", fullResponse.length);

    const historyEntry = saveConversationTurn(text, fullResponse, false);

    return {
      success: true,
      response: fullResponse,
      sessionId: historyEntry.sessionId,
    };
  } catch (error) {
    console.error({ error: error.message });
    return { success: false, error: error.message };
  }
}

async function initializeOllamaSession(
  customPrompt = "",
  profile = "interview",
  language = "en-US",
  responseLanguageParam = null,
  programmingLanguageParam = null
) {
  if (isInitializingSession) {
    console.log({ message: "Session initialization already in progress" });
    return { success: false, error: "Already initializing" };
  }

  isInitializingSession = true;

  try {
    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: "GET",
      timeout: 5000,
    });

    if (!response.ok) {
      throw new Error(`Ollama не запущен. Запустите: ollama serve`);
    }

    const data = await response.json();
    const models = data.models || [];

    const hasCodeModel = models.some(
      (m) => m.name.includes("deepseek-coder") || m.name.includes("codellama")
    );
    const hasVisionModel = models.some(
      (m) => m.name.includes("llava") || m.name.includes("bakllava")
    );

    const extractResponseLanguage = (prompt, param, fallbackLang) => {
      if (param) return param;
      const match = prompt.match(/Response language:\s*(\w+)/i);
      if (match) return match[1];
      return fallbackLang;
    };

    const langToUse = extractResponseLanguage(
      customPrompt,
      responseLanguageParam,
      language
    );
    responseLanguage = langToUse;

    const extractProgrammingLanguage = (prompt, param) => {
      if (param) return param;
      const match = prompt.match(/Programming language:\s*(\w+)/i);
      if (match) return match[1];
      return "JavaScript";
    };

    programmingLanguage = extractProgrammingLanguage(
      customPrompt,
      programmingLanguageParam
    );

    const basePrompt = `ФОРМАТ ОТВЕТА (строго соблюдай порядок):
1. Название алгоритма/подхода
2. Кратко основная идея решения и сложность (O() времени и памяти)
3. Решение на языке программирования ${programmingLanguage}
4. Комментарии на основных моментах: условия, циклы, ключевые операции

ВАЖНО:
- ОБЯЗАТЕЛЬНО отвечай на ${languageName} языке
- ОБЯЗАТЕЛЬНО используй язык программирования ${programmingLanguage}, НЕ используй другие языки
- Комментируй условия (if/else, switch), циклы (for/while), ключевые операции
- Комментарии должны быть краткими, но понятными

${customPrompt}`;

    if (profile === "leetcode") {
      systemPrompt = `Ты - эксперт по алгоритмам LeetCode. ${basePrompt}`;
    } else {
      systemPrompt = `${getSystemPrompt(profile, "", false)}\n\n${basePrompt}`;
    }

    const sessionId = initializeNewSession();
    isInitializingSession = false;

    return {
      success: true,
      sessionId,
      codeModel: ollamaModel,
      visionModel: visionModel,
      hasVision: hasVisionModel,
      hasTesseract: true, // Добавляем флаг наличия OCR
    };
  } catch (error) {
    console.error({ error: error.message });
    isInitializingSession = false;
    return { success: false, error: error.message };
  }
}

// ===== API ENDPOINTS (оставляем как есть) =====

app.post("/api/initialize", async (req, res) => {
  const {
    customPrompt = "",
    profile = "leetcode",
    language = "en-US",
    responseLanguage: responseLanguageParam = null,
    programmingLanguage: programmingLanguageParam = null,
  } = req.body;
  const result = await initializeOllamaSession(
    customPrompt,
    profile,
    language,
    responseLanguageParam,
    programmingLanguageParam
  );
  res.json(result);
});

app.post("/api/message", async (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid text message" });
  }
  const result = await sendMessage(text.trim());
  res.json(result);
});

app.post("/api/image", async (req, res) => {
  const { imageData, question } = req.body;
  console.log("🖼️ Получено изображение, размер:", imageData?.length || 0);

  if (!imageData || typeof imageData !== "string") {
    return res
      .status(400)
      .json({ success: false, error: "Invalid image data" });
  }

  if (!imageData.startsWith("data:image/")) {
    return res
      .status(400)
      .json({ success: false, error: "Not a valid image data URL" });
  }

  const result = await solveAlgorithmFromImage(imageData, question || "");
  res.json(result);
});

// ... остальные эндпоинты без изменений ...

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Сервер запущен на порту", PORT);
  console.log("📡 API эндпоинты:");
  console.log("   POST /api/initialize - инициализация сессии");
  console.log("   POST /api/message    - текстовый запрос");
  console.log("   POST /api/image      - решение по изображению");
  console.log("   GET  /api/models     - список доступных моделей");
  console.log("🔧 Используется: Tesseract OCR + llava + deepseek-coder");
});
