# RPG Maker MV/MZ Decrypter (Enhanced Version)

[English](README.md) | [中文](README_ZH.md)

---

## 🇬🇧 English

### Introduction
This project is a modernized and enhanced version of [Petschko's RPG-Maker-MV-Decrypter](https://github.com/Petschko/RPG-Maker-MV-Decrypter). It allows you to decrypt, encrypt, and restore resource files from RPG Maker MV and MZ games.

**✨ AI-Assisted Development:** The UI redesign, code refactoring, and new feature implementation in this version were significantly assisted by **AI**.

### Key Features
*   **🚀 Batch Processing:** Efficiently handle entire folders with multi-threaded Web Workers.
*   **🎨 Modern UI:** Completely redesigned with **Material Design 3** for a beautiful and intuitive experience.
*   **⚡ Optimization:**
    *   **Direct Folder Write:** Save processed files directly to your disk (Chrome/Edge).
    *   **ZIP Export:** Fast archiving for large numbers of files.
*   **🖼️ Enhanced Preview:**
    *   Grouped by directory structure.
    *   Click-to-view Lightbox for images.
*   **🌍 Internationalization:** Fully localized in **English** and **Chinese (Simplified)**.
*   **🛠️ Developer Friendly:** Migrated to a modern Node.js + Vite development environment.

### Installation & Usage

1.  **Prerequisites:** Install [Node.js](https://nodejs.org/).
2.  **Clone/Download:** Get this repository to your local machine.
3.  **Install Dependencies:**
    ```bash
    npm install
    ```
4.  **Start Application:**
    ```bash
    npm start
    ```
5.  **Open Browser:** Visit `http://localhost:5173` (or the URL shown in your terminal).

### Credits
*   **Original Author:** [Petschko](https://github.com/Petschko) - The core logic and original tool.
*   **Libraries:** [JSZip](https://github.com/Stuk/jszip), [FileSaver.js](https://github.com/eligrey/FileSaver.js), [lz-string](https://github.com/pieroxy/lz-string), [@material/web](https://github.com/material-components/material-web).
