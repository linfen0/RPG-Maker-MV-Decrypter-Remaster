/**
 * Worker for Batch Processing
 */

// Polyfills for Worker environment
self.window = self;
self.document = {
    createElement: function () { return {}; } // Mock for safety
};

importScripts('../libs/lz-string.min.js', 'ErrorException.js', 'RPGFile.js', 'Decrypter.js');

// Override createBlobUrl to avoid window.URL usage and just keep the content
RPGFile.prototype.createBlobUrl = function (toNormal) {
    // Create the Blob to be sent back to the main thread
    this.blob = new Blob([this.content], { type: this.getMimeType(toNormal) });
};

self.onmessage = function (e) {
    var data = e.data;
    var file = data.file;
    var mode = data.mode; // 'decrypt', 'encrypt', 'restore'
    var key = data.key;
    var header = data.header; // { len, signature, version, remain, ignoreFake }

    var rpgFile = new RPGFile(file, null);
    rpgFile.rpgMakerMz = data.isMz;

    var decrypter = new Decrypter(key);
    if (header) {
        decrypter.ignoreFakeHeader = header.ignoreFake;
        decrypter.headerLen = header.len;
        decrypter.signature = header.signature;
        decrypter.version = header.version;
        decrypter.remain = header.remain;
    }

    var callback = function (rpgFile, err) {
        if (err) {
            self.postMessage({ status: 'error', error: err.toString(), fileName: file.name, relativePath: data.relativePath });
        } else {
            // Rename file extension
            if (mode === 'decrypt' || mode === 'restore') {
                rpgFile.convertExtension(true);
            } else if (mode === 'encrypt') {
                rpgFile.convertExtension(false);
            }

            // Send back the processed blob and the original file name/path info
            self.postMessage({
                status: 'success',
                blob: rpgFile.blob,
                fileName: rpgFile.name + '.' + rpgFile.extension,
                originalName: file.name,
                relativePath: data.relativePath
            });
        }
    };

    try {
        console.log("working");
        if (mode === 'decrypt') {
            decrypter.decryptFile(rpgFile, callback);
        } else if (mode === 'encrypt') {
            decrypter.encryptFile(rpgFile, callback);
        } else if (mode === 'restore') {
            console.log("process" + rpgFile);
            decrypter.restoreHeader(rpgFile, callback);
        } else {
            self.postMessage({ status: 'error', error: 'Unknown mode: ' + mode, fileName: file.name });
        }
    } catch (err) {
        self.postMessage({ status: 'error', error: err.toString(), fileName: file.name, relativePath: data.relativePath });
    }
};
