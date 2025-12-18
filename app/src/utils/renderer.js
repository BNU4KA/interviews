// renderer.js
const { ipcRenderer } = require('electron');

let mediaStream = null;
let hiddenVideo = null;
let offscreenCanvas = null;
let offscreenContext = null;
let currentImageQuality = 'medium';

const isLinux = process.platform === 'linux';
const isMacOS = process.platform === 'darwin';

// ============ STORAGE API ============
// Wrapper for IPC-based storage access
const storage = {
    // Config
    async getConfig() {
        const result = await ipcRenderer.invoke('storage:get-config');
        return result.success ? result.data : {};
    },
    async setConfig(config) {
        return ipcRenderer.invoke('storage:set-config', config);
    },
    async updateConfig(key, value) {
        return ipcRenderer.invoke('storage:update-config', key, value);
    },

    // Credentials
    async getCredentials() {
        const result = await ipcRenderer.invoke('storage:get-credentials');
        return result.success ? result.data : {};
    },
    async setCredentials(credentials) {
        return ipcRenderer.invoke('storage:set-credentials', credentials);
    },
    async getApiKey() {
        const result = await ipcRenderer.invoke('storage:get-api-key');
        return result.success ? result.data : '';
    },
    async setApiKey(apiKey) {
        return ipcRenderer.invoke('storage:set-api-key', apiKey);
    },

    // Preferences
    async getPreferences() {
        const result = await ipcRenderer.invoke('storage:get-preferences');
        return result.success ? result.data : {};
    },
    async setPreferences(preferences) {
        return ipcRenderer.invoke('storage:set-preferences', preferences);
    },
    async updatePreference(key, value) {
        return ipcRenderer.invoke('storage:update-preference', key, value);
    },

    // Keybinds
    async getKeybinds() {
        const result = await ipcRenderer.invoke('storage:get-keybinds');
        return result.success ? result.data : null;
    },
    async setKeybinds(keybinds) {
        return ipcRenderer.invoke('storage:set-keybinds', keybinds);
    },

    // Sessions (History)
    async getAllSessions() {
        const result = await ipcRenderer.invoke('storage:get-all-sessions');
        return result.success ? result.data : [];
    },
    async getSession(sessionId) {
        const result = await ipcRenderer.invoke('storage:get-session', sessionId);
        return result.success ? result.data : null;
    },
    async saveSession(sessionId, data) {
        return ipcRenderer.invoke('storage:save-session', sessionId, data);
    },
    async deleteSession(sessionId) {
        return ipcRenderer.invoke('storage:delete-session', sessionId);
    },
    async deleteAllSessions() {
        return ipcRenderer.invoke('storage:delete-all-sessions');
    },

    // Clear all
    async clearAll() {
        return ipcRenderer.invoke('storage:clear-all');
    },

    // Limits
    async getTodayLimits() {
        const result = await ipcRenderer.invoke('storage:get-today-limits');
        return result.success ? result.data : { flash: { count: 0 }, flashLite: { count: 0 } };
    },
};

// Cache for preferences to avoid async calls in hot paths
let preferencesCache = null;

async function loadPreferencesCache() {
    preferencesCache = await storage.getPreferences();
    return preferencesCache;
}

// Initialize preferences cache
loadPreferencesCache();

function getProgrammingLanguageName(value) {
    const languages = {
        javascript: 'JavaScript',
        typescript: 'TypeScript',
        python: 'Python',
        java: 'Java',
        cpp: 'C++',
        c: 'C',
        csharp: 'C#',
        go: 'Go',
        rust: 'Rust',
        php: 'PHP',
        ruby: 'Ruby',
        swift: 'Swift',
        kotlin: 'Kotlin',
        scala: 'Scala',
        r: 'R',
        sql: 'SQL',
    };
    return languages[value] || value;
}

function getLanguageName(value) {
    const languages = {
        'en-US': 'English',
        'de-DE': 'German',
        'es-ES': 'Spanish',
        'fr-FR': 'French',
        'hi-IN': 'Hindi',
        'pt-BR': 'Portuguese',
        'ar-XA': 'Arabic',
        'id-ID': 'Indonesian',
        'it-IT': 'Italian',
        'ja-JP': 'Japanese',
        'tr-TR': 'Turkish',
        'vi-VN': 'Vietnamese',
        'nl-NL': 'Dutch',
        'ko-KR': 'Korean',
        'cmn-CN': 'Mandarin Chinese',
        'pl-PL': 'Polish',
        'ru-RU': 'Russian',
        'th-TH': 'Thai',
    };
    return languages[value] || value;
}

