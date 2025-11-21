# RPG Maker MV/MZ 解包器 (增强版)

[English](README.md) | [中文](README_ZH.md)

---

## 🇨🇳 中文

### 简介
本项目是 [Petschko's RPG-Maker-MV-Decrypter](https://github.com/Petschko/RPG-Maker-MV-Decrypter) 的现代化增强版本。它允许您解密、加密和恢复 RPG Maker MV 和 MZ 游戏的资源文件。

**✨ AI 辅助开发：** 本版本的 UI 重设计、代码重构以及新功能的实现，均在 **AI** 的深度辅助下完成。

### 主要特性
*   **🚀 批量处理：** 使用多线程 Web Workers 高效处理整个文件夹。
*   **🎨 现代 UI：** 基于 **Material Design 3** 完全重构，带来美观直观的用户体验。
*   **⚡ 性能优化：**
    *   **文件夹直写：** 处理后的文件直接写入硬盘（支持 Chrome/Edge）。
    *   **ZIP 导出：** 针对大量小文件优化的快速归档导出。
*   **🖼️ 增强预览：**
    *   按目录结构分组显示。
    *   点击图片可全屏查看（灯箱效果）。
*   **🌍 多语言支持：** 完整支持 **简体中文** 和 **英语**。
*   **🛠️ 开发友好：** 迁移至现代化的 Node.js + Vite 开发环境。

### 安装与使用

1.  **前置要求：** 安装 [Node.js](https://nodejs.org/)。
2.  **下载项目：** 克隆或下载本仓库到本地。
3.  **安装依赖：**
    在项目根目录下打开终端运行：
    ```bash
    npm install
    ```
4.  **启动应用：**
    ```bash
    npm start
    ```
5.  **打开浏览器：** 访问 `http://localhost:5173`（或终端显示的地址）。

### 致谢
*   **原作者：** [Petschko](https://github.com/Petschko) - 核心逻辑与原始工具的作者。
*   **开源库：** [JSZip](https://github.com/Stuk/jszip), [FileSaver.js](https://github.com/eligrey/FileSaver.js), [lz-string](https://github.com/pieroxy/lz-string), [@material/web](https://github.com/material-components/material-web).
