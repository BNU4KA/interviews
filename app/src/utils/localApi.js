const { BrowserWindow, ipcMain } = require('electron');
const http = require('http');

let currentSessionId = null;
let conversationHistory = [];
let screenAnalysisHistory = [];

function sendToRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
        windows[0].webContents.send(channel, data);
    }
}

function initializeNewSession(profile = null, customPrompt = null) {
    currentSessionId = Date.now().toString();
    conversationHistory = [];
    screenAnalysisHistory = [];
    console.log({ message: 'New conversation session started', sessionId: currentSessionId, profile });
}

function saveConversationTurn(transcription, aiResponse) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const conversationTurn = {
        timestamp: Date.now(),
        transcription: transcription.trim(),
        ai_response: aiResponse.trim(),
    };

    conversationHistory.push(conversationTurn);
    console.log({ message: 'Saved conversation turn', conversationTurn });

    sendToRenderer('save-conversation-turn', {
        sessionId: currentSessionId,
        turn: conversationTurn,
        fullHistory: conversationHistory,
    });
}

function saveScreenAnalysis(prompt, response) {
    if (!currentSessionId) {
        initializeNewSession();
    }

    const analysisEntry = {
        timestamp: Date.now(),
        prompt: prompt,
        response: response.trim(),
    };

    screenAnalysisHistory.push(analysisEntry);
    console.log({ message: 'Saved screen analysis', analysisEntry });

    sendToRenderer('save-screen-analysis', {
        sessionId: currentSessionId,
        analysis: analysisEntry,
        fullHistory: screenAnalysisHistory,
    });
}