async function initializeSession(profile = 'leetcode', language = 'ru-RU') {
    const prefs = await storage.getPreferences();
    const programmingLanguageValue = prefs.selectedProgrammingLanguage || '';
    const programmingLanguage = programmingLanguageValue ? getProgrammingLanguageName(programmingLanguageValue) : '';
    const responseLanguageValue = prefs.selectedLanguage || language;
    const responseLanguage = getLanguageName(responseLanguageValue);
    const success = await ipcRenderer.invoke(
        'initialize-session',
        null,
        prefs.customPrompt || '',
        profile,
        language,
        programmingLanguage,
        responseLanguage
    );
    if (success && window.interviewApp) {
        window.interviewApp.setStatus('Live');
    } else if (window.interviewApp) {
        window.interviewApp.setStatus('error');
    }
}

ipcRenderer.on('update-status', (event, status) => {
    console.log('Status update:', status);
    if (window.interviewApp) {
        window.interviewApp.setStatus(status);
    }
});

async function startCapture(screenshotIntervalSeconds = 5, imageQuality = 'medium') {
    currentImageQuality = imageQuality;

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
        if (window.interviewApp) {
            window.interviewApp.setStatus('error');
        }
    }
}

async function captureScreenshot(imageQuality = 'medium', isManual = false) {
    console.log(`Capturing ${isManual ? 'manual' : 'automated'} screenshot...`);
    if (!mediaStream) return;

    // Lazy init of video element
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

        // Lazy init of canvas based on video dimensions
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = hiddenVideo.videoWidth;
        offscreenCanvas.height = hiddenVideo.videoHeight;
        offscreenContext = offscreenCanvas.getContext('2d');
    }

    // Check if video is ready
    if (hiddenVideo.readyState < 2) {
        console.warn('Video not ready yet, skipping screenshot');
        return;
    }

    offscreenContext.drawImage(hiddenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

    // Check if image was drawn properly by sampling a pixel
    const imageData = offscreenContext.getImageData(0, 0, 1, 1);
    const isBlank = imageData.data.every((value, index) => {
        // Check if all pixels are black (0,0,0) or transparent
        return index === 3 ? true : value === 0;
    });

    if (isBlank) {
        console.warn('Screenshot appears to be blank/black');
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
            qualityValue = 0.7; // Default to medium
    }

    offscreenCanvas.toBlob(
        async blob => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];

                // Validate base64 data
                if (!base64data || base64data.length < 100) {
                    console.error('Invalid base64 data generated');
                    return;
                }

                const result = await ipcRenderer.invoke('send-image-content', {
                    data: base64data,
                });

                if (result.success) {
                    console.log(`Image sent successfully (${offscreenCanvas.width}x${offscreenCanvas.height})`);
                } else {
                    console.error('Failed to send image:', result.error);
                }
            };
            reader.readAsDataURL(blob);
        },
        'image/jpeg',
        qualityValue
    );
}

const MANUAL_SCREENSHOT_PROMPT = `Help me on this page, give me the answer no bs, complete answer.
So if its a code question, give me the approach in few bullet points, then the entire code. Also if theres anything else i need to know, tell me.
If its a question about the website, give me the answer no bs, complete answer.
If its a mcq question, give me the answer no bs, complete answer.`;

async function captureManualScreenshot(imageQuality = null) {
    console.log('Manual screenshot triggered');
    const quality = imageQuality || currentImageQuality;

    if (!mediaStream) {
        console.error('No media stream available');
        return;
    }

    // Lazy init of video element
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

        // Lazy init of canvas based on video dimensions
        offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = hiddenVideo.videoWidth;
        offscreenCanvas.height = hiddenVideo.videoHeight;
        offscreenContext = offscreenCanvas.getContext('2d');
    }

    // Check if video is ready
    if (hiddenVideo.readyState < 2) {
        console.warn('Video not ready yet, skipping screenshot');
        return;
    }

    offscreenContext.drawImage(hiddenVideo, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

    let qualityValue;
    switch (quality) {
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

    offscreenCanvas.toBlob(
        async blob => {
            if (!blob) {
                console.error('Failed to create blob from canvas');
                return;
            }

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64data = reader.result.split(',')[1];

                if (!base64data || base64data.length < 100) {
                    console.error('Invalid base64 data generated');
                    return;
                }

                // Send image with prompt to HTTP API (response streams via IPC events)
                const result = await ipcRenderer.invoke('send-image-content', {
                    data: base64data,
                    prompt: MANUAL_SCREENSHOT_PROMPT,
                });

                if (result.success) {
                    console.log(`Image response completed from ${result.model}`);
                    // Response already displayed via streaming events (new-response/update-response)
                } else {
                    console.error('Failed to get image response:', result.error);
                    if (window.interviewApp) {
                        window.interviewApp.addNewResponse(`Error: ${result.error}`);
                    }
                }
            };
            reader.readAsDataURL(blob);
        },
        'image/jpeg',
        qualityValue
    );
}

