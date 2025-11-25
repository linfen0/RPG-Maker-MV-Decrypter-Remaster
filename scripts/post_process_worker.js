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

            let hasChanges = false;

            // Compile Regex
            const compiledRegex = regexList.map(r => new RegExp(r));

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                // Ensure row has at least 2 columns
                if (row.length < 2) {
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

                if (isMatch) {
                    // Append marker to a new column
                    row.push('【这可能是代码】');
                    hasChanges = true;
                }
            }

            // Generate Outputs
            const markedWB = XLSX.utils.book_new();
            const markedWS = XLSX.utils.aoa_to_sheet(rows);
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
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // Convert to array of arrays
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
            const segmenter = new Intl.Segmenter(locale || 'zh-CN', { granularity: 'word' });
            const tagRegex = /(<[^>]+>|\\N\[\d+\]|\\C\[\d+\]|\{[^\}]+\})/g;

            for (let i = 0; i < rows.length; i++) {
                const row = rows[i];
                if (row.length === 0) continue;

                // Check for marker in the last column
                const lastCol = row[row.length - 1];
                if (lastCol === '【这可能是代码】') {
                    continue;
                }

                // Resegment the first column (assuming text is in the first column)
                // If it's a text file loaded as CSV, it will be in row[0]
                let text = String(row[0]);
                if (!text) continue;

                // Algorithm: O(N) Single Pass
                let currentWidth = 0;
                let currentLine = "";
                let processedText = "";

                // Split line into tokens (Text + Tags)
                const tokens = text.split(tagRegex);

                for (let token of tokens) {
                    if (!token) continue;

                    if (tagRegex.test(token)) {
                        // Tag -> Zero width
                        currentLine += token;
                    } else {
                        // Text -> Segment
                        const segments = segmenter.segment(token);
                        for (const seg of segments) {
                            const word = seg.segment;
                            const wordWidth = getWidth(word);

                            if (currentWidth + wordWidth > maxWidth) {
                                // Wrap
                                if (currentLine.length > 0) {
                                    processedText += currentLine + '\n';
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
                if (currentLine.length > 0) {
                    processedText += currentLine;
                }

                // Update the cell
                row[0] = processedText;
            }

            // Generate Output
            const newWB = XLSX.utils.book_new();
            const newWS = XLSX.utils.aoa_to_sheet(rows);
            XLSX.utils.book_append_sheet(newWB, newWS, sheetName);
            const blob = writeWorkbook(newWB, file.name);

            self.postMessage({
                status: 'success',
                action: 'resegment',
                fileName: file.name,
                blob: blob
            });

        } catch (err) {
            self.postMessage({
                status: 'error',
                error: err.toString(),
                fileName: file.name
            });
        }
    };
    reader.readAsArrayBuffer(file);
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
