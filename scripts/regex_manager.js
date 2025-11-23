/**
 * Regex Manager for Text Sanitization
 */
class RegexManager {
    constructor(containerId) {
        this.containerId = containerId;
        this.regexList = [
            { id: 'regex_brace', name: 'Remove Braces {}', pattern: '}', active: false },
            { id: 'regex_html_strict', name: 'Strict HTML Tags', pattern: '^<.+?>.*<\\/.+?>$', active: false },
            { id: 'regex_single_tag', name: 'Single HTML Tags', pattern: '^<[^>]+>$', active: false }
        ];
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
    }

    bindEvents() {
        // Global events for the manager can be bound here if needed
        // Individual card events are bound in render
    }

    render() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.innerHTML = '';

        this.regexList.forEach(regex => {
            const card = this.createCard(regex);
            container.appendChild(card);
        });
    }

    createCard(regex) {
        const card = document.createElement('div');
        card.className = 'regex-card';
        card.dataset.id = regex.id;

        const header = document.createElement('div');
        header.className = 'regex-card-header';

        const checkbox = document.createElement('md-checkbox');
        checkbox.checked = regex.active;
        checkbox.addEventListener('change', (e) => {
            regex.active = e.target.checked;
        });

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'regex-name-input';
        nameInput.value = regex.name;
        nameInput.placeholder = 'Regex Name';
        nameInput.addEventListener('change', (e) => {
            regex.name = e.target.value;
        });

        const deleteBtn = document.createElement('md-icon-button');
        deleteBtn.innerHTML = '<md-icon>delete</md-icon>';
        deleteBtn.addEventListener('click', () => {
            this.removeRegex(regex.id);
        });

        header.appendChild(checkbox);
        header.appendChild(nameInput);
        header.appendChild(deleteBtn);

        const content = document.createElement('div');
        content.className = 'regex-card-content';

        const patternInput = document.createElement('md-outlined-text-field');
        patternInput.label = 'Pattern';
        patternInput.value = regex.pattern;
        patternInput.className = 'full-width';
        patternInput.addEventListener('input', (e) => {
            regex.pattern = e.target.value;
        });

        content.appendChild(patternInput);

        card.appendChild(header);
        card.appendChild(content);

        return card;
    }

    addRegex() {
        const newId = 'regex_' + Date.now();
        this.regexList.push({
            id: newId,
            name: 'New Regex',
            pattern: '',
            active: true
        });
        this.render();
    }

    removeRegex(id) {
        this.regexList = this.regexList.filter(r => r.id !== id);
        this.render();
    }

    getActiveRegexes() {
        return this.regexList.filter(r => r.active).map(r => r.pattern);
    }

    exportSettings() {
        const data = JSON.stringify(this.regexList, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        saveAs(blob, 'regex_settings.json');
    }

    importSettings(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (Array.isArray(data)) {
                    this.regexList = data;
                    this.render();
                } else {
                    alert('Invalid settings file');
                }
            } catch (err) {
                console.error('Error parsing settings', err);
                alert('Error parsing settings file');
            }
        };
        reader.readAsText(file);
    }
}
