/**
 * Internationalization (i18n) Script
 */

const translations = {
    en: {
        "app.title": "RPG Decrypter",
        "tab.decrypt": "Decrypt",
        "tab.encrypt": "Encrypt",
        "tab.restore": "Restore",
        "drop.title": "Drop Folder Here",
        "drop.or": "or",
        "btn.selectFolder": "Select Folder",
        "btn.selectFiles": "Select Single Files",
        "card.settings": "Settings",
        "label.decryptKey": "Decryption Key",
        "btn.detectKey": "Detect from System.json",
        "label.targetVer": "Target Version:",
        "check.verifyHeader": "Verify/Add Fake Header",
        "label.outputMode": "Output Mode:",
        "radio.folder": "Folder (Direct Write)",
        "radio.zip": "ZIP Archive",
        "status.ready": "Ready",
        "status.processing": "Processing...",
        "status.done": "Done!",
        "btn.start": "Start",
        "label.log": "Process Log",
        "msg.noFiles": "No valid files selected.",
        "msg.enterKey": "Please enter a Decryption Key.",
        "msg.workerError": "Worker Error",
        "msg.saveError": "Save Error",
        "msg.zipDownloaded": "ZIP downloaded.",
        "msg.cancelled": "Cancelled.",
        "warn.fileProtocol": "WARNING: You are running this via 'file://' protocol. Web Workers usually fail in this mode.",
        "tooltip.theme": "Toggle Dark/Light Mode",
        "tooltip.lang": "Switch Language",
        "help.title": "Help",
        "help.close": "Close",
        "help.decryptKey": "The decryption key is required to decrypt files. You can find it in the 'System.json' file of the game (located in 'www/data/' or 'data/'). Use the 'Detect' button to automatically find it.",
        "help.fakeHeader": "RPG Maker games often use a fake header to prevent standard tools from opening the files. This option verifies and restores/adds this header to ensure compatibility with the game engine.",
        "help.outputMode": "Choose how to save the processed files. 'Folder' writes files directly to your disk (requires permission). 'ZIP Archive' creates a single compressed file, which is faster for many small files.",
        "help.targetVer": "Select the RPG Maker version the game was built with. MV and MZ use slightly different encryption methods.",
        "nav.home": "Decrypt/Pack",
        "nav.postprocess": "Translation Post-processing",
        "pp.title": "Translation Post-processing",
        "pp.tab.sanitize": "Text Sanitization",
        "pp.tab.resegment": "Text Re-segmentation",
        "pp.sanitize.desc": "Identify and mark potential code lines to prevent mistranslation.",
        "pp.input": "Input",
        "pp.regex.title": "Regex Matchers",
        "btn.downloadMarked": "Download Marked",
        "btn.downloadUnmarked": "Download Unmarked",
        "pp.resegment.desc": "Re-format text based on width to prevent overflow.",
        "pp.settings": "Settings",
        "pp.preview": "Preview",
        "help.sanitize.title": "Text Sanitization Help",
        "help.sanitize.content": `
            <p><strong>What is it?</strong><br>
            This tool scans your translation files (Excel/CSV) and identifies lines that look like game code or scripts. It marks them so you don't accidentally translate them, which could break the game.</p>
            
            <p><strong>How to use:</strong></p>
            <ol>
                <li><strong>Add Regex:</strong> Define patterns to match code (e.g., lines starting with <code>&lt;</code> or containing <code>var</code>).</li>
                <li><strong>Select Files:</strong> Choose the folder containing your translation files.</li>
                <li><strong>Start:</strong> The tool will process all files.</li>
            </ol>
            
            <p><strong>Output:</strong><br>
            - <strong>Marked Files:</strong> A ZIP file containing the processed files. Lines matching your regex will have a new column added with the tag <code>【这可能是代码】</code>.<br>
            - <strong>Unmarked Files:</strong> (Optional) Files that had no matches.</p>
        `
    },
    zh: {
        "app.title": "RPG 解包器",
        "tab.decrypt": "解密",
        "tab.encrypt": "加密",
        "tab.restore": "恢复",
        "drop.title": "拖入文件夹",
        "drop.or": "或",
        "btn.selectFolder": "选择文件夹",
        "btn.selectFiles": "选择单个文件",
        "card.settings": "设置",
        "label.decryptKey": "解密密钥",
        "btn.detectKey": "从 System.json 检测",
        "label.targetVer": "目标版本:",
        "check.verifyHeader": "验证/添加伪造头",
        "label.outputMode": "输出模式:",
        "radio.folder": "文件夹 (直接写入)",
        "radio.zip": "ZIP 压缩包",
        "status.ready": "就绪",
        "status.processing": "处理中...",
        "status.done": "完成!",
        "btn.start": "开始",
        "label.log": "处理日志",
        "msg.noFiles": "未选择有效文件。",
        "msg.enterKey": "请输入解密密钥。",
        "msg.workerError": "Worker 错误",
        "msg.saveError": "保存错误",
        "msg.zipDownloaded": "ZIP 已下载。",
        "msg.cancelled": "已取消。",
        "warn.fileProtocol": "警告: 您正在使用 'file://' 协议运行。Web Workers 在此模式下通常会失败。",
        "tooltip.theme": "切换深色/浅色模式",
        "tooltip.lang": "切换语言",
        "help.title": "帮助",
        "help.close": "关闭",
        "help.decryptKey": "解密文件需要密钥。您可以在游戏的 'System.json' 文件中找到它（位于 'www/data/' 或 'data/'）。使用 '检测' 按钮可以自动查找。",
        "help.fakeHeader": "RPG Maker 游戏通常使用伪造的文件头来防止标准工具打开文件。此选项验证并恢复/添加此文件头，以确与游戏引擎的兼容性。",
        "help.outputMode": "选择如何保存处理后的文件。'文件夹' 直接写入磁盘（需要权限）。'ZIP 压缩包' 创建一个压缩文件，对于大量小文件来说更快。",
        "help.targetVer": "选择游戏使用的 RPG Maker 版本。MV 和 MZ 使用略有不同的加密方法。",
        "nav.home": "解封包",
        "nav.postprocess": "翻译后处理",
        "pp.title": "翻译后处理",
        "pp.tab.sanitize": "文本清洗",
        "pp.tab.resegment": "文本重分割",
        "pp.sanitize.desc": "识别并标记疑似代码行，防止误翻译。",
        "pp.input": "输入",
        "pp.regex.title": "正则匹配",
        "btn.downloadMarked": "下载已标记文件",
        "btn.downloadUnmarked": "下载未标记文件",
        "pp.resegment.desc": "根据宽度重新格式化文本，防止溢出。",
        "pp.settings": "设置",
        "pp.preview": "预览",
        "help.sanitize.title": "文本清洗帮助",
        "help.sanitize.content": `
            <p><strong>这是什么？</strong><br>
            此工具扫描您的翻译文件（Excel/CSV），并识别看起来像游戏代码或脚本的行。它会标记这些行，以防您意外翻译它们，从而导致游戏崩溃。</p>
            
            <p><strong>如何使用：</strong></p>
            <ol>
                <li><strong>添加正则：</strong> 定义匹配代码的模式（例如，以 <code>&lt;</code> 开头的行或包含 <code>var</code> 的行）。</li>
                <li><strong>选择文件：</strong> 选择包含翻译文件的文件夹。</li>
                <li><strong>开始：</strong> 工具将处理所有文件。</li>
            </ol>
            
            <p><strong>输出：</strong><br>
            - <strong>已标记文件：</strong> 包含处理后文件的 ZIP 包。匹配正则的行将在新列中添加标签 <code>【这可能是代码】</code>。<br>
            - <strong>未标记文件：</strong> （可选）没有任何匹配项的文件。</p>
        `
    }
};

