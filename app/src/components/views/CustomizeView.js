import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class CustomizeView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            height: 100%;
        }

        .settings-layout {
            display: flex;
            height: 100%;
        }

        /* Sidebar */
        .settings-sidebar {
            width: 160px;
            min-width: 160px;
            border-right: 1px solid var(--border-color);
            padding: 8px 0;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .sidebar-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            margin: 0 8px;
            border-radius: 3px;
            font-size: 12px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.1s ease;
            border: none;
            background: transparent;
            text-align: left;
            width: calc(100% - 16px);
        }

        .sidebar-item:hover {
            background: var(--hover-background);
            color: var(--text-color);
        }

        .sidebar-item.active {
            background: var(--bg-tertiary);
            color: var(--text-color);
        }

        .sidebar-item svg {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        .sidebar-item.danger {
            color: var(--error-color);
        }

        .sidebar-item.danger:hover,
        .sidebar-item.danger.active {
            color: var(--error-color);
        }

        /* Main content */
        .settings-content {
            flex: 1;
            padding: 16px 0;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
        }

        .settings-content > * {
            flex-shrink: 0;
        }

        .settings-content > .profile-section {
            flex: 1;
            min-height: 0;
        }

        .settings-content::-webkit-scrollbar {
            width: 8px;
        }

        .settings-content::-webkit-scrollbar-track {
            background: transparent;
        }

        .settings-content::-webkit-scrollbar-thumb {
            background: var(--scrollbar-thumb);
            border-radius: 4px;
        }

        .settings-content::-webkit-scrollbar-thumb:hover {
            background: var(--scrollbar-thumb-hover);
        }

        .content-header {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-color);
            margin-bottom: 16px;
            padding: 0 16px 12px 16px;
            border-bottom: 1px solid var(--border-color);
        }

        .settings-section {
            padding: 12px 16px;
        }

        .section-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .form-grid {
            display: grid;
            gap: 12px;
            padding: 0 16px;
        }

        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            align-items: start;
        }

        @media (max-width: 600px) {
            .form-row {
                grid-template-columns: 1fr;
            }
        }

        .form-group {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--text-color);
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .form-description {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.4;
            margin-top: 2px;
        }

        .form-control {
            background: var(--input-background);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 8px 10px;
            border-radius: 3px;
            font-size: 12px;
            transition: border-color 0.1s ease;
        }

        .form-control:focus {
            outline: none;
            border-color: var(--border-default);
        }

        .form-control:hover:not(:focus) {
            border-color: var(--border-default);
        }

        select.form-control {
            cursor: pointer;
            appearance: none;
            background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b6b6b' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
            background-position: right 8px center;
            background-repeat: no-repeat;
            background-size: 12px;
            padding-right: 28px;
        }

        textarea.form-control {
            resize: vertical;
            min-height: 60px;
            line-height: 1.4;
            font-family: inherit;
        }

        /* Profile section with expanding textarea */
        .profile-section {
            display: flex;
            flex-direction: column;
            height: 100%;
        }

        .profile-section .form-grid {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .profile-section .form-group.expand {
            flex: 1;
            display: flex;
            flex-direction: column;
        }

        .profile-section .form-group.expand textarea {
            flex: 1;
            resize: none;
        }

        textarea.form-control::placeholder {
            color: var(--placeholder-color);
        }

        .current-selection {
            display: inline-flex;
            align-items: center;
            font-size: 10px;
            color: var(--text-secondary);
            background: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
        }

        .keybind-input {
            cursor: pointer;
            font-family: 'SF Mono', Monaco, monospace;
            text-align: center;
            letter-spacing: 0.5px;
            font-weight: 500;
        }

        .keybind-input:focus {
            cursor: text;
        }

        .keybind-input::placeholder {
            color: var(--placeholder-color);
            font-style: italic;
        }

        .reset-keybinds-button {
            background: transparent;
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 6px 10px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.1s ease;
        }

        .reset-keybinds-button:hover {
            background: var(--hover-background);
        }

        .keybinds-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
        }

        .keybinds-table th,
        .keybinds-table td {
            padding: 8px 0;
            text-align: left;
            border-bottom: 1px solid var(--border-color);
        }

        .keybinds-table th {
            font-weight: 600;
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .keybinds-table td {
            vertical-align: middle;
        }

        .keybinds-table .action-name {
            font-weight: 500;
            color: var(--text-color);
            font-size: 12px;
        }

        .keybinds-table .action-description {
            font-size: 10px;
            color: var(--text-muted);
            margin-top: 1px;
        }

        .keybinds-table .keybind-input {
            min-width: 100px;
            padding: 4px 8px;
            margin: 0;
            font-size: 11px;
        }

        .keybinds-table tr:hover {
            background: var(--hover-background);
        }

        .keybinds-table tr:last-child td {
            border-bottom: none;
        }

        .table-reset-row {
            border-top: 1px solid var(--border-color);
        }

        .table-reset-row td {
            padding-top: 10px;
            padding-bottom: 8px;
            border-bottom: none;
        }

        .table-reset-row:hover {
            background: transparent;
        }

        .settings-note {
            font-size: 11px;
            color: var(--text-muted);
            text-align: center;
            margin-top: 16px;
            padding: 12px;
            border-top: 1px solid var(--border-color);
        }

        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 0;
        }

        .checkbox-input {
            width: 14px;
            height: 14px;
            accent-color: var(--text-color);
            cursor: pointer;
        }

        .checkbox-label {
            font-weight: 500;
            font-size: 12px;
            color: var(--text-color);
            cursor: pointer;
            user-select: none;
        }

        /* Slider styles */
        .slider-container {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .slider-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .slider-value {
            font-size: 11px;
            color: var(--text-secondary);
            background: var(--bg-tertiary);
            padding: 2px 6px;
            border-radius: 3px;
            font-weight: 500;
            font-family: 'SF Mono', Monaco, monospace;
        }

        .slider-input {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: var(--border-color);
            outline: none;
            cursor: pointer;
        }

        .slider-input::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--text-color);
            cursor: pointer;
            border: none;
        }

        .slider-input::-moz-range-thumb {
            width: 14px;
            height: 14px;
            border-radius: 50%;
            background: var(--text-color);
            cursor: pointer;
            border: none;
        }

        .slider-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 4px;
            font-size: 10px;
            color: var(--text-muted);
        }

        /* Color picker styles */
        .color-picker-container {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .color-picker-input {
            -webkit-appearance: none;
            appearance: none;
            width: 40px;
            height: 32px;
            border: 1px solid var(--border-color);
            border-radius: 3px;
            cursor: pointer;
            padding: 2px;
            background: var(--input-background);
        }

        .color-picker-input::-webkit-color-swatch-wrapper {
            padding: 0;
        }

        .color-picker-input::-webkit-color-swatch {
            border: none;
            border-radius: 2px;
        }

        .color-hex-input {
            width: 80px;
            font-family: 'SF Mono', Monaco, monospace;
            text-transform: uppercase;
        }

        .reset-color-button {
            background: transparent;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
            padding: 6px 10px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.1s ease;
        }

        .reset-color-button:hover {
            background: var(--hover-background);
            color: var(--text-color);
        }

        /* Danger button and status */
        .danger-button {
            background: transparent;
            color: var(--error-color);
            border: 1px solid var(--error-color);
            padding: 8px 14px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
            cursor: pointer;
            transition: background 0.1s ease;
        }

        .danger-button:hover {
            background: rgba(241, 76, 76, 0.1);
        }

        .danger-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        .status-message {
            margin-top: 12px;
            padding: 8px 12px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: 500;
        }

        .status-success {
            background: var(--bg-secondary);
            color: var(--success-color);
            border-left: 2px solid var(--success-color);
        }

        .status-error {
            background: var(--bg-secondary);
            color: var(--error-color);
            border-left: 2px solid var(--error-color);
        }
    `;

    static properties = {
        selectedProfile: { type: String },
        selectedLanguage: { type: String },
        selectedProgrammingLanguage: { type: String },
        selectedImageQuality: { type: String },
        layoutMode: { type: String },
        keybinds: { type: Object },
        googleSearchEnabled: { type: Boolean },
        backgroundTransparency: { type: Number },
        fontSize: { type: Number },
        theme: { type: String },
        onProfileChange: { type: Function },
        onLanguageChange: { type: Function },
        onImageQualityChange: { type: Function },
        onLayoutModeChange: { type: Function },
        onUnsavedChangesChange: { type: Function },
        onSaveClick: { type: Function },
        activeSection: { type: String },
        isClearing: { type: Boolean },
        clearStatusMessage: { type: String },
        clearStatusType: { type: String },
        hasUnsavedChanges: { type: Boolean },
    };

    constructor() {
        super();
        this.selectedProfile = 'interview';
        this.selectedLanguage = 'ru-RU';
        this.selectedProgrammingLanguage = 'javascript';
        this.selectedImageQuality = 'medium';
        this.layoutMode = 'normal';
        this.keybinds = this.getDefaultKeybinds();
        this.onProfileChange = () => {};
        this.onLanguageChange = () => {};
        this.onImageQualityChange = () => {};
        this.onLayoutModeChange = () => {};
        this.onUnsavedChangesChange = () => {};
        this.onSaveClick = () => {};

        // Google Search default
        this.googleSearchEnabled = true;

        // Clear data state
        this.isClearing = false;
        this.clearStatusMessage = '';
        this.clearStatusType = '';

        // Background transparency default
        this.backgroundTransparency = 0.8;

        // Font size default (in pixels)
        this.fontSize = 20;

        // Audio mode default
        this.audioMode = 'speaker_only';

        // Custom prompt
        this.customPrompt = '';

        // Active section for sidebar navigation
        this.activeSection = 'profile';

        // Theme default
        this.theme = 'dark';

        this.hasUnsavedChanges = false;
        this._savedState = {};

        this._loadFromStorage();
    }

    getThemes() {
        return window.interviewApp?.theme?.getAll() || [];
    }

    setActiveSection(section) {
        this.activeSection = section;
        this.requestUpdate();
    }

    getSidebarSections() {
        return [
            { id: 'profile', name: 'Profile', icon: 'user' },
            { id: 'appearance', name: 'Appearance', icon: 'display' },
            { id: 'language', name: 'Language', icon: 'globe' },
            { id: 'keyboard', name: 'Keyboard', icon: 'keyboard' },
        ];
    }

    renderSidebarIcon(icon) {
        const icons = {
            user: html`<svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path
                    d="M19 21V19C19 17.9391 18.5786 16.9217 17.8284 16.1716C17.0783 15.4214 16.0609 15 15 15H9C7.93913 15 6.92172 15.4214 6.17157 16.1716C5.42143 16.9217 5 17.9391 5 19V21"
                ></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>`,
            mic: html`<svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>`,
            globe: html`<svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>`,
            display: html`<svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>`,
            camera: html`<svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                <circle cx="12" cy="13" r="4"></circle>
            </svg>`,
            keyboard: html`<svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
                <path d="M6 8h.001"></path>
                <path d="M10 8h.001"></path>
                <path d="M14 8h.001"></path>
                <path d="M18 8h.001"></path>
                <path d="M8 12h.001"></path>
                <path d="M12 12h.001"></path>
                <path d="M16 12h.001"></path>
                <path d="M7 16h10"></path>
            </svg>`,
            search: html`<svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>`,
            warning: html`<svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.7"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>`,
        };
        return icons[icon] || '';
    }

    async _loadFromStorage() {
        try {
            const [prefs, keybinds, config] = await Promise.all([
                window.interviewApp.storage.getPreferences(),
                window.interviewApp.storage.getKeybinds(),
                window.interviewApp.storage.getConfig(),
            ]);

            console.log({ loadingPreferences: prefs });

            this.selectedProfile = prefs.selectedProfile ?? 'interview';
            this.selectedLanguage = prefs.selectedLanguage ?? 'ru-RU';
            this.selectedProgrammingLanguage = prefs.selectedProgrammingLanguage ?? 'javascript';
            this.selectedImageQuality = prefs.selectedImageQuality ?? 'medium';
            this.layoutMode = config.layout ?? 'normal';
            this.googleSearchEnabled = prefs.googleSearchEnabled ?? true;
            this.backgroundTransparency = prefs.backgroundTransparency ?? 0.8;
            this.fontSize = prefs.fontSize ?? 20;
            this.audioMode = prefs.audioMode ?? 'speaker_only';
            this.customPrompt = prefs.customPrompt ?? '';
            this.theme = prefs.theme ?? 'dark';

            console.log({
                loadedSettings: {
                    language: this.selectedLanguage,
                    programmingLanguage: this.selectedProgrammingLanguage,
                    profile: this.selectedProfile,
                },
            });

            if (keybinds) {
                this.keybinds = { ...this.getDefaultKeybinds(), ...keybinds };
            } else {
                this.keybinds = this.getDefaultKeybinds();
            }

            this._savedState = {
                selectedProfile: this.selectedProfile,
                selectedLanguage: this.selectedLanguage,
                selectedProgrammingLanguage: this.selectedProgrammingLanguage,
                selectedImageQuality: this.selectedImageQuality,
                layoutMode: this.layoutMode,
                googleSearchEnabled: this.googleSearchEnabled,
                backgroundTransparency: this.backgroundTransparency,
                fontSize: this.fontSize,
                audioMode: this.audioMode,
                customPrompt: this.customPrompt,
                theme: this.theme,
                keybinds: JSON.stringify(this.keybinds),
            };

            this.hasUnsavedChanges = false;
            this.onUnsavedChangesChange(false);
            this.updateBackgroundTransparency();
            this.updateFontSize();
            this.requestUpdate();
        } catch (error) {
            console.error({ error: 'Error loading settings', message: error.message });
        }
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
    }

    getProfiles() {
        return [
            {
                value: 'interview',
                name: 'Job Interview',
                description: 'Get help with answering interview questions',
            },
            {
                value: 'sales',
                name: 'Sales Call',
                description: 'Assist with sales conversations and objection handling',
            },
            {
                value: 'meeting',
                name: 'Business Meeting',
                description: 'Support for professional meetings and discussions',
            },
            {
                value: 'presentation',
                name: 'Presentation',
                description: 'Help with presentations and public speaking',
            },
            {
                value: 'negotiation',
                name: 'Negotiation',
                description: 'Guidance for business negotiations and deals',
            },
            {
                value: 'exam',
                name: 'Exam Assistant',
                description: 'Academic assistance for test-taking and exam questions',
            },
        ];
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

    _checkForChanges() {
        if (!this._savedState) {
            console.log({ checkForChanges: 'No saved state, returning false' });
            return false;
        }

        const currentKeybindsStr = JSON.stringify(this.keybinds || this.getDefaultKeybinds());
        const savedKeybindsStr = this._savedState.keybinds || JSON.stringify(this.getDefaultKeybinds());

        const hasChanges =
            this.selectedProfile !== this._savedState.selectedProfile ||
            this.selectedLanguage !== this._savedState.selectedLanguage ||
            this.selectedProgrammingLanguage !== this._savedState.selectedProgrammingLanguage ||
            this.selectedImageQuality !== this._savedState.selectedImageQuality ||
            this.layoutMode !== this._savedState.layoutMode ||
            this.googleSearchEnabled !== this._savedState.googleSearchEnabled ||
            Math.abs((this.backgroundTransparency || 0.8) - (this._savedState.backgroundTransparency || 0.8)) > 0.001 ||
            this.fontSize !== this._savedState.fontSize ||
            this.audioMode !== this._savedState.audioMode ||
            (this.customPrompt || '') !== (this._savedState.customPrompt || '') ||
            this.theme !== this._savedState.theme ||
            currentKeybindsStr !== savedKeybindsStr;

        if (hasChanges !== this.hasUnsavedChanges) {
            console.log({
                checkForChanges: {
                    hasChanges,
                    was: this.hasUnsavedChanges,
                    currentState: {
                        profile: this.selectedProfile,
                        language: this.selectedLanguage,
                    },
                    savedState: {
                        profile: this._savedState.selectedProfile,
                        language: this._savedState.selectedLanguage,
                    },
                },
            });
            this.hasUnsavedChanges = hasChanges;
            this.onUnsavedChangesChange(hasChanges);
            this.requestUpdate();
        }

        return hasChanges;
    }

    _markAsChanged() {
        this._checkForChanges();
    }

    async saveAll() {
        console.log({ saveAllCalled: true, hasUnsavedChanges: this.hasUnsavedChanges });

        if (!window.interviewApp || !window.interviewApp.storage) {
            console.error({ error: 'interviewApp.storage is not available' });
            throw new Error('Storage API is not available');
        }

        try {
            console.log({
                savingPreferences: {
                    selectedProfile: this.selectedProfile,
                    selectedLanguage: this.selectedLanguage,
                    selectedProgrammingLanguage: this.selectedProgrammingLanguage,
                },
            });

            console.log({
                savingToStorage: {
                    selectedProfile: this.selectedProfile,
                    selectedLanguage: this.selectedLanguage,
                    selectedProgrammingLanguage: this.selectedProgrammingLanguage,
                },
            });

            await window.interviewApp.storage.updatePreference('selectedProfile', this.selectedProfile);
            await window.interviewApp.storage.updatePreference('selectedLanguage', this.selectedLanguage);
            await window.interviewApp.storage.updatePreference('selectedProgrammingLanguage', this.selectedProgrammingLanguage);
            await window.interviewApp.storage.updatePreference('selectedImageQuality', this.selectedImageQuality);
            await window.interviewApp.storage.updatePreference('googleSearchEnabled', this.googleSearchEnabled);
            await window.interviewApp.storage.updatePreference('backgroundTransparency', this.backgroundTransparency);
            await window.interviewApp.storage.updatePreference('fontSize', this.fontSize);
            await window.interviewApp.storage.updatePreference('audioMode', this.audioMode);
            await window.interviewApp.storage.updatePreference('customPrompt', this.customPrompt);
            await window.interviewApp.storage.updatePreference('theme', this.theme);
            await window.interviewApp.storage.updateConfig('layout', this.layoutMode);
            await this.saveKeybinds();

            const savedPrefs = await window.interviewApp.storage.getPreferences();
            console.log({
                preferencesSaved: true,
                savedPreferences: savedPrefs,
                verify: {
                    profile: savedPrefs.selectedProfile === this.selectedProfile,
                    language: savedPrefs.selectedLanguage === this.selectedLanguage,
                },
            });

            if (window.require) {
                try {
                    const { ipcRenderer } = window.require('electron');
                    await ipcRenderer.invoke('update-google-search-setting', this.googleSearchEnabled);
                } catch (error) {
                    console.error({ error: 'Failed to notify main process', message: error.message });
                }
            }

            this._savedState = {
                selectedProfile: this.selectedProfile,
                selectedLanguage: this.selectedLanguage,
                selectedProgrammingLanguage: this.selectedProgrammingLanguage,
                selectedImageQuality: this.selectedImageQuality,
                layoutMode: this.layoutMode,
                googleSearchEnabled: this.googleSearchEnabled,
                backgroundTransparency: this.backgroundTransparency,
                fontSize: this.fontSize,
                audioMode: this.audioMode,
                customPrompt: this.customPrompt,
                theme: this.theme,
                keybinds: JSON.stringify(this.keybinds),
            };

            this.hasUnsavedChanges = false;
            this.onUnsavedChangesChange(false);
            console.log({
                stateUpdated: {
                    hasUnsavedChanges: this.hasUnsavedChanges,
                    _savedState: this._savedState,
                },
            });
            this.requestUpdate();

            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('main-view-shown'));
            }, 100);
        } catch (error) {
            console.error({ error: 'Error saving preferences', message: error.message, stack: error.stack });
            throw error;
        }
    }

    handleProfileSelect(e) {
        this.selectedProfile = e.target.value;
        this._markAsChanged();
        this.onProfileChange(this.selectedProfile);
        this.requestUpdate();
    }

    handleLanguageSelect(e) {
        const newValue = e.target.value;
        this.selectedLanguage = newValue;
        this._markAsChanged();
        this.onLanguageChange(this.selectedLanguage);
        this.requestUpdate();
    }

    handleProgrammingLanguageSelect(e) {
        const newValue = e.target.value;
        this.selectedProgrammingLanguage = newValue;
        this._markAsChanged();
        this.requestUpdate();
    }

    handleImageQualitySelect(e) {
        this.selectedImageQuality = e.target.value;
        this._markAsChanged();
        this.onImageQualityChange(e.target.value);
        this.requestUpdate();
    }

    handleLayoutModeSelect(e) {
        this.layoutMode = e.target.value;
        this._markAsChanged();
        this.onLayoutModeChange(e.target.value);
        this.requestUpdate();
    }

    handleCustomPromptInput(e) {
        this.customPrompt = e.target.value;
        this._markAsChanged();
    }

    handleAudioModeSelect(e) {
        this.audioMode = e.target.value;
        this._markAsChanged();
        this.requestUpdate();
    }

    handleThemeChange(e) {
        this.theme = e.target.value;
        this._markAsChanged();
        this.updateBackgroundAppearance();
        this.requestUpdate();
    }

    getDefaultKeybinds() {
        const isMac = window.interviewApp?.isMacOS || navigator.platform.includes('Mac');
        return {
            moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
            moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
            moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
            moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
            toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
            toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
            nextStep: isMac ? 'Cmd+Enter' : 'Ctrl+Enter',
            previousResponse: isMac ? 'Cmd+[' : 'Ctrl+[',
            nextResponse: isMac ? 'Cmd+]' : 'Ctrl+]',
            scrollUp: isMac ? 'Cmd+Shift+Up' : 'Ctrl+Shift+Up',
            scrollDown: isMac ? 'Cmd+Shift+Down' : 'Ctrl+Shift+Down',
        };
    }

    async saveKeybinds() {
        if (!window.interviewApp || !window.interviewApp.storage) {
            throw new Error('Storage API is not available');
        }
        await window.interviewApp.storage.setKeybinds(this.keybinds);
        if (window.require) {
            const { ipcRenderer } = window.require('electron');
            ipcRenderer.send('update-keybinds', this.keybinds);
        }
    }

    handleKeybindChange(action, value) {
        this.keybinds = { ...this.keybinds, [action]: value };
        this._markAsChanged();
        this.requestUpdate();
    }

    resetKeybinds() {
        this.keybinds = this.getDefaultKeybinds();
        this._markAsChanged();
        this.requestUpdate();
    }

    getKeybindActions() {
        return [
            {
                key: 'moveUp',
                name: 'Move Window Up',
                description: 'Move the application window up',
            },
            {
                key: 'moveDown',
                name: 'Move Window Down',
                description: 'Move the application window down',
            },
            {
                key: 'moveLeft',
                name: 'Move Window Left',
                description: 'Move the application window left',
            },
            {
                key: 'moveRight',
                name: 'Move Window Right',
                description: 'Move the application window right',
            },
            {
                key: 'toggleVisibility',
                name: 'Toggle Window Visibility',
                description: 'Show/hide the application window',
            },
            {
                key: 'toggleClickThrough',
                name: 'Toggle Click-through Mode',
                description: 'Enable/disable click-through functionality',
            },
            {
                key: 'nextStep',
                name: 'Ask Next Step',
                description: 'Take screenshot and ask AI for the next step suggestion',
            },
            {
                key: 'previousResponse',
                name: 'Previous Response',
                description: 'Navigate to the previous AI response',
            },
            {
                key: 'nextResponse',
                name: 'Next Response',
                description: 'Navigate to the next AI response',
            },
            {
                key: 'scrollUp',
                name: 'Scroll Response Up',
                description: 'Scroll the AI response content up',
            },
            {
                key: 'scrollDown',
                name: 'Scroll Response Down',
                description: 'Scroll the AI response content down',
            },
        ];
    }

    handleKeybindFocus(e) {
        e.target.placeholder = 'Press key combination...';
        e.target.select();
    }

    handleKeybindInput(e) {
        e.preventDefault();

        const modifiers = [];
        const keys = [];

        // Check modifiers
        if (e.ctrlKey) modifiers.push('Ctrl');
        if (e.metaKey) modifiers.push('Cmd');
        if (e.altKey) modifiers.push('Alt');
        if (e.shiftKey) modifiers.push('Shift');

        // Get the main key
        let mainKey = e.key;

        // Handle special keys
        switch (e.code) {
            case 'ArrowUp':
                mainKey = 'Up';
                break;
            case 'ArrowDown':
                mainKey = 'Down';
                break;
            case 'ArrowLeft':
                mainKey = 'Left';
                break;
            case 'ArrowRight':
                mainKey = 'Right';
                break;
            case 'Enter':
                mainKey = 'Enter';
                break;
            case 'Space':
                mainKey = 'Space';
                break;
            case 'Backslash':
                mainKey = '\\';
                break;
            case 'KeyS':
                if (e.shiftKey) mainKey = 'S';
                break;
            case 'KeyM':
                mainKey = 'M';
                break;
            default:
                if (e.key.length === 1) {
                    mainKey = e.key.toUpperCase();
                }
                break;
        }

        // Skip if only modifier keys are pressed
        if (['Control', 'Meta', 'Alt', 'Shift'].includes(e.key)) {
            return;
        }

        // Construct keybind string
        const keybind = [...modifiers, mainKey].join('+');

        // Get the action from the input's data attribute
        const action = e.target.dataset.action;

        // Update the keybind
        this.handleKeybindChange(action, keybind);

        // Update the input value
        e.target.value = keybind;
        e.target.blur();
    }

    handleGoogleSearchChange(e) {
        this.googleSearchEnabled = e.target.checked;
        this._markAsChanged();
        this.requestUpdate();
    }

    async clearLocalData() {
        if (this.isClearing) return;

        this.isClearing = true;
        this.clearStatusMessage = '';
        this.clearStatusType = '';
        this.requestUpdate();

        try {
            await window.interviewApp.storage.clearAll();

            this.clearStatusMessage = 'Successfully cleared all local data';
            this.clearStatusType = 'success';
            this.requestUpdate();

            // Close the application after a short delay
            setTimeout(() => {
                this.clearStatusMessage = 'Closing application...';
                this.requestUpdate();
                setTimeout(async () => {
                    if (window.require) {
                        const { ipcRenderer } = window.require('electron');
                        await ipcRenderer.invoke('quit-application');
                    }
                }, 1000);
            }, 2000);
        } catch (error) {
            console.error('Error clearing data:', error);
            this.clearStatusMessage = `Error clearing data: ${error.message}`;
            this.clearStatusType = 'error';
        } finally {
            this.isClearing = false;
            this.requestUpdate();
        }
    }

    handleBackgroundTransparencyChange(e) {
        this.backgroundTransparency = parseFloat(e.target.value);
        this._markAsChanged();
        this.updateBackgroundAppearance();
        this.requestUpdate();
    }

    updateBackgroundAppearance() {
        // Use theme's background color
        const colors = window.interviewApp.theme.get(this.theme);
        window.interviewApp.theme.applyBackgrounds(colors.background, this.backgroundTransparency);
    }

    // Keep old function name for backwards compatibility
    updateBackgroundTransparency() {
        this.updateBackgroundAppearance();
    }

    handleFontSizeChange(e) {
        this.fontSize = parseInt(e.target.value, 10);
        this._markAsChanged();
        this.updateFontSize();
        this.requestUpdate();
    }

    updateFontSize() {
        const root = document.documentElement;
        root.style.setProperty('--response-font-size', `${this.fontSize}px`);
    }

    renderProfileSection() {
        const profiles = this.getProfiles();
        const profileNames = this.getProfileNames();
        const currentProfile = profiles.find(p => p.value === this.selectedProfile);
        const programmingLanguages = this.getProgrammingLanguages();
        const currentProgrammingLanguage = programmingLanguages.find(l => l.value === this.selectedProgrammingLanguage);

        return html`
            <div class="profile-section">
                <div class="content-header">AI Profile</div>
                <div class="form-grid">
                    <div class="form-group">
                        <label class="form-label">
                            Programming Language
                            <span class="current-selection">${currentProgrammingLanguage?.name || 'JavaScript'}</span>
                        </label>
                        <select class="form-control" .value=${this.selectedProgrammingLanguage} @change=${this.handleProgrammingLanguageSelect}>
                            ${programmingLanguages.map(
                                language => html`
                                    <option value=${language.value} ?selected=${this.selectedProgrammingLanguage === language.value}>
                                        ${language.name}
                                    </option>
                                `
                            )}
                        </select>
                        <div class="form-description">Programming language for code-related questions</div>
                    </div>
                    <div class="form-group expand">
                        <label class="form-label">Custom AI Instructions</label>
                        <textarea
                            class="form-control"
                            placeholder="Add specific instructions for how you want the AI to behave..."
                            .value=${this.customPrompt}
                            @input=${this.handleCustomPromptInput}
                        ></textarea>
                        <div class="form-description">Personalize the AI's behavior with specific instructions</div>
                    </div>
                </div>
            </div>
        `;
    }

    renderAudioSection() {
        return html`
            <div class="content-header">Audio Settings</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">Audio Mode</label>
                    <select class="form-control" .value=${this.audioMode} @change=${this.handleAudioModeSelect}>
                        <option value="speaker_only">Speaker Only (Interviewer)</option>
                        <option value="mic_only">Microphone Only (Me)</option>
                        <option value="both">Both Speaker & Microphone</option>
                    </select>
                    <div class="form-description">Choose which audio sources to capture for the AI.</div>
                </div>
            </div>
        `;
    }

    renderLanguageSection() {
        const languages = this.getLanguages();
        const currentLanguage = languages.find(l => l.value === this.selectedLanguage);

        return html`
            <div class="content-header">Language</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">
                        Speech Language
                        <span class="current-selection">${currentLanguage?.name || 'Unknown'}</span>
                    </label>
                    <select class="form-control" .value=${this.selectedLanguage} @change=${this.handleLanguageSelect}>
                        ${languages.map(
                            language => html`
                                <option value=${language.value} ?selected=${this.selectedLanguage === language.value}>${language.name}</option>
                            `
                        )}
                    </select>
                    <div class="form-description">Language for speech recognition and AI responses</div>
                </div>
            </div>
        `;
    }

    renderAppearanceSection() {
        const themes = this.getThemes();
        const currentTheme = themes.find(t => t.value === this.theme);

        return html`
            <div class="content-header">Appearance</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">
                        Theme
                        <span class="current-selection">${currentTheme?.name || 'Dark'}</span>
                    </label>
                    <select class="form-control" .value=${this.theme} @change=${this.handleThemeChange}>
                        ${themes.map(theme => html` <option value=${theme.value} ?selected=${this.theme === theme.value}>${theme.name}</option> `)}
                    </select>
                    <div class="form-description">Choose a color theme for the interface</div>
                </div>

                <div class="form-group">
                    <label class="form-label">
                        Layout Mode
                        <span class="current-selection">${this.layoutMode === 'compact' ? 'Compact' : 'Normal'}</span>
                    </label>
                    <select class="form-control" .value=${this.layoutMode} @change=${this.handleLayoutModeSelect}>
                        <option value="normal" ?selected=${this.layoutMode === 'normal'}>Normal</option>
                        <option value="compact" ?selected=${this.layoutMode === 'compact'}>Compact</option>
                    </select>
                    <div class="form-description">
                        ${this.layoutMode === 'compact' ? 'Smaller window with reduced padding' : 'Standard layout with comfortable spacing'}
                    </div>
                </div>

                <div class="form-group">
                    <div class="slider-container">
                        <div class="slider-header">
                            <label class="form-label">Background Transparency</label>
                            <span class="slider-value">${Math.round(this.backgroundTransparency * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            class="slider-input"
                            min="0"
                            max="1"
                            step="0.01"
                            .value=${this.backgroundTransparency}
                            @input=${this.handleBackgroundTransparencyChange}
                        />
                        <div class="slider-labels">
                            <span>Transparent</span>
                            <span>Opaque</span>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <div class="slider-container">
                        <div class="slider-header">
                            <label class="form-label">Response Font Size</label>
                            <span class="slider-value">${this.fontSize}px</span>
                        </div>
                        <input
                            type="range"
                            class="slider-input"
                            min="12"
                            max="32"
                            step="1"
                            .value=${this.fontSize}
                            @input=${this.handleFontSizeChange}
                        />
                        <div class="slider-labels">
                            <span>12px</span>
                            <span>32px</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderCaptureSection() {
        return html`
            <div class="content-header">Screen Capture</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label">
                        Image Quality
                        <span class="current-selection"
                            >${this.selectedImageQuality.charAt(0).toUpperCase() + this.selectedImageQuality.slice(1)}</span
                        >
                    </label>
                    <select class="form-control" .value=${this.selectedImageQuality} @change=${this.handleImageQualitySelect}>
                        <option value="high" ?selected=${this.selectedImageQuality === 'high'}>High Quality</option>
                        <option value="medium" ?selected=${this.selectedImageQuality === 'medium'}>Medium Quality</option>
                        <option value="low" ?selected=${this.selectedImageQuality === 'low'}>Low Quality</option>
                    </select>
                    <div class="form-description">
                        ${this.selectedImageQuality === 'high'
                            ? 'Best quality, uses more tokens'
                            : this.selectedImageQuality === 'medium'
                            ? 'Balanced quality and token usage'
                            : 'Lower quality, uses fewer tokens'}
                    </div>
                </div>
            </div>
        `;
    }

    renderKeyboardSection() {
        return html`
            <div class="content-header">Keyboard Shortcuts</div>
            <div class="form-grid">
                <table class="keybinds-table">
                    <thead>
                        <tr>
                            <th>Action</th>
                            <th>Shortcut</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.getKeybindActions().map(
                            action => html`
                                <tr>
                                    <td>
                                        <div class="action-name">${action.name}</div>
                                        <div class="action-description">${action.description}</div>
                                    </td>
                                    <td>
                                        <input
                                            type="text"
                                            class="form-control keybind-input"
                                            .value=${this.keybinds[action.key]}
                                            placeholder="Press keys..."
                                            data-action=${action.key}
                                            @keydown=${this.handleKeybindInput}
                                            @focus=${this.handleKeybindFocus}
                                            readonly
                                        />
                                    </td>
                                </tr>
                            `
                        )}
                        <tr class="table-reset-row">
                            <td colspan="2">
                                <button class="reset-keybinds-button" @click=${this.resetKeybinds}>Reset to Defaults</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
    }

    renderSearchSection() {
        return html`
            <div class="content-header">Search</div>
            <div class="form-grid">
                <div class="checkbox-group">
                    <input
                        type="checkbox"
                        class="checkbox-input"
                        id="google-search-enabled"
                        .checked=${this.googleSearchEnabled}
                        @change=${this.handleGoogleSearchChange}
                    />
                    <label for="google-search-enabled" class="checkbox-label">Enable Google Search</label>
                </div>
                <div class="form-description" style="margin-left: 24px; margin-top: -8px;">
                    Allow the AI to search Google for up-to-date information during conversations.
                    <br /><strong>Note:</strong> Changes take effect when starting a new AI session.
                </div>
            </div>
        `;
    }

    renderAdvancedSection() {
        return html`
            <div class="content-header" style="color: var(--error-color);">Advanced</div>
            <div class="form-grid">
                <div class="form-group">
                    <label class="form-label" style="color: var(--error-color);">Data Management</label>
                    <div class="form-description" style="margin-bottom: 12px;">
                        <strong>Warning:</strong> This action will permanently delete all local data including API keys, preferences, and session
                        history. This cannot be undone.
                    </div>
                    <button class="danger-button" @click=${this.clearLocalData} ?disabled=${this.isClearing}>
                        ${this.isClearing ? 'Clearing...' : 'Clear All Local Data'}
                    </button>
                    ${this.clearStatusMessage
                        ? html`
                              <div class="status-message ${this.clearStatusType === 'success' ? 'status-success' : 'status-error'}">
                                  ${this.clearStatusMessage}
                              </div>
                          `
                        : ''}
                </div>
            </div>
        `;
    }

    renderSectionContent() {
        switch (this.activeSection) {
            case 'profile':
                return this.renderProfileSection();
            case 'appearance':
                return this.renderAppearanceSection();
            case 'language':
                return this.renderLanguageSection();
            case 'keyboard':
                return this.renderKeyboardSection();
            default:
                return this.renderProfileSection();
        }
    }

    render() {
        const sections = this.getSidebarSections();

        return html`
            <div class="settings-layout">
                <nav class="settings-sidebar">
                    ${sections.map(
                        section => html`
                            <button
                                class="sidebar-item ${this.activeSection === section.id ? 'active' : ''} ${section.danger ? 'danger' : ''}"
                                @click=${() => this.setActiveSection(section.id)}
                            >
                                ${this.renderSidebarIcon(section.icon)}
                                <span>${section.name}</span>
                            </button>
                        `
                    )}
                </nav>
                <div class="settings-content">${this.renderSectionContent()}</div>
            </div>
        `;
    }
}

customElements.define('customize-view', CustomizeView);