// Expose functions to global scope for external access
window.captureManualScreenshot = captureManualScreenshot;

function stopCapture() {
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
        if (result.success && result.response) {
            if (window.interviewApp) {
                window.interviewApp.addNewResponse(result.response);
            }
        } else if (!result.success) {
            console.error({ error: result.error });
        }
        return result;
    } catch (error) {
        console.error({ error: error.message });
        return { success: false, error: error.message };
    }
}

function handleShortcut(shortcutKey) {
    try {
        const currentView = window.interviewApp?.getCurrentView?.() || 'main';
        console.log({ handleShortcut: { shortcutKey, currentView } });

        if (currentView === 'main') {
            const element = document.querySelector('interview-app');
            if (element && element.handleStart) {
                element.handleStart();
            }
        } else if (currentView === 'assistant') {
            if (window.captureManualScreenshot) {
                window.captureManualScreenshot();
            }
        }
    } catch (error) {
        console.error({ error: 'Error handling shortcut', message: error.message, stack: error.stack });
    }
}

// Listen for conversation data from main process and save to storage
ipcRenderer.on('save-conversation-turn', async (event, data) => {
    try {
        await storage.saveSession(data.sessionId, { conversationHistory: data.fullHistory });
        console.log('Conversation session saved:', data.sessionId);
    } catch (error) {
        console.error('Error saving conversation session:', error);
    }
});

// Listen for session context (profile info) when session starts
ipcRenderer.on('save-session-context', async (event, data) => {
    try {
        await storage.saveSession(data.sessionId, {
            profile: data.profile,
            customPrompt: data.customPrompt,
        });
        console.log('Session context saved:', data.sessionId, 'profile:', data.profile);
    } catch (error) {
        console.error('Error saving session context:', error);
    }
});

// Listen for screen analysis responses (from ctrl+enter)
ipcRenderer.on('save-screen-analysis', async (event, data) => {
    try {
        await storage.saveSession(data.sessionId, {
            screenAnalysisHistory: data.fullHistory,
            profile: data.profile,
            customPrompt: data.customPrompt,
        });
        console.log('Screen analysis saved:', data.sessionId);
    } catch (error) {
        console.error('Error saving screen analysis:', error);
    }
});

// Listen for emergency erase command from main process
ipcRenderer.on('clear-sensitive-data', async () => {
    console.log('Clearing all data...');
    await storage.clearAll();
});

// Create reference to the main app element
const interviewAppElement = document.querySelector('interview-app');