let currentLang = 'en';

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    updatePage();
    localStorage.setItem('rpg-decrypter-lang', lang);
}

function t(key) {
    return translations[currentLang][key] || key;
}

function updatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            // Handle input placeholders vs text content
            if (el.tagName === 'INPUT' && el.type === 'text') {
                // For text fields, we usually want label, but MD3 uses label attribute or floating label
                // MD3 web components might use 'label' attribute
                if (el.hasAttribute('label')) {
                    el.setAttribute('label', translations[currentLang][key]);
                } else {
                    el.placeholder = translations[currentLang][key];
                }
            } else if (el.tagName.startsWith('MD-')) {
                // Material Web Components
                if (el.hasAttribute('label')) {
                    el.setAttribute('label', translations[currentLang][key]);
                } else {
                    el.textContent = translations[currentLang][key];
                }
            } else {
                el.textContent = translations[currentLang][key];
            }
        }
    });

    // Update tooltips
    document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
        const key = el.getAttribute('data-i18n-tooltip');
        el.title = translations[currentLang][key] || key;
    });
}

// Initialize
const savedLang = localStorage.getItem('rpg-decrypter-lang');
if (savedLang) {
    setLanguage(savedLang);
} else {
    // Auto-detect
    const browserLang = navigator.language.startsWith('zh') ? 'zh' : 'en';
    setLanguage(browserLang);
}

// Export for use in other scripts
window.i18n = {
    setLanguage,
    t,
    currentLang: () => currentLang
};
