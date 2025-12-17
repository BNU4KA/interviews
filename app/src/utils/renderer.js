const { ipcRenderer } = require('electron');

window.randomDisplayName = null;

ipcRenderer
    .invoke('get-random-display-name')
    .then(name => {
        window.randomDisplayName = name;
        console.log({ randomDisplayName: name });
    })
    .catch(err => {
        console.warn({ error: err.message });
        window.randomDisplayName = 'System Monitor';
    });

let mediaStream = null;
let screenshotInterval = null;
let hiddenVideo = null;
let offscreenCanvas = null;
let offscreenContext = null;
let currentImageQuality = 'medium';

const isLinux = process.platform === 'linux';
const isMacOS = process.platform === 'darwin';

let tokenTracker = {
    tokens: [],

    addTokens(count, type = 'image') {
        const now = Date.now();
        this.tokens.push({
            timestamp: now,
            count: count,
            type: type,
        });
        this.cleanOldTokens();
    },

    calculateImageTokens(width, height) {
        if (width <= 384 && height <= 384) {
            return 258;
        }
        const tilesX = Math.ceil(width / 768);
        const tilesY = Math.ceil(height / 768);
        const totalTiles = tilesX * tilesY;
        return totalTiles * 258;
    },

    cleanOldTokens() {
        const oneMinuteAgo = Date.now() - 60 * 1000;
        this.tokens = this.tokens.filter(token => token.timestamp > oneMinuteAgo);
    },

    getTokensInLastMinute() {
        this.cleanOldTokens();
        return this.tokens.reduce((total, token) => total + token.count, 0);
    },

    shouldThrottle() {
        const throttleEnabled = localStorage.getItem('throttleTokens') === 'true';
        if (!throttleEnabled) {
            return false;
        }
        const maxTokensPerMin = parseInt(localStorage.getItem('maxTokensPerMin') || '1000000', 10);
        const throttleAtPercent = parseInt(localStorage.getItem('throttleAtPercent') || '75', 10);
        const currentTokens = this.getTokensInLastMinute();
        const throttleThreshold = Math.floor((maxTokensPerMin * throttleAtPercent) / 100);
        console.log({ currentTokens, maxTokensPerMin, throttleThreshold });
        return currentTokens >= throttleThreshold;
    },

    reset() {
        this.tokens = [];
    },
};

async function initializeGemini(profile = 'leetcode', language = 'en-US') {
    const model = localStorage.getItem('ollamaModel')?.trim() || 'deepseek-coder:6.7b';
    const success = await ipcRenderer.invoke('initialize-gemini', model, localStorage.getItem('customPrompt') || '', profile, language);
    if (success) {
        cheddar.setStatus('Live');
    } else {
        cheddar.setStatus('error');
    }
}

ipcRenderer.on('update-status', (event, status) => {
    console.log({ status });
    cheddar.setStatus(status);
});

async function startCapture(screenshotIntervalSeconds = 5, imageQuality = 'medium') {
    currentImageQuality = imageQuality;
    tokenTracker.reset();
    console.log({ message: 'Token tracker reset for new capture session' });

    try {
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
            video: {
                frameRate: 1,
                width: { ideal: 1920 },
                height: { ideal: 1080 },
            },
            audio: false,
        });

        console.log({ hasVideo: mediaStream.getVideoTracks().length > 0 });
        console.log({ message: 'Manual mode enabled - screenshots will be captured on demand only' });
    } catch (err) {
        console.error({ error: err.message });
        cheddar.setStatus('error');
    }
}

