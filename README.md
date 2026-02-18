# CopyPaste.me (Standalone Node.js Refactor)

A frictionless sharing application that allows users to securely send text, passwords, and files between devices—refactored to run entirely as a standalone Node.js application.

## 🚀 The Refactor: Why I Modified This Project

This repository is a custom fork and architectural rework of the original [CopyPaste.me](https://github.com/TheSocialCode/CopyPaste.me) project.

The original application relied on a stack that included PHP and MongoDB. As a Computer Science and Engineering student focusing on modern JavaScript ecosystems, I took on the challenge of re-engineering the backend.

**Key Modifications:**

- **Bypassed PHP & MongoDB:** Stripped out the original database and PHP dependencies.
- **Standalone Node.js Environment:** Rewrote the core backend logic to run purely on Node.js, making the application lighter and easier to deploy in JS-centric environments.
- **Streamlined Execution:** Simplified the setup process for local development and testing.

## 💻 Tech Stack

- **Backend:** Node.js
- **Frontend:** HTML, CSS, JavaScript
- **Original UI/UX:** The Social Code Foundation

## 🛠️ How to Run Locally

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/nizam-ahamad/copypaste.git](https://github.com/nizam-ahamad/copypaste.git)
   ```
2. **Install dependecy:**

   ```bash
   [npm install]

   ```

3. **Setup your config file:**
   Make a duplicate of the existing CopyPaste.config.json-dist file and name the new file CopyPaste.config.json.

## ▶️ How to Run the Application

Since this version is designed to run standalone without MongoDB or SSL (HTTPS) for local testing, use the following command to start the server:

    [node app/server/CopyPaste.server.js https false mongoauthenticate=false]

🙌 Credits & Licensing

    1. Original Project & UI/UX: Created and offered by The Social Code Foundation.

    2.All front-end design, original concepts, and core frontend logic belong to the original authors. This repository serves as a backend architectural study and Node.js refactoring showcase.
