const { BrowserWindow, ipcMain } = require('electron');
const { getSystemPrompt } = require('./prompts');

let currentSessionId = null;
let conversationHistory = [];
let isInitializingSession = false;
let deepseekApiKey = null;
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

function saveConversationTurn(userMessage, aiResponse) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const conversationTurn = {
        timestamp: Date.now(),
        transcription: userMessage.trim(),
        ai_response: aiResponse.trim(),
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

async function initializeDeepSeekSession(apiKey, customPrompt = '', profile = 'interview', language = 'en-US') {
    if (isInitializingSession) {
        console.log({ message: 'Session initialization already in progress' });
        return false;
    }

    isInitializingSession = true;
    sendToRenderer('session-initializing', true);

    console.log('------------>', { apiKey });

    try {
        deepseekApiKey = apiKey;
        systemPrompt = getSystemPrompt(profile, customPrompt, false);

        initializeNewSession();

        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Session connected');
        return true;
    } catch (error) {
        console.error({ error: error.message });
        isInitializingSession = false;
        sendToRenderer('session-initializing', false);
        sendToRenderer('update-status', 'Error: ' + error.message);
        return false;
    }
}

async function sendMessage(text, imageData = null) {
    if (!deepseekApiKey) {
        return { success: false, error: 'No active DeepSeek session' };
    }

    try {
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

        if (imageData && !text) {
            return { success: false, error: 'DeepSeek API does not support images without text. Please provide text description with the image.' };
        }

        const userMessage = text || '';
        if (!userMessage && !imageData) {
            return { success: false, error: 'Empty message' };
        }

        messages.push({
            role: 'user',
            content: userMessage,
        });

        sendToRenderer('update-status', 'Processing...');

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${deepseekApiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: messages,
                stream: true,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            let errorMessage = `HTTP error! status: ${response.status}`;

            try {
                const errorJson = JSON.parse(errorText);
                if (errorJson.error?.message) {
                    errorMessage = errorJson.error.message;

                    if (response.status === 402) {
                        errorMessage = 'Insufficient Balance. Please top up your DeepSeek API account.';
                    } else if (response.status === 401) {
                        errorMessage = 'Invalid API key. Please check your DeepSeek API key.';
                    } else if (response.status === 429) {
                        errorMessage = 'Rate limit exceeded. Please try again later.';
                    }
                }
            } catch (e) {
                errorMessage = errorText || errorMessage;
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
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;

                    try {
                        const json = JSON.parse(data);
                        const content = json.choices[0]?.delta?.content || '';
                        if (content) {
                            fullResponse += content;
                            sendToRenderer('update-response', fullResponse);
                        }
                    } catch (e) {
                        console.error({ error: 'Failed to parse SSE data', data });
                    }
                }
            }
        }

        if (buffer.trim()) {
            if (buffer.startsWith('data: ')) {
                const data = buffer.slice(6);
                if (data !== '[DONE]') {
                    try {
                        const json = JSON.parse(data);
                        const content = json.choices[0]?.delta?.content || '';
                        if (content) {
                            fullResponse += content;
                            sendToRenderer('update-response', fullResponse);
                        }
                    } catch (e) {
                        console.error({ error: 'Failed to parse final SSE data', data });
                    }
                }
            }
        }

        const savedUserMessage = text || '';
        if (savedUserMessage && fullResponse) {
            saveConversationTurn(savedUserMessage, fullResponse);
        }

        sendToRenderer('update-status', 'Ready');
        return { success: true };
    } catch (error) {
        console.error({ error: error.message });
        sendToRenderer('update-status', 'Error: ' + error.message);
        return { success: false, error: error.message };
    }
}

function setupDeepSeekIpcHandlers() {
    ipcMain.handle('initialize-gemini', async (event, apiKey, customPrompt, profile = 'interview', language = 'en-US') => {
        const success = await initializeDeepSeekSession(apiKey, customPrompt, profile, language);
        return success;
    });

    ipcMain.handle('send-text-message', async (event, text) => {
        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return { success: false, error: 'Invalid text message' };
        }

        console.log({ text });
        return await sendMessage(text.trim());
    });

    ipcMain.handle('send-image-content', async (event, { data, debug }) => {
        if (!deepseekApiKey) {
            return { success: false, error: 'No active DeepSeek session' };
        }

        try {
            if (!data || typeof data !== 'string') {
                console.error({ message: 'Invalid image data received' });
                return { success: false, error: 'Invalid image data' };
            }

            const buffer = Buffer.from(data, 'base64');

            if (buffer.length < 1000) {
                console.error({ bufferLength: buffer.length });
                return { success: false, error: 'Image buffer too small' };
            }

            return await sendMessage('Please analyze this screenshot and help me with the content shown in the image.', data);
        } catch (error) {
            console.error({ error: error.message });
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('close-session', async event => {
        try {
            deepseekApiKey = null;
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
            return { success: true, data: getCurrentSessionData() };
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
}

module.exports = {
    initializeDeepSeekSession,
    sendToRenderer,
    initializeNewSession,
    saveConversationTurn,
    getCurrentSessionData,
    setupDeepSeekIpcHandlers,
};