async function captureScreenshot(imageQuality = 'medium', isManual = false, skipAutoSend = false) {
    console.log({ isManual });
    if (!mediaStream) return;

    if (!isManual && tokenTracker.shouldThrottle()) {
        console.log({ message: 'Automated screenshot skipped due to rate limiting' });
        return;
    }

    if (!hiddenVideo) {
        hiddenVideo = document.createElement('video');
        hiddenVideo.srcObject = mediaStream;
        hiddenVideo.muted = true;
        hiddenVideo.playsInline = true;
        await hiddenVideo.play();

        await new Promise(resolve => {
            if (hiddenVideo.readyState >= 2) return resolve();
            hiddenVideo.onloadedmetadata = () => resolve();
        });

        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = hiddenVideo.videoWidth;
        offscreenCanvas.height = hiddenVideo.videoHeight;
        offscreenContext = offscreenCanvas.getContext('2d');
    }

    if (hiddenVideo.readyState < 2) {
        console.warn({ message: 'Video not ready yet, skipping screenshot' });
        return;
    }

    offscreenContext.drawImage(hiddenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

    const imageData = offscreenContext.getImageData(0, 0, 1, 1);
    const isBlank = imageData.data.every((value, index) => {
        return index === 3 ? true : value === 0;
    });

    if (isBlank) {
        console.warn({ message: 'Screenshot appears to be blank/black' });
    }

    let qualityValue;
    switch (imageQuality) {
        case 'high':
            qualityValue = 0.9;
            break;
        case 'medium':
            qualityValue = 0.7;
            break;
        case 'low':
            qualityValue = 0.5;
            break;
        default:
            qualityValue = 0.7;
    }

    return new Promise((resolve, reject) => {
        offscreenCanvas.toBlob(
            async blob => {
                if (!blob) {
                    console.error({ message: 'Failed to create blob from canvas' });
                    reject(new Error('Failed to create blob'));
                    return;
                }

                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64data = reader.result.split(',')[1];

                    if (!base64data || base64data.length < 100) {
                        console.error({ message: 'Invalid base64 data generated' });
                        reject(new Error('Invalid base64 data'));
                        return;
                    }

                    if (skipAutoSend) {
                        resolve(base64data);
                        return;
                    }

                    const result = await ipcRenderer.invoke('send-image-content', {
                        data: base64data,
                    });

                    if (result.success) {
                        const imageTokens = tokenTracker.calculateImageTokens(offscreenCanvas.width, offscreenCanvas.height);
                        tokenTracker.addTokens(imageTokens, 'image');
                        console.log({ imageTokens, width: offscreenCanvas.width, height: offscreenCanvas.height });
                        resolve(base64data);
                    } else {
                        console.error({ error: result.error });
                        reject(new Error(result.error));
                    }
                };
                reader.readAsDataURL(blob);
            },
            'image/jpeg',
            qualityValue
        );
    });
}

async function captureManualScreenshot(imageQuality = null) {
    console.log({ message: 'Manual screenshot triggered' });
    const quality = imageQuality || currentImageQuality;
    
    try {
        const base64data = await captureScreenshot(quality, true, true);
        
        if (!base64data) {
            console.error({ error: 'Failed to capture screenshot' });
            return;
        }

        const question = `Help me on this page, give me the answer no bs, complete answer.
        So if its a code question, give me the approach in few bullet points, then the entire code. Also if theres anything else i need to know, tell me.
        If its a question about the website, give me the answer no bs, complete answer.
        If its a mcq question, give me the answer no bs, complete answer.`;

        const result = await ipcRenderer.invoke('send-image-content', {
            data: base64data,
            question: question,
        });

        if (result.success) {
            const imageTokens = tokenTracker.calculateImageTokens(offscreenCanvas.width, offscreenCanvas.height);
            tokenTracker.addTokens(imageTokens, 'image');
            console.log({ imageTokens, width: offscreenCanvas.width, height: offscreenCanvas.height });
        } else {
            console.error({ error: result.error });
        }
    } catch (error) {
        console.error({ error: error.message });
    }
}

window.captureManualScreenshot = captureManualScreenshot;

