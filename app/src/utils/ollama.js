const { BrowserWindow, ipcMain } = require('electron');
const { getSystemPrompt } = require('./prompts');

let currentSessionId = null;
let conversationHistory = [];
let isInitializingSession = false;
let ollamaModel = 'deepseek-coder:6.7b';
let visionModel = 'llava:7b';
let ollamaUrl = 'http://localhost:11434';
let serverUrl = process.env.SERVER_URL || 'http://localhost:3000';
let systemPrompt = '';

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

function initializeNewSession() {
    currentSessionId = Date.now().toString();
    conversationHistory = [];
    console.log({ sessionId: currentSessionId });
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
    console.log({ conversationTurn });

    sendToRenderer('save-conversation-turn', {
        sessionId: currentSessionId,
        turn: conversationTurn,
        fullHistory: conversationHistory,
    });
}

function getCurrentSessionData() {
    return {
        sessionId: currentSessionId,
        history: conversationHistory,
    };
}

async function checkOllamaAvailability() {
    try {
        const response = await fetch(`${ollamaUrl}/api/tags`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            return { available: false, error: `Ollama server returned status ${response.status}` };
        }

        const data = await response.json();
        const models = data.models || [];
        const hasModel = models.some(m => m.name === ollamaModel || m.name.startsWith(ollamaModel.split(':')[0]));
        const hasVisionModel = models.some(m => m.name.includes('llava') || m.name.includes('bakllava'));

        return {
            available: true,
            models: models.map(m => m.name),
            hasModel,
            hasVisionModel,
        };
    } catch (error) {
        return {
            available: false,
            error: error.message,
        };
    }
}

async function initializeOllamaSession(customPrompt = '', profile = 'leetcode', model = 'deepseek-coder:6.7b') {
    if (isInitializingSession) {
        console.log({ message: 'Session initialization already in progress' });
        return false;
    }

    isInitializingSession = true;
    sendToRenderer('session-initializing', true);

    try {
        ollamaModel = model;
        systemPrompt = getSystemPrompt(profile, customPrompt, false);

        const checkResult = await checkOllamaAvailability();
        if (!checkResult.available) {
            throw new Error(`Ollama server is not available at ${ollamaUrl}. Please make sure Ollama is running: ollama serve`);
        }

        if (!checkResult.hasModel) {
            console.warn({ message: `Model ${ollamaModel} not found. Available models: ${checkResult.models.join(', ')}` });
            sendToRenderer('update-status', `Warning: Model ${ollamaModel} not found. Using available model.`);
        }

        if (!checkResult.hasVisionModel) {
            sendToRenderer('update-status', `⚠️  Для изображений скачайте: ollama pull llava:7b`);
        }

        initializeNewSession();

        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Ollama connected');
        sendToRenderer('model-info', {
            codeModel: ollamaModel,
            visionModel: visionModel,
            hasVision: checkResult.hasVisionModel,
        });
        return true;
    } catch (error) {
        console.error({ error: error.message });
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Error: ' + error.message);
        return false;
    }
}

async function analyzeImageWithVision(imageBase64, question) {
    try {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        
        console.log({ message: 'Анализируем изображение...' });
        sendToRenderer('update-status', '🔍 Анализирую изображение...');

        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: visionModel,
                prompt: (question || 'Что изображено на этой картинке? Опиши подробно для программиста.') + ' ОТВЕЧАЙ НА РУССКОМ ЯЗЫКЕ.',
                images: [cleanBase64],
                stream: false,
                options: {
                    temperature: 0.1,
                    num_predict: 1000,
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`Vision error: ${response.status}`);
        }

        const data = await response.json();
        console.log({ message: 'Изображение проанализировано' });
        return data.response;
    } catch (error) {
        console.error({ error: error.message });
        throw error;
    }
}

