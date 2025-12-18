import { html, css, LitElement } from '../../assets/lit-core-2.7.4.min.js';
import { resizeLayout } from '../../utils/windowResize.js';

export class HelpView extends LitElement {
    static styles = css`
        * {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            cursor: default;
            user-select: none;
        }

        :host {
            display: block;
            padding: 0;
        }

        .help-container {
            display: flex;
            flex-direction: column;
        }

        .option-group {
            padding: 16px 12px;
            border-bottom: 1px solid var(--border-color);
        }

        .option-group:last-child {
            border-bottom: none;
        }

        .option-label {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
        }

        .description {
            color: var(--text-secondary);
            font-size: 12px;
            line-height: 1.4;
            user-select: text;
            cursor: text;
        }

        .description strong {
            color: var(--text-color);
            font-weight: 500;
        }

        .link {
            color: var(--text-color);
            text-decoration: underline;
            text-underline-offset: 2px;
            cursor: pointer;
        }

        .key {
            background: var(--bg-tertiary);
            color: var(--text-color);
            border: 1px solid var(--border-color);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            font-family: 'SF Mono', Monaco, monospace;
            font-weight: 500;
            margin: 0 1px;
            white-space: nowrap;
        }

        .keyboard-section {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 12px;
            margin-top: 8px;
        }

        .keyboard-group {
            padding: 10px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .keyboard-group:last-child {
            border-bottom: none;
        }

        .keyboard-group-title {
            font-weight: 600;
            font-size: 12px;
            color: var(--text-color);
            margin-bottom: 8px;
        }

        .shortcut-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;
            font-size: 11px;
        }

        .shortcut-description {
            color: var(--text-secondary);
        }

        .shortcut-keys {
            display: flex;
            gap: 2px;
        }

        .profiles-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 8px;
            margin-top: 8px;
        }

        .profile-item {
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .profile-item:last-child {
            border-bottom: none;
        }

        .profile-name {
            font-weight: 500;
            font-size: 12px;
            color: var(--text-color);
            margin-bottom: 2px;
        }

        .profile-description {
            font-size: 11px;
            color: var(--text-muted);
            line-height: 1.3;
        }

        .community-links {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .community-link {
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 10px;
            background: transparent;
            border: 1px solid var(--border-color);
            border-radius: 3px;
            color: var(--text-color);
            font-size: 11px;
            font-weight: 500;
            transition: background 0.1s ease;
            cursor: pointer;
        }

        .community-link:hover {
            background: var(--hover-background);
        }

        .community-link svg {
            width: 14px;
            height: 14px;
            flex-shrink: 0;
        }

        .usage-steps {
            counter-reset: step-counter;
        }

        .usage-step {
            counter-increment: step-counter;
            position: relative;
            padding-left: 24px;
            margin-bottom: 8px;
            font-size: 11px;
            line-height: 1.4;
            color: var(--text-secondary);
        }

        .usage-step::before {
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 0;
            width: 16px;
            height: 16px;
            background: var(--bg-tertiary);
            color: var(--text-color);
            border-radius: 3px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: 600;
        }

        .usage-step strong {
            color: var(--text-color);
        }
    `;

    static properties = {
        onExternalLinkClick: { type: Function },
        keybinds: { type: Object },
    };

    constructor() {
        super();
        this.onExternalLinkClick = () => {};
        this.keybinds = this.getDefaultKeybinds();
        this._loadKeybinds();
    }

    async _loadKeybinds() {
        try {
            const keybinds = await interviewApp.storage.getKeybinds();
            if (keybinds) {
                this.keybinds = { ...this.getDefaultKeybinds(), ...keybinds };
                this.requestUpdate();
            }
        } catch (error) {
            console.error('Error loading keybinds:', error);
        }
    }

    connectedCallback() {
        super.connectedCallback();
        // Resize window for this view
        resizeLayout();
    }

    getDefaultKeybinds() {
        const isMac = interviewApp.isMacOS || navigator.platform.includes('Mac');
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

    formatKeybind(keybind) {
        return keybind.split('+').map(key => html`<span class="key">${key}</span>`);
    }

    handleExternalLinkClick(url) {
        this.onExternalLinkClick(url);
    }

    render() {
        return html`
            <div class="help-container">
                <div class="option-group">
                    <div class="option-label">
                        <span>Keyboard Shortcuts</span>
                    </div>
                    <div class="keyboard-section">
                        <div class="keyboard-group">
                            <div class="keyboard-group-title">Window Movement</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Move window up</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveUp)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Move window down</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveDown)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Move window left</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveLeft)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Move window right</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.moveRight)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">Window Control</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Toggle click-through mode</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.toggleClickThrough)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Toggle window visibility</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.toggleVisibility)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">AI Actions</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Take screenshot and ask for next step</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.nextStep)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">Response Navigation</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Previous response</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.previousResponse)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Next response</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.nextResponse)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Scroll response up</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.scrollUp)}</div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Scroll response down</span>
                                <div class="shortcut-keys">${this.formatKeybind(this.keybinds.scrollDown)}</div>
                            </div>
                        </div>

                        <div class="keyboard-group">
                            <div class="keyboard-group-title">Text Input</div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">Send message to AI</span>
                                <div class="shortcut-keys"><span class="key">Enter</span></div>
                            </div>
                            <div class="shortcut-item">
                                <span class="shortcut-description">New line in text input</span>
                                <div class="shortcut-keys"><span class="key">Shift</span><span class="key">Enter</span></div>
                            </div>
                        </div>
                    </div>
                    <div class="description" style="margin-top: 12px; text-align: center;">You can customize these shortcuts in Settings.</div>
                </div>

                <div class="option-group">
                    <div class="option-label">
                        <span>How to Use</span>
                    </div>
                    <div class="usage-steps">
                        <div class="usage-step">
                            <strong>Start a Session:</strong> Make sure local server is running on port 3000 and click "Start Session"
                        </div>
                        <div class="usage-step"><strong>Customize:</strong> Choose your profile and language in the settings</div>
                        <div class="usage-step">
                            <strong>Position Window:</strong> Use keyboard shortcuts to move the window to your desired location
                        </div>
                        <div class="usage-step">
                            <strong>Click-through Mode:</strong> Use ${this.formatKeybind(this.keybinds.toggleClickThrough)} to make the window
                            click-through
                        </div>
                        <div class="usage-step"><strong>Text Messages:</strong> Type questions or requests to the AI using the text input</div>
                        <div class="usage-step">
                            <strong>Navigate Responses:</strong> Use ${this.formatKeybind(this.keybinds.previousResponse)} and
                            ${this.formatKeybind(this.keybinds.nextResponse)} to browse through AI responses
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
}

customElements.define('help-view', HelpView);
