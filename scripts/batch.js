/**
 * Batch Processing Logic
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
var batchLogEl = null;

function initBatch() {
    var sourceInput = document.getElementById('batchSource');
    var outputBtn = document.getElementById('batchOutputBtn');
    var startBtn = document.getElementById('startBatchBtn');
    batchLogEl = document.getElementById('batchLog');

    if (sourceInput) sourceInput.addEventListener('change', handleFolderSelect, false);
    if (outputBtn) outputBtn.addEventListener('click', selectOutputFolder, false);
    if (startBtn) startBtn.addEventListener('click', startBatch, false);

    // Mode Change Listener
    var modeRadios = document.getElementsByName('batchMode');
    for (var i = 0; i < modeRadios.length; i++) {
        modeRadios[i].addEventListener('change', updateBatchUI, false);
    }
    updateBatchUI();

    // Check support
    if (!('showDirectoryPicker' in window)) {
        if (outputBtn) outputBtn.style.display = 'none';
        var info = document.getElementById('batchOutputInfo');
        if (info) info.innerText = "Browser doesn't support direct folder saving. Output will be a ZIP file.";
    }
}

function updateBatchUI() {
    var mode = document.querySelector('input[name="batchMode"]:checked').value;
    var encryptOptions = document.getElementById('batchEncryptOptions');
    if (encryptOptions) {
        if (mode === 'encrypt') {
            encryptOptions.style.display = 'block';
        } else {
            encryptOptions.style.display = 'none';
        }
    }
}

function log(msg) {
    if (batchLogEl) {
        batchLogEl.innerText = msg + '\n' + batchLogEl.innerText.substring(0, 1000);
    }
    console.log(msg);
}

function handleFolderSelect(e) {
    var files = e.target.files;
    batchFiles = [];

    // Reset UI
    document.getElementById('batchTotalCount').innerText = '0';
    document.getElementById('batchProgressBar').style.width = '0%';
    document.getElementById('batchProgressBar').innerText = '0%';

    var count = 0;
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var ext = f.name.split('.').pop().toLowerCase();
        // Basic filter
        if (['rpgmvp', 'rpgmvm', 'rpgmvo', 'png_', 'ogg_', 'm4a_', 'png', 'ogg', 'm4a'].indexOf(ext) !== -1) {
            batchFiles.push(f);
            count++;
        }
    }

    document.getElementById('batchTotalCount').innerText = count;
    log('Selected ' + count + ' supported files.');
}

async function selectOutputFolder() {
    try {
        outputHandle = await window.showDirectoryPicker();
        document.getElementById('batchOutputInfo').innerText = "Selected: " + outputHandle.name;
        log('Output folder selected: ' + outputHandle.name);
    } catch (e) {
        log('Folder selection cancelled or failed: ' + e);
    }
}

async function getFileHandleRecursive(root, path, create) {
    var parts = path.split('/');
    var current = root;
    for (var i = 0; i < parts.length - 1; i++) {
        current = await current.getDirectoryHandle(parts[i], { create: create });
    }
    return await current.getFileHandle(parts[parts.length - 1], { create: create });
}

async function saveFileToDisk(blob, relativePath, fileName) {
    if (!outputHandle) return;

    // relativePath includes the filename, e.g. "Folder/Sub/File.ext"
    // We want to preserve the structure.
    // Note: webkitRelativePath usually starts with the selected folder name.

    try {
        // Construct full path for output
        // We replace the filename in relativePath with the new fileName (which has correct extension)
        var pathParts = relativePath.split('/');
        pathParts.pop(); // remove old filename
        pathParts.push(fileName); // add new filename
        var fullPath = pathParts.join('/');

        var fileHandle = await getFileHandleRecursive(outputHandle, fullPath, true);
        var writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
    } catch (e) {
        log('Error saving file ' + fileName + ': ' + e);
    }
}

function startBatch() {
    if (isProcessing) return;
    if (batchFiles.length === 0) {
        alert("No valid files selected.");
        return;
    }

    // Get Settings
    var key = document.getElementById('decryptCode').value;
    var mode = document.querySelector('input[name="batchMode"]:checked').value;
    var isMz = false; // Detect or ask user? Existing tool has buttons for MV/MZ encrypt.
    // For decrypt, it auto-detects or uses key.
    // For encrypt, we need to know target format.
    // Let's add a radio for MZ/MV in the batch UI or infer.
    // For now, let's assume MV default or add a UI option.
    // Actually, let's look at existing UI. It has "Encrypt MV" and "Encrypt MZ" buttons.
    // I will add a radio group for Target Version if Encrypting.

    if (mode === 'encrypt') {
        var targetVer = document.querySelector('input[name="batchTargetVer"]:checked');
        isMz = targetVer && targetVer.value === 'mz';
    }

    // Header Settings
    var header = null;
    var verifyHeader = !document.querySelector('input[name="checkFakeHeader"][value="0"]').checked;
    if (verifyHeader || mode === 'encrypt') {
        header = {
            len: parseInt(document.getElementById('headerLen').value) || 16,
            signature: document.getElementById('signature').value || "5250474d56000000",
            version: document.getElementById('version').value || "000301",
            remain: document.getElementById('remain').value || "0000000000",
            ignoreFake: !verifyHeader
        };
    } else {
        header = { ignoreFake: true };
    }

    // Validate Key
    if (mode !== 'restore' && !key) {
        alert("Please enter a Decryption Code first!");
        return;
    }

    isProcessing = true;
    processedCount = 0;
    totalCount = batchFiles.length;

    // Init Zip if no output handle
    if (!outputHandle) {
        zipBatch = new JSZip();
    }

    // Setup Workers
    workers = [];
    idleWorkers = [];
    for (var i = 0; i < maxWorkers; i++) {
        var w = new Worker('scripts/worker.js');
        w.onmessage = handleWorkerMessage;
        workers.push(w);
        idleWorkers.push(w);
    }

    log('Starting batch processing with ' + maxWorkers + ' workers...');
    processQueue(key, mode, header, isMz);
}

function processQueue(key, mode, header, isMz) {
    while (idleWorkers.length > 0 && batchFiles.length > 0) {
        var file = batchFiles.shift();
        var worker = idleWorkers.pop();

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
    var data = e.data;
    var worker = e.target;

    if (data.status === 'success') {
        if (outputHandle) {
            await saveFileToDisk(data.blob, data.relativePath, data.fileName);
        } else if (zipBatch) {
            // Add to zip
            // Adjust path
            var pathParts = data.relativePath.split('/');
            pathParts.pop();
            pathParts.push(data.fileName);
            var fullPath = pathParts.join('/');
            zipBatch.file(fullPath, data.blob);
        }
        processedCount++;
    } else {
        log('Error processing ' + data.fileName + ': ' + data.error);
        processedCount++; // Count errors as processed to finish
    }

    // Update UI
    var percent = Math.floor((processedCount / totalCount) * 100);
    document.getElementById('batchProgressBar').style.width = percent + '%';
    document.getElementById('batchProgressBar').innerText = percent + '%';

    // Return worker to pool
    idleWorkers.push(worker);

    // Continue
    // We need to pass the same config. 
    // I'll store the current config in a global or closure. 
    // For simplicity, I'll just grab it from DOM again or rely on the fact that processQueue calls are synchronous in the loop, 
    // but here we are in a callback.
    // Actually, I should store the current batch config.
    // Let's just pass nulls and let processQueue pick them up? No, processQueue needs args.
    // I will make `currentBatchConfig` global.
    processQueue(currentBatchConfig.key, currentBatchConfig.mode, currentBatchConfig.header, currentBatchConfig.isMz);
}

var currentBatchConfig = {};

// Override startBatch to set config
var originalStartBatch = startBatch;
startBatch = function () {
    // ... (validation code from above) ...
    // Copy-paste validation logic here or refactor.
    // Refactoring for clarity:

    if (isProcessing) { log("processing"); return };
    if (batchFiles.length === 0) {
        alert("No valid files Selected.");
        return;
    }

    var key = document.getElementById('decryptCode').value;
    var mode = document.querySelector('input[name="batchMode"]:checked').value;
    var isMz = false;

    if (mode === 'encrypt') {
        var targetVer = document.querySelector('input[name="batchTargetVer"]:checked');
        isMz = targetVer && targetVer.value === 'mz';
    }

    var header = null;
    var verifyHeader = !document.querySelector('input[name="checkFakeHeader"][value="0"]').checked;
    if (verifyHeader || mode === 'encrypt') {
        header = {
            len: parseInt(document.getElementById('headerLen').value) || 16,
            signature: document.getElementById('signature').value || "5250474d56000000",
            version: document.getElementById('version').value || "000301",
            remain: document.getElementById('remain').value || "0000000000",
            ignoreFake: !verifyHeader
        };
    } else {
        header = { ignoreFake: true };
    }

    if (mode !== 'restore' && !key) {
        alert("Please enter a Decryption Code first!");
        return;
    }

    isProcessing = true;
    processedCount = 0;
    totalCount = batchFiles.length;

    if (!outputHandle) {
        zipBatch = new JSZip();
    }

    // Check for file protocol
    if (window.location.protocol === 'file:') {
        log("WARNING: You are running this via 'file://' protocol. Web Workers usually fail in this mode due to browser security restrictions. Please run this via a local server (e.g. 'python -m http.server' or VS Code Live Server).");
    }

    workers = [];
    idleWorkers = [];
    for (var i = 0; i < maxWorkers; i++) {
        try {
            log("worker added " + i);
            var w = new Worker('scripts/worker.js');
            w.onerror = function (e) {
                log("Worker Error: " + (e.message || "Unknown error. (If using file://, this is expected)"));
            };
            w.onmessage = handleWorkerMessage;
            workers.push(w);
            idleWorkers.push(w);
        } catch (e) {
            log("Failed to create Worker: " + e.message);
            alert("Failed to create Web Worker. If you are using 'file://', please use a local server.");
            isProcessing = false;
            return;
        }
    }

    currentBatchConfig = { key: key, mode: mode, header: header, isMz: isMz };

    log('Starting batch processing...');
    processQueue(key, mode, header, isMz);
}

function finishBatch() {
    isProcessing = false;
    log('Batch processing complete.');

    // Terminate workers
    for (var i = 0; i < workers.length; i++) {
        workers[i].terminate();
    }
    workers = [];
    idleWorkers = [];

    if (zipBatch) {
        log('Generating ZIP file...');
        zipBatch.generateAsync({ type: "blob" }).then(function (content) {
            saveAs(content, "batch_output.zip");
            log('ZIP file downloaded.');
            zipBatch = null;
        });
    } else {
        alert("Batch processing complete!");
    }
}