// ============ THEME SYSTEM ============
const theme = {
    themes: {
        dark: {
            background: '#1e1e1e',
            text: '#e0e0e0',
            textSecondary: '#a0a0a0',
            textMuted: '#6b6b6b',
            border: '#333333',
            accent: '#ffffff',
            btnPrimaryBg: '#ffffff',
            btnPrimaryText: '#000000',
            btnPrimaryHover: '#e0e0e0',
            tooltipBg: '#1a1a1a',
            tooltipText: '#ffffff',
            keyBg: 'rgba(255,255,255,0.1)',
        },
        light: {
            background: '#ffffff',
            text: '#1a1a1a',
            textSecondary: '#555555',
            textMuted: '#888888',
            border: '#e0e0e0',
            accent: '#000000',
            btnPrimaryBg: '#1a1a1a',
            btnPrimaryText: '#ffffff',
            btnPrimaryHover: '#333333',
            tooltipBg: '#1a1a1a',
            tooltipText: '#ffffff',
            keyBg: 'rgba(0,0,0,0.1)',
        },
        midnight: {
            background: '#0d1117',
            text: '#c9d1d9',
            textSecondary: '#8b949e',
            textMuted: '#6e7681',
            border: '#30363d',
            accent: '#58a6ff',
            btnPrimaryBg: '#58a6ff',
            btnPrimaryText: '#0d1117',
            btnPrimaryHover: '#79b8ff',
            tooltipBg: '#161b22',
            tooltipText: '#c9d1d9',
            keyBg: 'rgba(88,166,255,0.15)',
        },
        sepia: {
            background: '#f4ecd8',
            text: '#5c4b37',
            textSecondary: '#7a6a56',
            textMuted: '#998875',
            border: '#d4c8b0',
            accent: '#8b4513',
            btnPrimaryBg: '#5c4b37',
            btnPrimaryText: '#f4ecd8',
            btnPrimaryHover: '#7a6a56',
            tooltipBg: '#5c4b37',
            tooltipText: '#f4ecd8',
            keyBg: 'rgba(92,75,55,0.15)',
        },
        nord: {
            background: '#2e3440',
            text: '#eceff4',
            textSecondary: '#d8dee9',
            textMuted: '#4c566a',
            border: '#3b4252',
            accent: '#88c0d0',
            btnPrimaryBg: '#88c0d0',
            btnPrimaryText: '#2e3440',
            btnPrimaryHover: '#8fbcbb',
            tooltipBg: '#3b4252',
            tooltipText: '#eceff4',
            keyBg: 'rgba(136,192,208,0.15)',
        },
        dracula: {
            background: '#282a36',
            text: '#f8f8f2',
            textSecondary: '#bd93f9',
            textMuted: '#6272a4',
            border: '#44475a',
            accent: '#ff79c6',
            btnPrimaryBg: '#ff79c6',
            btnPrimaryText: '#282a36',
            btnPrimaryHover: '#ff92d0',
            tooltipBg: '#44475a',
            tooltipText: '#f8f8f2',
            keyBg: 'rgba(255,121,198,0.15)',
        },
        abyss: {
            background: '#0a0a0a',
            text: '#d4d4d4',
            textSecondary: '#808080',
            textMuted: '#505050',
            border: '#1a1a1a',
            accent: '#ffffff',
            btnPrimaryBg: '#ffffff',
            btnPrimaryText: '#0a0a0a',
            btnPrimaryHover: '#d4d4d4',
            tooltipBg: '#141414',
            tooltipText: '#d4d4d4',
            keyBg: 'rgba(255,255,255,0.08)',
        },
    },

    current: 'dark',

    get(name) {
        return this.themes[name] || this.themes.dark;
    },

    getAll() {
        const names = {
            dark: 'Dark',
            light: 'Light',
            midnight: 'Midnight Blue',
            sepia: 'Sepia',
            nord: 'Nord',
            dracula: 'Dracula',
            abyss: 'Abyss',
        };
        return Object.keys(this.themes).map(key => ({
            value: key,
            name: names[key] || key,
            colors: this.themes[key],
        }));
    },

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : { r: 30, g: 30, b: 30 };
    },

    lightenColor(rgb, amount) {
        return {
            r: Math.min(255, rgb.r + amount),
            g: Math.min(255, rgb.g + amount),
            b: Math.min(255, rgb.b + amount),
        };
    },

    darkenColor(rgb, amount) {
        return {
            r: Math.max(0, rgb.r - amount),
            g: Math.max(0, rgb.g - amount),
            b: Math.max(0, rgb.b - amount),
        };
    },

    applyBackgrounds(backgroundColor, alpha = 0.8) {
        const root = document.documentElement;
        const baseRgb = this.hexToRgb(backgroundColor);

        // For light themes, darken; for dark themes, lighten
        const isLight = (baseRgb.r + baseRgb.g + baseRgb.b) / 3 > 128;
        const adjust = isLight ? this.darkenColor.bind(this) : this.lightenColor.bind(this);

        const secondary = adjust(baseRgb, 7);
        const tertiary = adjust(baseRgb, 15);
        const hover = adjust(baseRgb, 20);

        root.style.setProperty('--header-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--main-content-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-primary', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
        root.style.setProperty('--bg-secondary', `rgba(${secondary.r}, ${secondary.g}, ${secondary.b}, ${alpha})`);
        root.style.setProperty('--bg-tertiary', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--bg-hover', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--input-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--input-focus-background', `rgba(${tertiary.r}, ${tertiary.g}, ${tertiary.b}, ${alpha})`);
        root.style.setProperty('--hover-background', `rgba(${hover.r}, ${hover.g}, ${hover.b}, ${alpha})`);
        root.style.setProperty('--scrollbar-background', `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${alpha})`);
    },

    apply(themeName, alpha = 0.8) {
        const colors = this.get(themeName);
        this.current = themeName;
        const root = document.documentElement;

        // Text colors
        root.style.setProperty('--text-color', colors.text);
        root.style.setProperty('--text-secondary', colors.textSecondary);
        root.style.setProperty('--text-muted', colors.textMuted);
        // Border colors
        root.style.setProperty('--border-color', colors.border);
        root.style.setProperty('--border-default', colors.accent);
        // Misc
        root.style.setProperty('--placeholder-color', colors.textMuted);
        root.style.setProperty('--scrollbar-thumb', colors.border);
        root.style.setProperty('--scrollbar-thumb-hover', colors.textMuted);
        root.style.setProperty('--key-background', colors.keyBg);
        // Primary button
        root.style.setProperty('--btn-primary-bg', colors.btnPrimaryBg);
        root.style.setProperty('--btn-primary-text', colors.btnPrimaryText);
        root.style.setProperty('--btn-primary-hover', colors.btnPrimaryHover);
        // Start button (same as primary)
        root.style.setProperty('--start-button-background', colors.btnPrimaryBg);
        root.style.setProperty('--start-button-color', colors.btnPrimaryText);
        root.style.setProperty('--start-button-hover-background', colors.btnPrimaryHover);
        // Tooltip
        root.style.setProperty('--tooltip-bg', colors.tooltipBg);
        root.style.setProperty('--tooltip-text', colors.tooltipText);
        // Error color (stays constant)
        root.style.setProperty('--error-color', '#f14c4c');
        root.style.setProperty('--success-color', '#4caf50');

        // Also apply background colors from theme
        this.applyBackgrounds(colors.background, alpha);
    },

    async load() {
        try {
            const prefs = await storage.getPreferences();
            const themeName = prefs.theme || 'dark';
            const alpha = prefs.backgroundTransparency ?? 0.8;
            this.apply(themeName, alpha);
            return themeName;
        } catch (err) {
            this.apply('dark');
            return 'dark';
        }
    },

    async save(themeName) {
        await storage.updatePreference('theme', themeName);
        this.apply(themeName);
    },
};

