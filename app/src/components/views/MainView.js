import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class MainView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
            user-select: none;
        }

        .welcome {
            font-size: 20px;
            margin-bottom: 6px;
            font-weight: 500;
            color: var(--text-color);
            margin-top: auto;
        }

        .profile-info {
            margin-bottom: 20px;
        }

        .profile-row {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
            font-size: 13px;
        }

        .profile-label {
            color: var(--text-secondary);
            min-width: 140px;
            font-weight: 500;
        }

        .profile-value {
            color: var(--text-color);
            flex: 1;
        }

        .profile-prompt {
            margin-top: 16px;
            padding: 12px;
            background: var(--input-background);
            border: 1px solid var(--border-color);
            border-radius: 3px;
            font-size: 13px;
            color: var(--text-color);
            line-height: 1.5;
            max-height: 150px;
            overflow-y: auto;
        }

        .profile-prompt-empty {
            color: var(--text-muted);
            font-style: italic;
        }

        .start-button {
            background: var(--start-button-background);
            color: var(--start-button-color);
            border: none;
            padding: 10px 16px;
            border-radius: 3px;
            font-size: 13px;
            font-weight: 500;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: background 0.1s ease;
            width: 100%;
            justify-content: center;
            margin-bottom: 12px;
            cursor: pointer;
        }

        .start-button:hover {
            background: var(--start-button-hover-background);
        }

        .start-button.initializing {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .start-button.initializing:hover {
            background: var(--start-button-background);
        }

        .shortcut-hint {
            font-size: 11px;
            color: var(--text-muted);
            font-family: 'SF Mono', Monaco, monospace;
        }

        .description {
            color: var(--text-secondary);
            font-size: 13px;
            margin-bottom: 20px;
            line-height: 1.5;
        }

        .link {
            color: var(--text-color);
            text-decoration: underline;
            cursor: pointer;
            text-underline-offset: 2px;
        }

        .link:hover {
            color: var(--text-color);
        }

        :host {
            height: 100%;
            display: flex;
            flex-direction: column;
            width: 100%;
            max-width: 480px;
        }
    `;

    static properties = {
        onStart: { type: Function },
        onAPIKeyHelp: { type: Function },
        isInitializing: { type: Boolean },
        onLayoutModeChange: { type: Function },
        showApiKeyError: { type: Boolean },
    };

    constructor() {
        super();
        this.isInitializing = false;
        this.showApiKeyError = false;
        this.boundKeydownHandler = this.handleKeydown.bind(this);
        this.boundViewShownHandler = this.handleViewShown.bind(this);
        this.boundHandleStartClick = this.handleStartClick.bind(this);
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'ru-RU';
        this.selectedProgrammingLanguage = 'javascript';
        this.customPrompt = '';
        this._lastLoadTime = 0;
        this._loadPreferences();
    }

    async _loadPreferences() {
        try {
            if (!window.interviewApp || !window.interviewApp.storage) {
                console.error({ error: 'interviewApp.storage is not available in MainView' });
                return;
            }

            const prefs = await window.interviewApp.storage.getPreferences();
            console.log({ mainViewLoadedPreferences: prefs, timestamp: Date.now() });
            const oldLanguage = this.selectedLanguage;
            const oldProgrammingLanguage = this.selectedProgrammingLanguage;
            const oldProfile = this.selectedProfile;

            this.selectedProfile = prefs.selectedProfile || 'interview';
            this.selectedLanguage = prefs.selectedLanguage || 'ru-RU';
            this.selectedProgrammingLanguage = prefs.selectedProgrammingLanguage || 'javascript';
            this.customPrompt = prefs.customPrompt || '';

            console.log({
                mainViewUpdated: {
                    profile: { from: oldProfile, to: this.selectedProfile },
                    language: { from: oldLanguage, to: this.selectedLanguage },
                    programmingLanguage: { from: oldProgrammingLanguage, to: this.selectedProgrammingLanguage },
                },
            });

            this._lastLoadTime = Date.now();
            this.requestUpdate();
        } catch (error) {
            console.error({ error: 'Error loading preferences in MainView', message: error.message, stack: error.stack });
        }
    }

    async handleViewShown() {
        await this._loadPreferences();
    }

    connectedCallback() {
        super.connectedCallback();
        window.electron?.ipcRenderer?.on('session-initializing', (event, isInitializing) => {
            this.isInitializing = isInitializing;
        });

        document.addEventListener('keydown', this.boundKeydownHandler);
        window.addEventListener('main-view-shown', this.boundViewShownHandler);

        resizeLayout();
        setTimeout(() => {
            this._loadPreferences();
        }, 100);
    }

    firstUpdated() {
        super.firstUpdated();
        const startButton = this.shadowRoot?.querySelector('.start-button');
        if (startButton) {
            console.log({ startButtonFound: true, button: startButton });
            startButton.addEventListener('click', this.boundHandleStartClick);
        } else {
            console.error({ error: 'Start button not found in shadowRoot', shadowRoot: !!this.shadowRoot });
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.electron?.ipcRenderer?.removeAllListeners('session-initializing');
        document.removeEventListener('keydown', this.boundKeydownHandler);
        window.removeEventListener('main-view-shown', this.boundViewShownHandler);
    }

    handleKeydown(e) {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const isStartShortcut = isMac ? e.metaKey && e.key === 'Enter' : e.ctrlKey && e.key === 'Enter';

        if (isStartShortcut) {
            e.preventDefault();
            this.handleStartClick();
        }
    }

    handleStartClick(e) {
        console.log({
            handleStartClick: {
                isInitializing: this.isInitializing,
                onStart: typeof this.onStart,
                event: e,
                target: e?.target,
                currentTarget: e?.currentTarget,
            },
        });
        e?.preventDefault?.();
        e?.stopPropagation?.();
        if (this.isInitializing) {
            console.log({ message: 'Start blocked: isInitializing is true' });
            return;
        }
        if (this.onStart && typeof this.onStart === 'function') {
            console.log({ message: 'Calling onStart handler', onStart: this.onStart });
            try {
                this.onStart();
            } catch (error) {
                console.error({ error: 'Error calling onStart', message: error.message, stack: error.stack });
            }
        } else {
            console.error({ error: 'onStart handler is not available', onStart: this.onStart, type: typeof this.onStart });
        }
    }

    getProfileNames() {
        return {
            interview: 'Job Interview',
            sales: 'Sales Call',
            meeting: 'Business Meeting',
            presentation: 'Presentation',
            negotiation: 'Negotiation',
            exam: 'Exam Assistant',
        };
    }

    getLanguages() {
        return [
            { value: 'en-US', name: 'English' },
            { value: 'de-DE', name: 'German' },
            { value: 'es-ES', name: 'Spanish' },
            { value: 'fr-FR', name: 'French' },
            { value: 'hi-IN', name: 'Hindi' },
            { value: 'pt-BR', name: 'Portuguese' },
            { value: 'ar-XA', name: 'Arabic' },
            { value: 'id-ID', name: 'Indonesian' },
            { value: 'it-IT', name: 'Italian' },
            { value: 'ja-JP', name: 'Japanese' },
            { value: 'tr-TR', name: 'Turkish' },
            { value: 'vi-VN', name: 'Vietnamese' },
            { value: 'nl-NL', name: 'Dutch' },
            { value: 'ko-KR', name: 'Korean' },
            { value: 'cmn-CN', name: 'Mandarin Chinese' },
            { value: 'pl-PL', name: 'Polish' },
            { value: 'ru-RU', name: 'Russian' },
            { value: 'th-TH', name: 'Thai' },
        ];
    }

    getProgrammingLanguages() {
        return [
            { value: 'javascript', name: 'JavaScript' },
            { value: 'typescript', name: 'TypeScript' },
            { value: 'python', name: 'Python' },
            { value: 'java', name: 'Java' },
            { value: 'cpp', name: 'C++' },
            { value: 'c', name: 'C' },
            { value: 'csharp', name: 'C#' },
            { value: 'go', name: 'Go' },
            { value: 'rust', name: 'Rust' },
            { value: 'php', name: 'PHP' },
            { value: 'ruby', name: 'Ruby' },
            { value: 'swift', name: 'Swift' },
            { value: 'kotlin', name: 'Kotlin' },
            { value: 'scala', name: 'Scala' },
            { value: 'r', name: 'R' },
            { value: 'sql', name: 'SQL' },
        ];
    }

    getStartButtonText() {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const shortcut = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
        return html`Start <span class="shortcut-hint">${shortcut}</span>`;
    }

    render() {
        const languages = this.getLanguages();
        const programmingLanguages = this.getProgrammingLanguages();
        const currentLanguage = languages.find(l => l.value === this.selectedLanguage);
        const currentProgrammingLanguage = programmingLanguages.find(l => l.value === this.selectedProgrammingLanguage);

        return html`
            <div class="welcome">Welcome</div>
            <div class="profile-info">
                <div class="profile-row">
                    <span class="profile-label">Programming language:</span>
                    <span class="profile-value">${currentProgrammingLanguage?.name || 'qwe'}</span>
                    <span class="profile-label" style="margin-left: 20px;">Language:</span>
                    <span class="profile-value">${currentLanguage?.name || 'asd'}</span>
                </div>
                <div class="profile-prompt ${!this.customPrompt ? 'profile-prompt-empty' : ''}">${this.customPrompt || 'Prompt not set'}</div>
            </div>

            <button @click=${this.boundHandleStartClick} class="start-button ${this.isInitializing ? 'initializing' : ''}">
                ${this.getStartButtonText()}
            </button>
            <p class="description">Local server running on port 3000</p>
        `;
    }
}

customElements.define('main-view', MainView);
