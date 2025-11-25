/**
 * Translation Post-processing Logic
 */

const ppState = {
    sanitizeFiles: [],
    resegmentFiles: [],
    workers: [],
    regexManager: null,
    isProcessing: false
};

// Initialize Post-processing
document.addEventListener('DOMContentLoaded', () => {
    initPostProcessing();
    initNavigation();
});

async function initPostProcessing() {
    // Load View
    const viewContainer = document.getElementById('view-postprocess');
    try {
        const response = await fetch('views/post_process.html');
        if (response.ok) {
            const html = await response.text();
            viewContainer.innerHTML = html;

            // Init Regex Manager
            ppState.regexManager = new RegexManager('regexManagerContainer');

            bindPPEvents();
        } else {
            console.error('Failed to load post_process.html');
        }
    } catch (e) {
        console.error('Error loading post_process.html', e);
    }

    // Init Worker
    // Init Worker Pool
    const maxWorkers = navigator.hardwareConcurrency || 4;
    ppState.workers = [];
    for (let i = 0; i < maxWorkers; i++) {
        const worker = new Worker('scripts/post_process_worker.js');
        worker.onmessage = handlePPWorkerMessage;
        ppState.workers.push(worker);
    }
}

function initNavigation() {
    const drawer = document.getElementById('navDrawer');
    const overlay = document.getElementById('drawerOverlay');
    const menuBtn = document.getElementById('menuBtn'); // Updated ID from top-app-bar
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const navHome = document.getElementById('nav-home');
    const navPP = document.getElementById('nav-postprocess');

    // Toggle Drawer
    function toggleDrawer(show) {
        if (show) {
            drawer.classList.add('open');
            overlay.classList.remove('hidden');
            setTimeout(() => overlay.style.opacity = '1', 10);
        } else {
            drawer.classList.remove('open');
            overlay.style.opacity = '0';
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    }

    if (menuBtn) menuBtn.addEventListener('click', () => toggleDrawer(true));
    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', () => toggleDrawer(false));
    if (overlay) overlay.addEventListener('click', () => toggleDrawer(false));

    // Navigation
    navHome.addEventListener('click', () => {
        switchView('home');
        toggleDrawer(false);
        navHome.classList.add('active');
        navPP.classList.remove('active');
    });

    navPP.addEventListener('click', () => {
        switchView('postprocess');
        toggleDrawer(false);
        navPP.classList.add('active');
        navHome.classList.remove('active');
    });
}

function switchView(viewName) {
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active', 'hidden'));
    document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

    const target = document.getElementById(`view-${viewName}`);
    if (target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
}

function bindPPEvents() {
    // Tabs
    const tabs = document.getElementById('ppTabs');
    if (tabs) {
        tabs.addEventListener('change', () => {
            const isSanitize = document.getElementById('tab-sanitize').active;
            document.getElementById('view-sanitize').classList.toggle('hidden', !isSanitize);
            document.getElementById('view-resegment').classList.toggle('hidden', isSanitize);
        });
    }

    // --- Regex Manager Events ---
    const btnAddRegex = document.getElementById('btnAddRegex');
    if (btnAddRegex) btnAddRegex.addEventListener('click', () => ppState.regexManager.addRegex());

    const btnExportRegex = document.getElementById('btnExportRegex');
    if (btnExportRegex) btnExportRegex.addEventListener('click', () => ppState.regexManager.exportSettings());

    const btnImportRegex = document.getElementById('btnImportRegex');
    const regexImportInput = document.getElementById('regexImportInput');
    if (btnImportRegex && regexImportInput) {
        btnImportRegex.addEventListener('click', () => regexImportInput.click());
        regexImportInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                ppState.regexManager.importSettings(e.target.files[0]);
                e.target.value = ''; // Reset
            }
        });
    }

    // --- Sanitization ---
    const sanitizeInput = document.getElementById('ppSanitizeInput');
    const sanitizeSelectBtn = document.getElementById('ppSanitizeSelectBtn');

    if (sanitizeSelectBtn) sanitizeSelectBtn.addEventListener('click', () => sanitizeInput.click());
    if (sanitizeInput) {
        sanitizeInput.addEventListener('change', (e) => {
            ppState.sanitizeFiles = Array.from(e.target.files).filter(f => f.name.match(/\.(xlsx|csv)$/i));
            document.getElementById('ppSanitizeFileCount').textContent = `${ppState.sanitizeFiles.length} files selected`;
        });
    }

    const btnStartSanitize = document.getElementById('ppSanitizeStartBtn');
    if (btnStartSanitize) btnStartSanitize.addEventListener('click', startSanitization);

    // --- Re-segmentation ---
    const resegmentInput = document.getElementById('ppResegmentInput');
    const resegmentSelectBtn = document.getElementById('ppResegmentSelectBtn');

    if (resegmentSelectBtn) resegmentSelectBtn.addEventListener('click', () => resegmentInput.click());
    if (resegmentInput) {
        resegmentInput.addEventListener('change', (e) => {
            ppState.resegmentFiles = Array.from(e.target.files).filter(f => f.name.match(/\.(txt|json|csv|xlsx)$/i)); // Broaden support?
            document.getElementById('ppResegmentFileCount').textContent = `${ppState.resegmentFiles.length} files selected`;
        });
    }

    const btnStartResegment = document.getElementById('ppResegmentStartBtn');
    if (btnStartResegment) btnStartResegment.addEventListener('click', startResegmentation);

    // Preview
    const previewInput = document.getElementById('ppPreviewInput');
    if (previewInput) previewInput.addEventListener('input', debounce(updatePreview, 500));
}

