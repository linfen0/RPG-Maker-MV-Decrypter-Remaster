/**
 * Batch Processing Logic (M3 UI Version)
 */

var batchFiles = [];
var outputHandle = null;
var isProcessing = false;
var workers = [];
var idleWorkers = [];
var maxWorkers = navigator.hardwareConcurrency || 4;
var processedCount = 0;
var totalCount = 0;
var zipBatch = null;
var currentMode = 'decrypt'; // 'decrypt', 'encrypt', 'restore'
var outputMode = 'folder'; // 'folder', 'zip'

// UI Elements
var ui = {
    tabs: null,
    dropZone: null,
    folderInput: null,
    fileInput: null,
    selectFolderBtn: null,
    selectFilesBtn: null,
    startBtn: null,
    progressBar: null,
    statusText: null,
    fileCount: null,
    logPre: null,
    previewGrid: null,
    decryptCode: null,
    detectKeyBtn: null,
    encryptOptions: null,
    verifyHeader: null,
    themeToggle: null,
    langToggle: null,
    lightbox: null,
    lightboxImg: null,
    closeLightbox: null,
    helpDialog: null,
    helpContent: null,
    closeHelpBtn: null,
    helpKey: null
};

async function initBatch() {
    // Load Home View
    const viewContainer = document.getElementById('view-home-container');
    if (viewContainer) {
        try {
            const response = await fetch('views/home.html');
            if (response.ok) {
                const html = await response.text();
                viewContainer.innerHTML = html;
                // Initialize UI after loading view
                initBatchUI();
            } else {
                console.error('Failed to load home.html');
            }
        } catch (e) {
            console.error('Error loading home.html', e);
        }
    }
}

function initBatchUI() {
    // Bind UI Elements
    ui.tabs = document.getElementById('modeTabs');
    ui.dropZone = document.getElementById('dropZone');
    ui.folderInput = document.getElementById('folderInput');
    ui.fileInput = document.getElementById('fileInput');
    ui.selectFolderBtn = document.getElementById('selectFolderBtn');
    ui.selectFilesBtn = document.getElementById('selectFilesBtn');
    ui.startBtn = document.getElementById('startBatchBtn');
    ui.progressBar = document.getElementById('progressBar');
    ui.statusText = document.getElementById('statusText');
    ui.fileCount = document.getElementById('fileCount');
    ui.logPre = document.getElementById('batchLog');
    ui.previewGrid = document.getElementById('previewGrid');
    ui.decryptCode = document.getElementById('decryptCode');
    ui.detectKeyBtn = document.getElementById('detectKeyBtn');
    ui.encryptOptions = document.getElementById('encryptOptions');
    ui.verifyHeader = document.getElementById('verifyHeader');
    ui.themeToggle = document.getElementById('themeToggle');
    ui.langToggle = document.getElementById('langToggle');
    ui.lightbox = document.getElementById('lightbox');
    ui.lightboxImg = document.getElementById('lightboxImg');
    ui.closeLightbox = document.getElementById('closeLightbox');

    // Help Dialog Elements
    ui.helpDialog = document.getElementById('helpDialog');
    ui.helpContent = document.getElementById('helpContent');
    ui.closeHelpBtn = document.getElementById('closeHelpBtn');
    ui.helpKey = document.getElementById('helpKey');

    // Event Listeners
    if (ui.tabs) ui.tabs.addEventListener('change', handleModeChange);

    if (ui.selectFolderBtn) ui.selectFolderBtn.addEventListener('click', () => ui.folderInput.click());
    if (ui.folderInput) ui.folderInput.addEventListener('change', handleFileSelect);

    if (ui.selectFilesBtn) ui.selectFilesBtn.addEventListener('click', () => ui.fileInput.click());
    if (ui.fileInput) ui.fileInput.addEventListener('change', handleFileSelect);

    if (ui.startBtn) ui.startBtn.addEventListener('click', startBatch);
    if (ui.detectKeyBtn) ui.detectKeyBtn.addEventListener('click', detectKey);
    if (ui.themeToggle) ui.themeToggle.addEventListener('click', toggleTheme);
    if (ui.langToggle) ui.langToggle.addEventListener('click', toggleLang);

    // Lightbox
    if (ui.closeLightbox) ui.closeLightbox.addEventListener('click', () => ui.lightbox.classList.add('hidden'));
    if (ui.lightbox) {
        ui.lightbox.addEventListener('click', (e) => {
            if (e.target === ui.lightbox) ui.lightbox.classList.add('hidden');
        });
    }

    // Help Dialog
    if (ui.closeHelpBtn) ui.closeHelpBtn.addEventListener('click', () => ui.helpDialog.close());
    document.querySelectorAll('.help-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const key = e.currentTarget.getAttribute('data-help');
            ui.helpContent.textContent = window.i18n.t(key);
            ui.helpDialog.show();
        });
    });

    // Drag & Drop
    if (ui.dropZone) {
        ui.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            ui.dropZone.classList.add('drag-over');
        });
        ui.dropZone.addEventListener('dragleave', () => {
            ui.dropZone.classList.remove('drag-over');
        });
        ui.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            ui.dropZone.classList.remove('drag-over');
            handleFileSelect(e);
        });
    }

    // Check for file protocol
    if (window.location.protocol === 'file:') {
        log(window.i18n.t('warn.fileProtocol'));
    }

    updateUIForMode();

    // Initial i18n update
    window.i18n.setLanguage(window.i18n.currentLang());
}