function callLocalApi(endpoint, data) {
    return new Promise((resolve, reject) => {
        const isGet = endpoint === '/api/models';
        const postData = isGet ? null : JSON.stringify(data);

        console.log({
            callLocalApi: {
                endpoint,
                method: isGet ? 'GET' : 'POST',
                dataKeys: data ? Object.keys(data) : null,
                postDataLength: postData ? postData.length : 0,
            },
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: endpoint,
            method: isGet ? 'GET' : 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (postData) {
            options.headers['Content-Length'] = Buffer.byteLength(postData);
        }

        const req = http.request(options, res => {
            let responseData = '';

            res.on('data', chunk => {
                responseData += chunk;
            });

            res.on('end', () => {
                console.log({
                    apiResponse: {
                        endpoint,
                        statusCode: res.statusCode,
                        responseLength: responseData.length,
                        responsePreview: responseData.substring(0, 300),
                    },
                });

                if (res.statusCode >= 200 && res.statusCode < 300) {
                    if (!responseData || responseData.trim().length === 0) {
                        console.log({ warning: 'Empty response from server', endpoint });
                        resolve({ success: true, response: '' });
                        return;
                    }

                    try {
                        const parsed = JSON.parse(responseData);
                        resolve(parsed);
                    } catch (parseError) {
                        console.log({
                            parseError: {
                                message: parseError.message,
                                endpoint,
                                responseLength: responseData.length,
                                responsePreview: responseData.substring(0, 500),
                            },
                        });
                        reject(new Error(`Failed to parse response: ${parseError.message}`));
                    }
                } else {
                    let errorMessage = responseData;
                    try {
                        if (responseData && responseData.trim().length > 0) {
                            const errorObj = JSON.parse(responseData);
                            errorMessage = errorObj.error || errorObj.message || responseData;
                        }
                    } catch (e) {}
                    reject(new Error(`API error: ${res.statusCode} - ${errorMessage}`));
                }
            });
        });

        req.on('error', error => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        if (postData) {
            req.write(postData);
        }

        req.end();
    });
}

async function initializeSession(profile = 'leetcode', customPrompt = '', language = 'ru-RU', programmingLanguage = '', responseLanguage = '') {
    try {
        initializeNewSession(profile, customPrompt);

        let enhancedCustomPrompt = customPrompt;
        const additionalInfo = [];
        if (programmingLanguage) {
            additionalInfo.push(`Programming language: ${programmingLanguage}`);
        }
        if (responseLanguage) {
            additionalInfo.push(`Response language: ${responseLanguage}`);
        }

        if (additionalInfo.length > 0) {
            const additionalSection = '\n\n**Additional Settings:**\n' + additionalInfo.join('\n');
            enhancedCustomPrompt = enhancedCustomPrompt ? customPrompt + additionalSection : additionalSection.trim();
        }

        const result = await callLocalApi('/api/initialize', {
            profile,
            customPrompt: enhancedCustomPrompt,
            language,
            responseLanguage,
        });
        sendToRenderer('update-status', 'Live');
        return { success: true, sessionId: currentSessionId };
    } catch (error) {
        console.error({ error: error.message });
        sendToRenderer('update-status', 'error');
        return { success: false, error: error.message };
    }
}

async function sendTextMessage(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return { success: false, error: 'Invalid text message' };
    }

    try {
        console.log({ sendingTextMessage: { textLength: text.trim().length, textPreview: text.trim().substring(0, 100) } });
        const result = await callLocalApi('/api/message', {
            text: text.trim(),
        });
        console.log({
            receivedTextResponse: { success: result?.success, hasResponse: !!result?.response, responseLength: result?.response?.length },
        });

        if (result && result.success) {
            const responseText = result.response || result.text || '';
            if (responseText) {
                sendToRenderer('new-response', responseText);
                saveConversationTurn(text.trim(), responseText);
            }
            return { success: true, response: responseText };
        }

        return { success: false, error: result?.error || 'Unknown error' };
    } catch (error) {
        console.error({ error: error.message });
        return { success: false, error: error.message };
    }
}

async function sendImageMessage(imageBase64, question = '') {
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        return { success: false, error: 'Invalid image data' };
    }

    let imageData = imageBase64;
    if (!imageData.startsWith('data:image/')) {
        imageData = `data:image/jpeg;base64,${imageBase64}`;
    }

    try {
        console.log({ sendingImageMessage: { imageDataLength: imageData.length, hasQuestion: !!question } });
        const result = await callLocalApi('/api/image', {
            imageData: imageData,
            question: question || '',
        });
        console.log({ receivedImageResponse: { success: result?.success, hasResponse: !!result?.response } });

        if (result.success && result.response) {
            let fullText = '';
            if (typeof result.response === 'string') {
                fullText = result.response;
            } else if (result.response.text) {
                fullText = result.response.text;
            }

            if (fullText) {
                sendToRenderer('new-response', fullText);
                saveScreenAnalysis(question || '', fullText);
            }
        }

        return { success: true, text: result.response };
    } catch (error) {
        console.error({ error: error.message });
        return { success: false, error: error.message };
    }
}

async function getAvailableModels() {
    try {
        const result = await callLocalApi('/api/models');
        return { success: true, models: result.models || [] };
    } catch (error) {
        console.error({ error: error.message });
        return { success: false, error: error.message, models: [] };
    }
}

function setupLocalApiIpcHandlers() {
    ipcMain.handle(
        'initialize-session',
        async (event, model, customPrompt, profile = 'leetcode', language = 'ru-RU', programmingLanguage = '', responseLanguage = '') => {
            const result = await initializeSession(profile, customPrompt, language, programmingLanguage, responseLanguage);
            return result.success;
        }
    );

    ipcMain.handle('send-text-message', async (event, text) => {
        return await sendTextMessage(text);
    });

    ipcMain.handle('send-image-content', async (event, { data, question }) => {
        if (!data || typeof data !== 'string') {
            return { success: false, error: 'Invalid image data' };
        }

        const buffer = Buffer.from(data, 'base64');
        if (buffer.length < 1000) {
            return { success: false, error: 'Image buffer too small' };
        }

        return await sendImageMessage(data, question || '');
    });

    ipcMain.handle('get-available-models', async event => {
        return await getAvailableModels();
    });

    ipcMain.handle('close-session', async event => {
        currentSessionId = null;
        conversationHistory = [];
        screenAnalysisHistory = [];
        sendToRenderer('update-status', 'Session closed');
        return { success: true };
    });

    ipcMain.handle('get-current-session', async event => {
        return {
            success: true,
            data: {
                sessionId: currentSessionId,
                history: conversationHistory,
            },
        };
    });

    ipcMain.handle('start-new-session', async event => {
        initializeNewSession();
        return { success: true, sessionId: currentSessionId };
    });
}

module.exports = {
    initializeSession,
    sendTextMessage,
    sendImageMessage,
    getAvailableModels,
    setupLocalApiIpcHandlers,
    sendToRenderer,
};