function stopCapture() {
    if (screenshotInterval) {
        clearInterval(screenshotInterval);
        screenshotInterval = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    if (hiddenVideo) {
        hiddenVideo.pause();
        hiddenVideo.srcObject = null;
        hiddenVideo = null;
    }
    offscreenCanvas = null;
    offscreenContext = null;
}

async function sendTextMessage(text) {
    if (!text || text.trim().length === 0) {
        console.warn({ message: 'Cannot send empty text message' });
        return { success: false, error: 'Empty message' };
    }

    try {
        const result = await ipcRenderer.invoke('send-text-message', text);
        if (result.success) {
            console.log({ message: 'Text message sent successfully' });
        } else {
            console.error({ error: result.error });
        }
        return result;
    } catch (error) {
        console.error({ error: error.message });
        return { success: false, error: error.message };
    }
}

async function sendImageMessage(imageBase64, question = '') {
    if (!imageBase64 || typeof imageBase64 !== 'string') {
        console.warn({ message: 'Cannot send empty image' });
        return { success: false, error: 'Empty image' };
    }

    try {
        const base64data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        const result = await ipcRenderer.invoke('send-image-content', {
            data: base64data,
            question: question,
        });
        if (result.success) {
            console.log({ message: 'Image message sent successfully' });
        } else {
            console.error({ error: result.error });
        }
        return result;
    } catch (error) {
        console.error({ error: error.message });
        return { success: false, error: error.message };
    }
}

let conversationDB = null;

async function initConversationStorage() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('ConversationHistory', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            conversationDB = request.result;
            resolve(conversationDB);
        };

        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('sessions')) {
                const sessionStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
                sessionStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
        };
    });
}

async function saveConversationSession(sessionId, conversationHistory) {
    if (!conversationDB) {
        await initConversationStorage();
    }

    const transaction = conversationDB.transaction(['sessions'], 'readwrite');
    const store = transaction.objectStore('sessions');

    const sessionData = {
        sessionId: sessionId,
        timestamp: parseInt(sessionId),
        conversationHistory: conversationHistory,
        lastUpdated: Date.now(),
    };

    return new Promise((resolve, reject) => {
        const request = store.put(sessionData);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getConversationSession(sessionId) {
    if (!conversationDB) {
        await initConversationStorage();
    }

    const transaction = conversationDB.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');

    return new Promise((resolve, reject) => {
        const request = store.get(sessionId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
    });
}

async function getAllConversationSessions() {
    if (!conversationDB) {
        await initConversationStorage();
    }

    const transaction = conversationDB.transaction(['sessions'], 'readonly');
    const store = transaction.objectStore('sessions');
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
        const request = index.getAll();
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            const sessions = request.result.sort((a, b) => b.timestamp - a.timestamp);
            resolve(sessions);
        };
    });
}

ipcRenderer.on('save-conversation-turn', async (event, data) => {
    try {
        await saveConversationSession(data.sessionId, data.fullHistory);
        console.log({ sessionId: data.sessionId });
    } catch (error) {
        console.error({ error: error.message });
    }
});

initConversationStorage().catch(console.error);

ipcRenderer.on('clear-sensitive-data', () => {
    console.log({ message: 'Clearing renderer-side sensitive data...' });
    localStorage.removeItem('apiKey');
    localStorage.removeItem('customPrompt');
});

function handleShortcut(shortcutKey) {
    const currentView = cheddar.getCurrentView();

    if (shortcutKey === 'ctrl+enter' || shortcutKey === 'cmd+enter') {
        if (currentView === 'main') {
            cheddar.element().handleStart();
        } else {
            captureManualScreenshot();
        }
    }
}

const app = document.querySelector('app');

const cheddar = {
    element: () => app,
    e: () => app,

    getCurrentView: () => app.currentView,
    getLayoutMode: () => app.layoutMode,

    setStatus: text => app.setStatus(text),
    setResponse: response => app.setResponse(response),

    initializeGemini,
    startCapture,
    stopCapture,
    sendTextMessage,
    sendImageMessage,
    handleShortcut,

    getAllConversationSessions,
    getConversationSession,
    initConversationStorage,

    getContentProtection: () => {
        const contentProtection = localStorage.getItem('contentProtection');
        return contentProtection !== null ? contentProtection === 'true' : true;
    },

    isLinux: isLinux,
    isMacOS: isMacOS,
};

window.cheddar = cheddar;