function handleModeChange(e) {
    if (document.getElementById('tab-decrypt').active) currentMode = 'decrypt';
    else if (document.getElementById('tab-encrypt').active) currentMode = 'encrypt';
    else if (document.getElementById('tab-restore').active) currentMode = 'restore';

    updateUIForMode();
}

function updateUIForMode() {
    if (currentMode === 'decrypt') {
        ui.decryptCode.classList.remove('hidden');
        ui.helpKey.classList.remove('hidden');
        ui.encryptOptions.classList.add('hidden');
    } else if (currentMode === 'encrypt') {
        ui.decryptCode.classList.remove('hidden');
        ui.helpKey.classList.remove('hidden');
        ui.encryptOptions.classList.remove('hidden');
    } else if (currentMode === 'restore') {
        ui.decryptCode.classList.add('hidden');
        ui.helpKey.classList.add('hidden');
        ui.encryptOptions.classList.add('hidden');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const icon = ui.themeToggle.querySelector('md-icon');
    icon.textContent = document.body.classList.contains('dark-theme') ? 'light_mode' : 'dark_mode';
}

function toggleLang() {
    const newLang = window.i18n.currentLang() === 'en' ? 'zh' : 'en';
    window.i18n.setLanguage(newLang);
}

function handleFileSelect(e) {
    let files = [];
    if (e.dataTransfer) {
        files = Array.from(e.dataTransfer.files);
    } else {
        files = Array.from(e.target.files);
    }

    batchFiles = files.filter(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        return ['rpgmvp', 'rpgmvm', 'rpgmvo', 'png_', 'ogg_', 'm4a_', 'png', 'ogg', 'm4a'].includes(ext);
    });

    ui.fileCount.textContent = `${batchFiles.length} files selected`; // i18n todo: dynamic count
    log(`Selected ${batchFiles.length} valid files.`);

    ui.progressBar.value = 0;
    processedCount = 0;
    ui.previewGrid.innerHTML = '';
}

function log(msg) {
    ui.logPre.textContent = msg + '\n' + ui.logPre.textContent.substring(0, 1000);
    console.log(msg);
}

function detectKey() {
    document.getElementById('systemFileDetect').click();
}

document.getElementById('systemFileDetect').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Decrypter.detectEncryptionCode(new RPGFile(file, null), 16, (key) => {
        if (key) {
            ui.decryptCode.value = key;
            log(`Key detected: ${key}`);
            alert(`Key found: ${key}`);
        } else {
            alert('Key not found in file.');
        }
    });
});


async function startBatch() {
    if (isProcessing) return;
    if (batchFiles.length === 0) {
        alert(window.i18n.t('msg.noFiles'));
        return;
    }

    const key = ui.decryptCode.value;

    if (currentMode !== 'restore' && !key) {
        alert(window.i18n.t('msg.enterKey'));
        return;
    }

    // Get Output Mode
    const outputRadios = document.getElementsByName('outputMode');
    for (const r of outputRadios) {
        if (r.checked) outputMode = r.value;
    }

    let isMz = false;
    if (currentMode === 'encrypt') {
        const radios = document.getElementsByName('targetVer');
        for (const r of radios) {
            if (r.checked && r.value === 'mz') isMz = true;
        }
    }

    const header = {
        len: 16,
        signature: "5250474d56000000",
        version: "000301",
        remain: "0000000000",
        ignoreFake: !ui.verifyHeader.checked
    };

    isProcessing = true;
    processedCount = 0;
    totalCount = batchFiles.length;
    ui.startBtn.disabled = true;
    ui.statusText.textContent = window.i18n.t('status.processing');

    outputHandle = null;
    zipBatch = null;

    if (outputMode === 'folder') {
        if ('showDirectoryPicker' in window) {
            try {
                outputHandle = await window.showDirectoryPicker();
            } catch (e) {
                log(window.i18n.t('msg.cancelled'));
                isProcessing = false;
                ui.startBtn.disabled = false;
                return;
            }
        } else {
            // Fallback to ZIP if API not supported
            log("File System Access API not supported. Falling back to ZIP.");
            outputMode = 'zip';
        }
    }

    if (outputMode === 'zip') {
        zipBatch = new JSZip();
    }

    workers = [];
    idleWorkers = [];
    for (let i = 0; i < maxWorkers; i++) {
        try {
            const w = new Worker('scripts/worker.js');
            w.onmessage = handleWorkerMessage;
            w.onerror = (e) => log(`${window.i18n.t('msg.workerError')}: ${e.message}`);
            workers.push(w);
            idleWorkers.push(w);
        } catch (e) {
            log(`Failed to create worker: ${e.message}`);
        }
    }

    if (workers.length === 0) {
        alert("Could not create workers. Check console.");
        isProcessing = false;
        ui.startBtn.disabled = false;
        return;
    }

    currentRunConfig = { key, mode: currentMode, header, isMz };
    processQueue();
}

