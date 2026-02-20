# CopyPaste.me (Standalone Node.js + PWA)

A frictionless sharing application that allows users to securely send text, passwords, and files between devices—refactored to run entirely as a standalone Node.js application with full Progressive Web App (PWA) capabilities.

## 🚀 The Refactor: Why I Modified This Project

This repository is a custom fork and architectural rework of the original [CopyPaste.me](https://github.com/TheSocialCode/CopyPaste.me) project.

The original application relied on a stack that included PHP and MongoDB. As a Computer Science and Engineering student focusing on modern JavaScript ecosystems, I took on the challenge of re-engineering the backend.

**Key Modifications:**

- **Bypassed PHP & MongoDB:** Stripped out the original database and PHP dependencies.
- **Standalone Node.js Environment:** Rewrote the core backend logic to run purely on Node.js, making the application lighter and easier to deploy in JS-centric environments.
- **Progressive Web App (PWA):** Added full PWA support with offline functionality, installability, and app-like experience.
- **Streamlined Execution:** Simplified the setup process for local development and testing.

## 💻 Tech Stack

- **Backend:** Node.js, Express, Socket.io
- **Frontend:** HTML, CSS, JavaScript
- **PWA Features:** Service Workers, Web Manifest, Offline Support
- **Original UI/UX:** The Social Code Foundation

## ✨ PWA Features

- 📱 **Installable**: Add to home screen on mobile and desktop
- 🔌 **Offline-capable**: Core functionality works without internet
- ⚡ **Fast**: Intelligent caching for instant loading
- 🎨 **App-like**: Standalone mode with native feel
- 🔄 **Auto-updates**: Seamless version updates

> **See [PWA-README.md](PWA-README.md) for complete PWA documentation**

## 🛠️ How to Run Locally

1. **Clone the repository:**

   ```bash
   git clone https://github.com/nizam-ahamad/copypaste.git
   cd copypaste
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Setup your config file:**
   Make a duplicate of the existing CopyPaste.config.json-dist file and name the new file CopyPaste.config.json.

## ▶️ How to Run the Application

Since this version is designed to run standalone without MongoDB or SSL (HTTPS) for local testing, use the following command to start the server:

```bash
node app/server/CopyPaste.server.js https false mongoauthenticate=false
```

For PWA testing with HTTPS (required for service workers in production):

```bash
node app/server/CopyPaste.server.js https true mongoauthenticate=false
```

## 📚 Documentation

- **[PWA-README.md](PWA-README.md)** - Complete PWA implementation guide
- **[PWA-TESTING-GUIDE.md](PWA-TESTING-GUIDE.md)** - Comprehensive testing checklist

## 🙌 Credits & Licensing

1. Original Project & UI/UX: Created and offered by The Social Code Foundation.
2. All front-end design, original concepts, and core frontend logic belong to the original authors.
3. This repository serves as a backend architectural study and Node.js refactoring showcase with PWA enhancements.
