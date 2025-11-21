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
    themeToggle: null
};

function initBatch() {
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

    // Event Listeners
    ui.tabs.addEventListener('change', handleModeChange);

    ui.selectFolderBtn.addEventListener('click', () => ui.folderInput.click());
    ui.folderInput.addEventListener('change', handleFileSelect);

    ui.selectFilesBtn.addEventListener('click', () => ui.fileInput.click());
    ui.fileInput.addEventListener('change', handleFileSelect);

    ui.startBtn.addEventListener('click', startBatch);
    ui.detectKeyBtn.addEventListener('click', detectKey);
    ui.themeToggle.addEventListener('click', toggleTheme);

    // Drag & Drop
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
        handleFileSelect(e); // Reuse logic, might need adaptation for DataTransfer items
    });

    // Check for file protocol
    if (window.location.protocol === 'file:') {
        log("WARNING: You are running this via 'file://' protocol. Web Workers usually fail in this mode.");
    }

    updateUIForMode();
}

function handleModeChange(e) {
    // md-tabs emits change event, but we check active tab
    if (document.getElementById('tab-decrypt').active) currentMode = 'decrypt';
    else if (document.getElementById('tab-encrypt').active) currentMode = 'encrypt';
    else if (document.getElementById('tab-restore').active) currentMode = 'restore';

    updateUIForMode();
}

function updateUIForMode() {
    // Reset UI state based on mode
    if (currentMode === 'decrypt') {
        ui.decryptCode.classList.remove('hidden');
        ui.encryptOptions.classList.add('hidden');
    } else if (currentMode === 'encrypt') {
        ui.decryptCode.classList.remove('hidden'); // Encrypt also needs key usually? Or just for re-encrypt?
        // Original tool: Encrypt needs key if re-encrypting? The original tool logic says:
        // "Get the En/Decrypt-Code." for both.
        ui.encryptOptions.classList.remove('hidden');
    } else if (currentMode === 'restore') {
        ui.decryptCode.classList.add('hidden');
        ui.encryptOptions.classList.add('hidden');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const icon = ui.themeToggle.querySelector('md-icon');
    icon.textContent = document.body.classList.contains('dark-theme') ? 'light_mode' : 'dark_mode';
}

function handleFileSelect(e) {
    let files = [];
    if (e.dataTransfer) {
        // Drag & Drop
        // Note: recursive directory traversal for DnD is complex, simpler to just take files for now
        // or use webkitGetAsEntry. For this demo, let's stick to flat files from DnD or use input
        // If user drops a folder, 'files' list might be empty or contain the folder as a file with size 0 (browser dependent)
        // For robust folder drop, we need FileSystemEntry API.
        // Let's support basic file drop for now.
        files = Array.from(e.dataTransfer.files);
    } else {
        files = Array.from(e.target.files);
    }

    // Filter files
    batchFiles = files.filter(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        return ['rpgmvp', 'rpgmvm', 'rpgmvo', 'png_', 'ogg_', 'm4a_', 'png', 'ogg', 'm4a'].includes(ext);
    });

    ui.fileCount.textContent = `${batchFiles.length} files selected`;
    log(`Selected ${batchFiles.length} valid files.`);

    // Reset Progress
    ui.progressBar.value = 0;
    processedCount = 0;
    ui.previewGrid.innerHTML = ''; // Clear previews
}

function log(msg) {
    ui.logPre.textContent = msg + '\n' + ui.logPre.textContent.substring(0, 1000);
    console.log(msg);
}

function detectKey() {
    document.getElementById('systemFileDetect').click();
}