async function solveAlgorithmFromImage(imageBase64, userQuestion = '') {
    try {
        sendToRenderer('update-status', '📸 Отправляю изображение на сервер...');
        
        const response = await fetch(`${serverUrl}/api/image`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                imageData: imageBase64,
                question: userQuestion || '',
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `Server error: ${response.status}`;
            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) {
                    errorMessage = errorJson.error;
                }
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Failed to solve problem');
        }

        if (result.response) {
            const fullResponse = result.response;
            sendToRenderer('update-response', fullResponse);

            const userMessageText = userQuestion || 'Реши задачу с изображения';
            saveConversationTurn(userMessageText, fullResponse, true);
            
            sendToRenderer('update-status', '✅ Задача решена!');
            return { success: true, response: fullResponse };
        }

        throw new Error('No response from server');
    } catch (error) {
        console.error({ error: error.message });
        sendToRenderer('update-status', `❌ Ошибка: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function sendMessage(text, imageBase64 = null) {
    if (!currentSessionId) {
        await initializeOllamaSession('', 'leetcode');
    }

    try {
        if (imageBase64) {
            return await solveAlgorithmFromImage(imageBase64, text);
        }

        if (!text || text.trim().length === 0) {
            return { success: false, error: 'Empty message' };
        }
        const messages = [];

        if (systemPrompt) {
            messages.push({
                role: 'system',
                content: systemPrompt,
            });
        }

        for (const turn of conversationHistory) {
            messages.push({
                role: 'user',
                content: turn.transcription,
            });
            messages.push({
                role: 'assistant',
                content: turn.ai_response,
            });
        }

        messages.push({
            role: 'user',
            content: `ВАЖНО: 
- Отвечай ТОЛЬКО на JavaScript. НЕ используй Python или другие языки.
- НЕ используй регулярные выражения (regexp) в решении, если об этом явно не просят. Используй простые строковые методы.
- ОТВЕЧАЙ НА РУССКОМ ЯЗЫКЕ.
- КРИТИЧЕСКИ ВАЖНО: ВСЕГДА добавляй подробные комментарии в код на русском языке. КАЖДАЯ логическая часть кода (циклы, условия, присваивания, операции, возвраты значений) ДОЛЖНА иметь комментарий, объясняющий что она делает и зачем. Без комментариев код считается неполным и неверным.
- В НАЧАЛЕ ответа ОБЯЗАТЕЛЬНО напиши: "Для решения этой задачи мы будем использовать [название техники/подхода], ..." и подробно объясни выбранный подход и стратегию.

${text}`,
        });

        sendToRenderer('update-status', 'Processing...');

        const response = await fetch(`${ollamaUrl}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: ollamaModel,
                messages: messages,
                stream: true,
                options: {
                    temperature: 0.1,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error) {
                    errorMessage = errorJson.error;
                }
            } catch (e) {
                errorMessage = errorText || errorMessage;
            }

            if (response.status === 404) {
                errorMessage = `Model ${ollamaModel} not found. Please pull it: ollama pull ${ollamaModel}`;
            } else if (response.status === 0 || response.status >= 500) {
                errorMessage = `Ollama server is not available. Please make sure Ollama is running: ollama serve`;
            }

            throw new Error(errorMessage);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim() === '') continue;

                try {
                    const json = JSON.parse(line);
                    const content = json.message?.content || json.content || '';
                    if (content) {
                        fullResponse += content;
                        sendToRenderer('update-response', fullResponse);
                    }

                    if (json.done) {
                        break;
                    }
                } catch (e) {
                    console.error({ error: 'Failed to parse Ollama response', line, parseError: e.message });
                }
            }
        }

        if (buffer.trim()) {
            try {
                const json = JSON.parse(buffer);
                const content = json.message?.content || json.content || '';
                if (content) {
                    fullResponse += content;
                    sendToRenderer('update-response', fullResponse);
                }
            } catch (e) {
                console.error({ error: 'Failed to parse final Ollama response', buffer, parseError: e.message });
            }
        }

        if (text && fullResponse) {
            saveConversationTurn(text, fullResponse, false);
        }

        sendToRenderer('update-status', 'Ready');
        return { success: true };
    } catch (error) {
        console.error({ error: error.message });
        sendToRenderer('update-status', 'Error: ' + error.message);
        return { success: false, error: error.message };
    }
}

function setupOllamaIpcHandlers() {
    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'leetcode', language = 'en-US') => {
        const model = apiKey || 'deepseek-coder:6.7b';
        const success = await initializeOllamaSession(customPrompt, profile, model);
        return success;
    });

    ipcMain.handle('send-text-message', async (event, text) => {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return { success: false, error: 'Invalid text message' };
        }

        console.log({ text });
        return await sendMessage(text.trim(), null);
    });

    ipcMain.handle('send-image-content', async (event, { data, question }) => {
        console.log({ message: 'Получено изображение', size: data?.length || 0 });
        
        if (!data || typeof data !== 'string') {
            return { success: false, error: 'Invalid image data' };
        }
        
        const imageDataUrl = `data:image/jpeg;base64,${data}`;
        
        return await solveAlgorithmFromImage(imageDataUrl, question || '');
    });

    ipcMain.handle('close-session', async event => {
        try {
            ollamaModel = 'deepseek-coder:6.7b';
            visionModel = 'llava:7b';
            systemPrompt = '';
            sendToRenderer('update-status', 'Session closed');
            return { success: true };
        } catch (error) {
            console.error({ error: error.message });
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('get-current-session', async event => {
        try {
            return {
                success: true,
                data: {
                    ...getCurrentSessionData(),
                    codeModel: ollamaModel,
                    visionModel: visionModel,
                },
            };
        } catch (error) {
            console.error({ error: error.message });
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('start-new-session', async event => {
        try {
            initializeNewSession();
            return { success: true, sessionId: currentSessionId };
        } catch (error) {
            console.error({ error: error.message });
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('check-ollama', async event => {
        try {
            return { success: true, data: await checkOllamaAvailability() };
        } catch (error) {
            console.error({ error: error.message });
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    initializeOllamaSession,
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    getCurrentSessionData,
    setupOllamaIpcHandlers,
    checkOllamaAvailability,
    analyzeImageWithVision,
    solveAlgorithmFromImage,
};