const interviewAppObj = {
    getVersion: async () => ipcRenderer.invoke('get-app-version'),

    element: () => {
        try {
            return document.querySelector('interview-app') || interviewAppElement;
        } catch (err) {
            return interviewAppElement;
        }
    },
    e: () => {
        try {
            return document.querySelector('interview-app') || interviewAppElement;
        } catch (err) {
            return interviewAppElement;
        }
    },

    getCurrentView: () => {
        try {
            const element = document.querySelector('interview-app');
            if (element && element.currentView) {
                return element.currentView;
            }
            return 'main';
        } catch (err) {
            console.log({ error: 'Failed to get current view', message: err.message });
            return 'main';
        }
    },
    getLayoutMode: () => {
        try {
            const element = document.querySelector('interview-app');
            if (element && element.layoutMode) {
                return element.layoutMode;
            }
            return 'normal';
        } catch (err) {
            console.log({ error: 'Failed to get layout mode', message: err.message });
            return 'normal';
        }
    },

    setStatus: text => {
        try {
            const element = document.querySelector('interview-app');
            if (element && element.setStatus) {
                element.setStatus(text);
            }
        } catch (err) {
            console.log({ error: 'Failed to set status', message: err.message });
        }
    },
    addNewResponse: response => {
        try {
            const element = document.querySelector('interview-app');
            if (element && element.addNewResponse) {
                element.addNewResponse(response);
            }
        } catch (err) {
            console.log({ error: 'Failed to add new response', message: err.message });
        }
    },
    updateCurrentResponse: response => {
        try {
            const element = document.querySelector('interview-app');
            if (element && element.updateCurrentResponse) {
                element.updateCurrentResponse(response);
            }
        } catch (err) {
            console.log({ error: 'Failed to update current response', message: err.message });
        }
    },

    initializeSession,
    startCapture,
    stopCapture,
    sendTextMessage,
    handleShortcut,

    storage,

    theme,

    refreshPreferencesCache: loadPreferencesCache,

    isLinux: isLinux,
    isMacOS: isMacOS,
};

window.interviewApp = interviewAppObj;
window.cheatingDaddy = interviewAppObj;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => theme.load());
} else {
    theme.load();
}
