# RAGNAR — Viking Command Deck & Cyber Security Vault

RAGNAR is a secure, Viking-themed dark Nordic command center, integrating robust notes, file archival, and cybersecurity playbooks. The system is designed with gold runic accents, glassmorphic layout components, and custom CSS-injected accent triggers.

## Key Features

- 🔐 **Secure Login**: Session-based cookie verification, passwords encrypted with `bcrypt`, server-side rate limits, and security headers (Helmet).
- 🏠 **Dashboard**: Viking themed stats, recent files, and recent notes logger.
- 📝 **Markdown Notes**: Complete CRUD notes module with dynamic categorizations, debounced search filters, and an inline Markdown preview renderer.
- 📂 **Stash File Archive**: File upload system (PDFs, ZIPs, Images) with automatic file constraints, deletion logs, and download links.
- 🛡️ **Cybersecurity Wiki**: A detailed reference wiki categorized with topics including Linux, Networking, Nmap, Wireshark, Web Security, Python, and SOC Playbooks.
- 👤 **Warrior Identity**: Profile page allowing changing the avatar image, changing username, and secure password updates.
- ⚙️ **Dashboard Settings**: Change design accent theme instantly (Nordic Gold, Crimson Red, Emerald Green, Sapphire Blue), perform backups of the SQLite database table, and export notes to JSON.

## Technology Stack

- **Frontend**: HTML5, CSS3 (Vanilla design tokens, transitions, glassmorphic filters), Vanilla ES6 JavaScript.
- **Backend**: Node.js, Express.js.
- **Database**: SQLite3.
- **Security**: Helmet, Express-Rate-Limit, BCryptJS, Express-Session.

## Getting Started

1. **Verify Workspace**: Ensure you open this directory as your active workspace:
   `/Users/govindggopi/.gemini/antigravity-ide/scratch/ragnar`

2. **Launch Server**:
   ```bash
   node server.js
   ```

3. **Access Command Center**:
   Open your browser and navigate to:
   `http://localhost:3000`

   **Credentials**:
   - Username: `ragnar`
   - Password: `ragnarok`
