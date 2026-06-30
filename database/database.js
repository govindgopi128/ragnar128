const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Promise-based wrapper
const query = {
  all: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  get: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  run: (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID, changes: this.changes });
      });
    });
  }
};

// Initialize tables
async function init() {
  await query.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      profile_picture TEXT DEFAULT '/images/avatar.jpg',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      category TEXT DEFAULT 'General',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await query.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      filepath TEXT NOT NULL,
      mimetype TEXT,
      size INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await query.run(`
    CREATE TABLE IF NOT EXISTS cyber (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default admin user: ragnar / ragnarok
  const ragnar = await query.get('SELECT * FROM users WHERE username = ?', ['ragnar']);
  if (!ragnar) {
    const hash = await bcrypt.hash('ragnarok', 10);
    await query.run('INSERT INTO users (username, password) VALUES (?, ?)', ['ragnar', hash]);
    console.log('Seed: User "ragnar" created with password "ragnarok"');
  }

  // Seed default cybersecurity wiki content
  const cyberCount = await query.get('SELECT COUNT(*) as count FROM cyber');
  if (cyberCount.count === 0) {
    const seedTopics = [
      {
        title: "Linux Essentials",
        category: "Linux",
        content: `# Linux Essentials & Hardening\nCommonly used Linux commands and configurations for systems administration and penetration testing.\n\n## Privilege Escalation Basics\n- Check current user permissions: \`whoami\` and \`id\`\n- List commands allowed to run as root: \`sudo -l\`\n- Search for SUID binaries:\n  \`\`\`bash\n  find / -perm -u=s -type f 2>/dev/null\n  \`\`\`\n- Check active network ports: \`ss -tulpn\` or \`netstat -ano\`\n\n## System Audit Logs\n- Authentication logs: \`tail -f /var/log/auth.log\` (Debian/Ubuntu) or \`/var/log/secure\` (RHEL)\n- Kernel logs: \`dmesg -T\`\n- General syslog: \`/var/log/syslog\` or \`/var/log/messages\``
      },
      {
        title: "Networking & Port Scanning",
        category: "Networking",
        content: `# Networking Fundamentals for Security\nUnderstanding how data flows is crucial for vulnerability assessment.\n\n## Common Ports Reference\n- **21**: FTP (Unencrypted file transfer)\n- **22**: SSH (Secure shell)\n- **23**: Telnet (Cleartext terminal connection - dangerous)\n- **25**: SMTP (Simple Mail Transfer Protocol)\n- **53**: DNS (Domain Name System)\n- **80/443**: HTTP/HTTPS\n- **445**: SMB (Server Message Block - Windows file sharing)\n\n## Diagnostic Commands\n- **Ping**: Verify remote host availability (\`ping -c 4 <IP>\`)\n- **Traceroute**: Map path taken by packets (\`traceroute <IP>\`)\n- **Nslookup**: Resolve hostname to IP address (\`nslookup google.com\`)`
      },
      {
        title: "Nmap Port Scanning Guide",
        category: "Nmap",
        content: `# Network Mapper (Nmap) Reference Sheet\nNmap is the premier tool for active network discovery and vulnerability analysis.\n\n## Essential Command Templates\n- **Standard Ping Sweep**: Scan network range for active hosts:\n  \`\`\`bash\n  nmap -sn 192.168.1.0/24\n  \`\`\`\n- **Stealth / Syn Scan**: Performs a TCP SYN scan, avoiding full connections:\n  \`\`\`bash\n  nmap -sS -p- 192.168.1.50\n  \`\`\`\n- **Aggressive Scan**: Enables OS detection, version detection, script scanning, and traceroute:\n  \`\`\`bash\n  nmap -A -v 192.168.1.50\n  \`\`\`\n- **Vulnerability Check**: Scan using Nmap Scripting Engine (NSE) vulnerability scripts:\n  \`\`\`bash\n  nmap --script vuln 192.168.1.50\n  \`\`\`\n\n## Common Flags\n- \`-Pn\`: Treat all hosts as online (skips host discovery)\n- \`-p-\`: Scan all 65,535 ports\n- \`-sV\`: Probe open ports to determine service/version info`
      },
      {
        title: "Wireshark Packet Analysis",
        category: "Wireshark",
        content: `# Wireshark & Packet Analysis Guide\nWireshark captures and inspects network packets in real-time, helping identify malicious traffic and cleartext leakage.\n\n## Top Display Filters\n- **Filter by IP**: View traffic to or from a specific IP:\n  \`\`\`text\n  ip.addr == 192.168.1.50\n  \`\`\`\n- **Filter by Protocol**: Show only specific traffic type:\n  \`\`\`text\n  http || dns || icmp\n  \`\`\`\n- **Find Unencrypted Credentials**: Filter HTTP POST requests containing passwords:\n  \`\`\`text\n  http.request.method == \"POST\" && (http contains \"password\" || http contains \"login\")\n  \`\`\`\n- **TCP Resets**: Identify scanning activity or terminated connections:\n  \`\`\`text\n  tcp.flags.reset == 1\n  \`\`\``
      },
      {
        title: "Web Security (OWASP Top 10)",
        category: "Web Security",
        content: `# Web Application Security & OWASP Top 10\nEssential topics covering the most critical web application vulnerabilities.\n\n## 1. SQL Injection (SQLi)\nOccurs when user-supplied input is directly concatenated into SQL queries without proper sanitization or parameterized inputs.\n*Prevention*: Use Prepared Statements (Parameterized Queries).\n\n## 2. Cross-Site Scripting (XSS)\nEnables attackers to inject malicious scripts into web pages viewed by other users.\n- **Reflected**: Script is in the URL parameter.\n- **Stored**: Script is saved in the database and shown to all users loading the page.\n*Prevention*: HTML encode outputs, implement Content Security Policy (CSP).\n\n## 3. Broken Access Control\nFailures where users can act outside of their intended permissions (e.g., accessing admin pages or other user profiles by altering IDs in URLs).\n*Prevention*: Enforce server-side session checks and role verification on every endpoint.`
      },
      {
        title: "Python for Cybersecurity",
        category: "Python",
        content: `# Python Scripting for Security Tasks\nPython is the industry standard language for writing quick automation scripts, exploits, and parsing logs.\n\n## Port Scanner in Python\nA simple script to check for open TCP ports using socket connection:\n\`\`\`python\nimport socket\n\ntarget = \"127.0.0.1\"\nports = [21, 22, 80, 443, 8080]\n\nfor port in ports:\n    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)\n    s.settimeout(1.0)\n    result = s.connect_ex((target, port))\n    if result == 0:\n        print(f\"[+] Port {port} is OPEN\")\n    s.close()\n\`\`\`\n\n## Sending custom HTTP Requests\nUsing the \`requests\` library:\n\`\`\`python\nimport requests\n\nurl = \"http://target.local/login\"\npayload = {\"username\": \"admin\", \"password\": \"password123\"}\nresponse = requests.post(url, data=payload)\n\nprint(response.status_code)\nprint(response.text)\n\`\`\``
      },
      {
        title: "TryHackMe & SOC Playbook",
        category: "TryHackMe",
        content: `# SOC & Threat Hunting Playbook\nCore defensive tactics, SOC workflows, and TryHackMe preparation notes.\n\n## Incident Response Steps\n1. **Preparation**: Train staff and establish tools.\n2. **Identification**: Detect anomalous behavior or alerts.\n3. **Containment**: Isolate infected machines (e.g. disable network cards).\n4. **Eradication**: Clean malware, patch the vulnerabilities.\n5. **Recovery**: Restore systems from clean, verified backups.\n6. **Lessons Learned**: Document findings to improve future response.\n\n## Recommended SOC Lab Setup\n- **SIEM**: Elastic Security or Splunk (for log aggregation)\n- **EDR**: Wazuh or Sysmon (for host monitoring)\n- **Traffic Analysis**: Zeek or Suricata`
      }
    ];

    for (const topic of seedTopics) {
      await query.run(
        'INSERT OR IGNORE INTO cyber (title, category, content) VALUES (?, ?, ?)',
        [topic.title, topic.category, topic.content]
      );
    }
    console.log('Seed: Cybersecurity topics created');
  }
}

init().catch(console.error);

module.exports = query;