// Setup detect listener
document.getElementById('systemFileDetect').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Use existing Decrypter logic (need to adapt since it was tightly coupled to DOM)
    // We can use Decrypter.detectEncryptionCode directly
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
        alert("No valid files selected.");
        return;
    }

    const key = ui.decryptCode.value;

    // Validation
    if (currentMode !== 'restore' && !key) {
        alert("Please enter a Decryption Key.");
        return;
    }

    // Config
    let isMz = false;
    if (currentMode === 'encrypt') {
        // Get radio value from M3 radio group
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
    ui.statusText.textContent = "Processing...";

    // Output handling (ZIP fallback for now as showDirectoryPicker needs HTTPS/Localhost and user interaction)
    // We will try showDirectoryPicker if available, else ZIP.
    outputHandle = null;
    zipBatch = null;

    if ('showDirectoryPicker' in window) {
        try {
            outputHandle = await window.showDirectoryPicker();
        } catch (e) {
            log("Output folder selection cancelled. Using ZIP fallback.");
        }
    }

    if (!outputHandle) {
        zipBatch = new JSZip();
    }

    // Workers
    workers = [];
    idleWorkers = [];
    for (let i = 0; i < maxWorkers; i++) {
        try {
            const w = new Worker('scripts/worker.js');
            w.onmessage = handleWorkerMessage;
            w.onerror = (e) => log(`Worker Error: ${e.message}`);
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

    processQueue(key, currentMode, header, isMz);
}

function processQueue(key, mode, header, isMz) {
    while (idleWorkers.length > 0 && batchFiles.length > 0) {
        const file = batchFiles.shift();
        const worker = idleWorkers.pop();

        worker.postMessage({
            file: file,
            mode: mode,
            key: key,
            header: header,
            isMz: isMz,
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
        // Save
        if (outputHandle) {
            await saveFileToDisk(data.blob, data.relativePath, data.fileName);
        } else if (zipBatch) {
            const pathParts = data.relativePath.split('/');
            pathParts.pop();
            pathParts.push(data.fileName);
            zipBatch.file(pathParts.join('/'), data.blob);
        }

        // Preview (only for images)
        if (data.fileName.endsWith('.png')) {
            addPreview(data.blob, data.fileName);
        }

        processedCount++;
    } else {
        log(`Error: ${data.fileName} - ${data.error}`);
        processedCount++;
    }

    // Update Progress
    const percent = totalCount > 0 ? (processedCount / totalCount) : 0;
    ui.progressBar.value = percent;
    ui.statusText.textContent = `Processed ${processedCount}/${totalCount}`;

    // Return worker
    idleWorkers.push(worker);

    // Continue (need to pass config again, store in closure or global)
    // For simplicity, grabbing from UI/Global state which hasn't changed
    const key = ui.decryptCode.value;
    // ... re-read config or pass it through. 
    // Let's assume config is static during run.
    // We need the same args as startBatch. 
    // Refactor: store config in `currentRunConfig`
    processQueue(currentRunConfig.key, currentRunConfig.mode, currentRunConfig.header, currentRunConfig.isMz);
}

// Store config for the current batch run
var currentRunConfig = {};

// Wrap startBatch to set config
const originalStartBatch = startBatch;
startBatch = async function () {
    // ... (validation) ...
    if (isProcessing) return;
    if (batchFiles.length === 0) {
        alert("No valid files selected.");
        return;
    }

    const key = ui.decryptCode.value;
    if (currentMode !== 'restore' && !key) {
        alert("Please enter a Decryption Key.");
        return;
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

    currentRunConfig = { key, mode: currentMode, header, isMz };

    isProcessing = true;
    processedCount = 0;
    totalCount = batchFiles.length;
    ui.startBtn.disabled = true;
    ui.statusText.textContent = "Processing...";

    outputHandle = null;
    zipBatch = null;

    if ('showDirectoryPicker' in window) {
        try {
            outputHandle = await window.showDirectoryPicker();
        } catch (e) {
            log("Output folder selection cancelled. Using ZIP fallback.");
        }
    }

    if (!outputHandle) {
        zipBatch = new JSZip();
    }

    workers = [];
    idleWorkers = [];
    for (let i = 0; i < maxWorkers; i++) {
        try {
            const w = new Worker('scripts/worker.js');
            w.onmessage = handleWorkerMessage;
            w.onerror = (e) => log(`Worker Error: ${e.message}`);
            workers.push(w);
            idleWorkers.push(w);
        } catch (e) {
            log(`Failed to create worker: ${e.message}`);
        }
    }

    processQueue(key, currentMode, header, isMz);
};


async function saveFileToDisk(blob, relativePath, fileName) {
    if (!outputHandle) return;
    try {
        const pathParts = relativePath.split('/');
        pathParts.pop();
        pathParts.push(fileName);

        // Recursive handle get
        let current = outputHandle;
        for (let i = 0; i < pathParts.length - 1; i++) {
            current = await current.getDirectoryHandle(pathParts[i], { create: true });
        }
        const fileHandle = await current.getFileHandle(pathParts[pathParts.length - 1], { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    } catch (e) {
        log(`Save Error: ${e}`);
    }
}

function addPreview(blob, name) {
    const card = document.createElement('div');
    card.className = 'preview-card';

    const img = document.createElement('img');
    img.className = 'preview-image';
    img.src = URL.createObjectURL(blob);

    const info = document.createElement('div');
    info.className = 'preview-info';
    info.textContent = name;
    info.title = name;

    card.appendChild(img);
    card.appendChild(info);
    ui.previewGrid.appendChild(card);
}

function finishBatch() {
    isProcessing = false;
    ui.startBtn.disabled = false;
    ui.statusText.textContent = "Done!";
    log("Batch processing complete.");

    workers.forEach(w => w.terminate());
    workers = [];

    if (zipBatch) {
        log("Generating ZIP...");
        zipBatch.generateAsync({ type: "blob" }).then(content => {
            saveAs(content, "batch_output.zip");
            log("ZIP downloaded.");
        });
    }
}

// Init
window.addEventListener('load', initBatch);
