/**
 * Worker for Translation Post-processing
 */

// Polyfills
self.window = self;

importScripts('../libs/xlsx.full.min.js');

self.onmessage = function (e) {
    const data = e.data;
    const action = data.action;

    try {
        if (action === 'sanitize') {
            sanitizeFile(data.file, data.regexList);
        } else if (action === 'resegment') {
            resegmentFile(data.file, data.maxWidth, data.locale);
        } else {
            throw new Error('Unknown action: ' + action);
        }
    } catch (err) {
        self.postMessage({
            status: 'error',
            error: err.toString(),
            fileName: data.file.name
        });
    }
};
//sanitizeFile
function sanitizeFile(file, regexList) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to array of arrays
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

            const markedRows = [];
            let hasChanges = false;

            // Compile Regex
            const compiledRegex = regexList.map(r => new RegExp(r));

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                // Ensure row has at least 2 columns
                if (row.length < 2) {
                    markedRows.push(row);
                    continue;
                }

                const firstCol = String(row[0]);
                let isMatch = false;

                for (const regex of compiledRegex) {
                    if (regex.test(firstCol)) {
                        isMatch = true;
                        break;
                    }
                }

                const markedRow = [...row];

                if (isMatch) {
                    // Prepend marker to 2nd column (index 1)
                    markedRow[1] = '【这可能是代码】' + markedRow[1];
                    hasChanges = true;
                }

                markedRows.push(markedRow);
            }

            // Generate Outputs
            const markedWB = XLSX.utils.book_new();
            const markedWS = XLSX.utils.aoa_to_sheet(markedRows);
            XLSX.utils.book_append_sheet(markedWB, markedWS, sheetName);
            const markedBlob = writeWorkbook(markedWB, file.name);

            self.postMessage({
                status: 'success',
                action: 'sanitize',
                fileName: file.name,
                markedBlob: markedBlob,
                hasChanges: hasChanges
            });

        } catch (err) {
            throw err;
        }
    };
    reader.readAsArrayBuffer(file);
}

function writeWorkbook(wb, filename) {
    const wbout = XLSX.write(wb, { bookType: getBookType(filename), type: 'array' });
    return new Blob([wbout], { type: 'application/octet-stream' });
}

function getBookType(filename) {
    if (filename.endsWith('.csv')) return 'csv';
    return 'xlsx';
}

function resegmentFile(file, maxWidth, locale) {
    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const text = e.target.result;
            const lines = text.split(/\r?\n/);
            const processedLines = [];

            const segmenter = new Intl.Segmenter(locale || 'zh-CN', { granularity: 'word' });

            // Special Tags Regex (Zero-width, Indivisible)
            // Matches: <br>, \N, <...>, { ... }
            const tagRegex = /(<[^>]+>|\\N\[\d+\]|\\C\[\d+\]|\{[^\}]+\})/g;

            for (let line of lines) {
                if (line.includes('【这可能是代码】')) {
                    processedLines.push(line);
                    continue;
                }

                // Algorithm: O(N) Single Pass
                let currentWidth = 0;
                let currentLine = "";
                let buffer = ""; // Buffer for current word/token

                // Split line into tokens (Text + Tags)
                // We use split with capturing group to keep separators (tags)
                const tokens = line.split(tagRegex);

                for (let token of tokens) {
                    if (!token) continue;

                    if (tagRegex.test(token)) {
                        // It's a tag -> Zero width
                        if (currentWidth > 0 && currentWidth + 0 > maxWidth) {
                            // Tags are zero width, so they usually fit, unless we force break?
                            // Actually, tags should stick to previous text if possible, or just append.
                            // Since they are zero width, they don't trigger a break by themselves.
                        }
                        currentLine += token;
                        // Width doesn't increase
                    } else {
                        // It's text -> Segment it
                        const segments = segmenter.segment(token);
                        for (const seg of segments) {
                            const word = seg.segment;
                            const wordWidth = getWidth(word);

                            if (currentWidth + wordWidth > maxWidth) {
                                // Wrap
                                if (currentLine.length > 0) {
                                    processedLines.push(currentLine);
                                    currentLine = "";
                                    currentWidth = 0;
                                }
                                // If word itself is too long, we might force split or just put it on new line
                                // Here we just put it on new line (or start of new line)
                                currentLine += word;
                                currentWidth += wordWidth;
                            } else {
                                currentLine += word;
                                currentWidth += wordWidth;
                            }
                        }
                    }
                }
                if (currentLine.length > 0) {
                    processedLines.push(currentLine);
                }
            }

            const resultText = processedLines.join('\n');
            const blob = new Blob([resultText], { type: 'text/plain' });

            self.postMessage({
                status: 'success',
                action: 'resegment',
                fileName: file.name,
                blob: blob
            });

        } catch (err) {
            throw err;
        }
    };
    reader.readAsText(file);
}

function getWidth(str) {
    let width = 0;
    for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        // Simple Hanzi check (this is an approximation, can be improved)
        if (code > 255) {
            width += 2;
        } else {
            width += 1;
        }
    }
    return width;
}