var currentRunConfig = {};

function processQueue() {
    while (idleWorkers.length > 0 && batchFiles.length > 0) {
        const file = batchFiles.shift();
        const worker = idleWorkers.pop();

        worker.postMessage({
            file: file,
            mode: currentRunConfig.mode,
            key: currentRunConfig.key,
            header: currentRunConfig.header,
            isMz: currentRunConfig.isMz,
            relativePath: file.webkitRelativePath || file.name
        });
    }

    if (batchFiles.length === 0 && idleWorkers.length === workers.length) {
        finishBatch();
    }
}

async function handleWorkerMessage(e) {
    const data = e.data;
    const worker = e.target;

    if (data.status === 'success') {
        if (outputMode === 'folder' && outputHandle) {
            await saveFileToDisk(data.blob, data.relativePath, data.fileName);
        } else if (zipBatch) {
            const pathParts = data.relativePath.split('/');
            pathParts.pop();
            pathParts.push(data.fileName);
            zipBatch.file(pathParts.join('/'), data.blob);
        }

        if (data.fileName.endsWith('.png')) {
            addPreview(data.blob, data.fileName, data.relativePath);
        }

        processedCount++;
    } else {
        log(`Error: ${data.fileName} - ${data.error}`);
        processedCount++;
    }

    const percent = totalCount > 0 ? (processedCount / totalCount) : 0;
    ui.progressBar.value = percent;
    ui.statusText.textContent = `${window.i18n.t('status.processing')} ${processedCount}/${totalCount}`;

    idleWorkers.push(worker);
    processQueue();
}

async function saveFileToDisk(blob, relativePath, fileName) {
    if (!outputHandle) return;
    try {
        const pathParts = relativePath.split('/');
        pathParts.pop();
        pathParts.push(fileName);

        let current = outputHandle;
        for (let i = 0; i < pathParts.length - 1; i++) {
            // Skip empty parts if any
            if (!pathParts[i]) continue;
            current = await current.getDirectoryHandle(pathParts[i], { create: true });
        }
        const fileHandle = await current.getFileHandle(pathParts[pathParts.length - 1], { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    } catch (e) {
        log(`${window.i18n.t('msg.saveError')}: ${e}`);
    }
}

function addPreview(blob, name, relativePath) {
    // Determine directory
    const pathParts = relativePath.split('/');
    pathParts.pop(); // remove filename
    const dirName = pathParts.length > 0 ? pathParts.join('/') : 'Root';

    // Find or create directory section
    let dirSection = document.getElementById(`dir-${dirName}`);
    if (!dirSection) {
        dirSection = document.createElement('div');
        dirSection.id = `dir-${dirName}`;
        dirSection.className = 'directory-group';

        const header = document.createElement('div');
        header.className = 'directory-header';
        header.textContent = dirName;

        const items = document.createElement('div');
        items.className = 'directory-items';

        dirSection.appendChild(header);
        dirSection.appendChild(items);
        ui.previewGrid.appendChild(dirSection);
    }

    const itemsContainer = dirSection.querySelector('.directory-items');

    const card = document.createElement('div');
    card.className = 'preview-card';

    const img = document.createElement('img');
    img.className = 'preview-image';
    const url = URL.createObjectURL(blob);
    img.src = url;

    const info = document.createElement('div');
    info.className = 'preview-info';
    info.textContent = name;
    info.title = name;

    card.appendChild(img);
    card.appendChild(info);

    // Lightbox event
    card.addEventListener('click', () => {
        ui.lightboxImg.src = url;
        ui.lightbox.classList.remove('hidden');
    });

    itemsContainer.appendChild(card);
}

function finishBatch() {
    isProcessing = false;
    ui.startBtn.disabled = false;
    ui.statusText.textContent = window.i18n.t('status.done');
    log(window.i18n.t('status.done'));

    workers.forEach(w => w.terminate());
    workers = [];

    if (zipBatch) {
        log("Generating ZIP...");
        zipBatch.generateAsync({ type: "blob" }).then(content => {
            saveAs(content, "batch_output.zip");
            log(window.i18n.t('msg.zipDownloaded'));
        });
    }
}

window.addEventListener('load', initBatch);