function startSanitization() {
    if (ppState.sanitizeFiles.length === 0) return alert('No files selected');

    const regexList = ppState.regexManager.getActiveRegexes();

    document.getElementById('ppSanitizeLog').textContent = 'Starting sanitization...\n';

    // Init ZIP and counters
    ppState.zip = new JSZip();
    ppState.processedCount = 0;
    ppState.totalFiles = ppState.sanitizeFiles.length;

    ppState.sanitizeFiles.forEach((file, index) => {
        const worker = ppState.workers[index % ppState.workers.length];
        worker.postMessage({
            action: 'sanitize',
            file: file,
            regexList: regexList
        });
    });
}

function startResegmentation() {
    if (ppState.resegmentFiles.length === 0) return alert('No files selected');

    const maxWidth = parseInt(document.getElementById('ppMaxWidth').value) || 30;
    const locale = navigator.language || 'zh-CN';

    document.getElementById('ppResegmentLog').textContent = 'Starting re-segmentation...\n';

    ppState.resegmentFiles.forEach((file, index) => {
        const worker = ppState.workers[index % ppState.workers.length];
        worker.postMessage({
            action: 'resegment',
            file: file,
            maxWidth: maxWidth,
            locale: locale
        });
    });
}

function handlePPWorkerMessage(e) {
    const data = e.data;
    if (data.status === 'error') {
        logPP(data.action, `Error processing ${data.fileName}: ${data.error}`);
        ppState.processedCount++;
        checkCompletion(data.action);
    } else if (data.status === 'success') {
        if (data.action === 'sanitize') {
            logPP('sanitize', `Processed ${data.fileName}. Changes: ${data.hasChanges}`);

            if (data.hasChanges) {
                // Find original file object to get path
                const originalFile = ppState.sanitizeFiles.find(f => f.name === data.fileName);
                const zipPath = originalFile && originalFile.webkitRelativePath ? originalFile.webkitRelativePath : data.fileName;
                ppState.zip.file(zipPath, data.markedBlob);
            }

            ppState.processedCount++;
            checkCompletion('sanitize');

        } else if (data.action === 'resegment') {
            logPP('resegment', `Processed ${data.fileName}`);
            saveAs(data.blob, `RESEG_${data.fileName}`);
        }
    }
}

function checkCompletion(action) {
    if (action === 'sanitize' && ppState.processedCount === ppState.totalFiles) {
        logPP('sanitize', 'All files processed.');

        if (Object.keys(ppState.zip.files).length > 0) {
            logPP('sanitize', 'Generating ZIP...');
            ppState.zip.generateAsync({ type: "blob" })
                .then(function (content) {
                    saveAs(content, "Sanitized_Files.zip");
                    logPP('sanitize', 'ZIP downloaded.');
                });
        } else {
            logPP('sanitize', 'No files were modified, so no ZIP was generated.');
        }
    }
}

function logPP(action, msg) {
    const logEl = document.getElementById(action === 'sanitize' ? 'ppSanitizeLog' : 'ppResegmentLog');
    if (logEl) logEl.textContent += msg + '\n';
}

// Preview Logic (Client-side simulation)
function updatePreview() {
    const text = document.getElementById('ppPreviewInput').value;
    const maxWidth = parseInt(document.getElementById('ppMaxWidth').value) || 30;
    const locale = navigator.language || 'zh-CN';

    // Reuse logic? Ideally worker, but for preview sync is better or fast async
    // Let's just send to worker for consistency

    // Mock file
    const file = new File([text], "preview.txt", { type: "text/plain" });

    // We need a way to handle preview response distinct from batch
    // For now, let's duplicate logic lightly here or use a dedicated preview action
    // But to ensure 1:1 match, worker is best.

    // Simplified client-side for responsiveness (using same logic structure)
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    const tagRegex = /(<[^>]+>|\\N\[\d+\]|\\C\[\d+\]|\{[^\}]+\})/g;

    const lines = text.split(/\r?\n/);
    let result = "";

    for (let line of lines) {
        if (line.includes('【这可能是代码】')) {
            result += line + '\n';
            continue;
        }
        let currentWidth = 0;
        let currentLine = "";
        const tokens = line.split(tagRegex);

        for (let token of tokens) {
            if (!token) continue;
            if (tagRegex.test(token)) {
                currentLine += token;
            } else {
                const segments = segmenter.segment(token);
                for (const seg of segments) {
                    const word = seg.segment;
                    const wordWidth = getWidth(word);
                    if (currentWidth + wordWidth > maxWidth) {
                        if (currentLine.length > 0) {
                            result += currentLine + '\n';
                            currentLine = "";
                            currentWidth = 0;
                        }
                        currentLine += word;
                        currentWidth += wordWidth;
                    } else {
                        currentLine += word;
                        currentWidth += wordWidth;
                    }
                }
            }
        }
        if (currentLine.length > 0) result += currentLine + '\n';
    }

    document.getElementById('ppPreviewOutput').textContent = result;
}

function getWidth(str) {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code > 255) width += 2;
        else width += 1;
    }
    return width;
}

function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}
