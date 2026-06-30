document.addEventListener('DOMContentLoaded', () => {
    // Current user state
    let currentUser = null;
    let notes = [];
    let selectedNoteId = null;

    // Element Selectors
    const sidebar = document.getElementById('sidebar');
    const mobileToggle = document.getElementById('mobileToggle');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const headerTitle = document.getElementById('headerTitle');
    const viewSections = document.querySelectorAll('.view-section');
    const welcomeMessage = document.getElementById('welcomeMessage');
    
    // User Profile Display
    const sidebarAvatar = document.getElementById('sidebarAvatar');
    const sidebarUsername = document.getElementById('sidebarUsername');
    const profileAvatarPreview = document.getElementById('profileAvatarPreview');
    const profileUsername = document.getElementById('profileUsername');

    // Dashboard Quick Shortcuts
    const quickCards = document.querySelectorAll('.quick-card');

    // Notes Elements
    const notesListScroll = document.getElementById('notesListScroll');
    const editorTitle = document.getElementById('editorTitle');
    const editorCategory = document.getElementById('editorCategory');
    const editorContent = document.getElementById('editorContent');
    const markdownPreview = document.getElementById('markdownPreview');
    const noteSearch = document.getElementById('noteSearch');
    const noteCategoryFilter = document.getElementById('noteCategoryFilter');
    const saveNoteBtn = document.getElementById('saveNoteBtn');
    const deleteNoteBtn = document.getElementById('deleteNoteBtn');
    const newNoteBtn = document.getElementById('newNoteBtn');

    // Files Elements
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const filesTableBody = document.getElementById('filesTableBody');

    // Cyber Wiki Elements
    const cyberNavPanel = document.getElementById('cyberNavPanel');
    const cyberContentView = document.getElementById('cyberContentView');

    // Profile Forms
    const usernameForm = document.getElementById('usernameForm');
    const passwordForm = document.getElementById('passwordForm');
    const avatarInput = document.getElementById('avatarInput');

    // Settings Elements
    const colorDots = document.querySelectorAll('.color-dot');
    const backupDbBtn = document.getElementById('backupDbBtn');
    const exportNotesBtn = document.getElementById('exportNotesBtn');

    // General Stats Elements
    const statNotes = document.getElementById('statNotes');
    const statFiles = document.getElementById('statFiles');
    const statCyber = document.getElementById('statCyber');

    // ----------------------------------------------------
    // INITIALIZATION & SESSION VERIFICATION
    // ----------------------------------------------------
    async function checkSession() {
        try {
            const response = await fetch('/api/auth/session');
            const data = await response.json();
            if (data.loggedIn) {
                currentUser = data.user;
                updateUserUI();
                initApp();
            } else {
                window.location.href = '/login.html';
            }
        } catch (err) {
            console.error(err);
            showToast('Unable to connect to security portal. Redirecting to login.', 'error');
            setTimeout(() => { window.location.href = '/login.html'; }, 2000);
        }
    }

    function updateUserUI() {
        if (!currentUser) return;
        const avatarSrc = currentUser.profilePicture || '/images/avatar.jpg';
        sidebarAvatar.src = avatarSrc;
        profileAvatarPreview.src = avatarSrc;
        
        // Capitalize for Welcome banner, keep original for forms
        const formattedUser = currentUser.username.toUpperCase();
        sidebarUsername.textContent = currentUser.username;
        profileUsername.value = currentUser.username;
        welcomeMessage.textContent = `WELCOME BACK, ${formattedUser}`;
    }

    function initApp() {
        // Load Accent color from localStorage
        const savedAccent = localStorage.getItem('ragnar_accent_color');
        if (savedAccent) {
            document.documentElement.setAttribute('data-accent', savedAccent);
            colorDots.forEach(dot => {
                dot.classList.toggle('active', dot.getAttribute('data-color') === savedAccent);
            });
        }

        // Fetch Initial Module Data
        loadNotes();
        loadFiles();
        loadCyberWiki();
    }

    checkSession();

    // ----------------------------------------------------
    // NAVIGATION / ROUTING SYSTEM
    // ----------------------------------------------------
    function switchView(viewName) {
        // Toggle Active Link
        sidebarLinks.forEach(link => {
            if (link.getAttribute('data-view') === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Hide/Show Views
        viewSections.forEach(section => {
            const isTarget = section.id === `${viewName}View`;
            section.classList.toggle('active', isTarget);
        });

        // Toggle Sidebar Menu off on mobile view after navigation
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('open');
        }

        // Update Page Header Title
        const titleMap = {
            'dashboard': 'Command Center',
            'notes': 'Knowledge Vault',
            'files': 'Stash Box',
            'cybersecurity': 'Cyber Defense Wiki',
            'profile': 'Warrior Identity',
            'settings': 'Dashboard Settings'
        };
        headerTitle.textContent = titleMap[viewName] || 'Ragnar';
        
        // Perform view-specific refresh
        if (viewName === 'dashboard') {
            refreshDashboardStats();
        }
    }

    // Sidebar navigation clicks
    sidebarLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const view = link.getAttribute('data-view');
            if (view) {
                e.preventDefault();
                switchView(view);
            }
        });
    });

    // Profile Click Shortcuts in sidebar
    document.getElementById('profileShortcut').addEventListener('click', (e) => {
        e.preventDefault();
        switchView('profile');
    });

    // Quick Cards clicks
    quickCards.forEach(card => {
        card.addEventListener('click', () => {
            const targetView = card.getAttribute('data-shortcut');
            if (targetView) switchView(targetView);
        });
    });

    // Hamburger Mobile Menu toggle
    mobileToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });

    // Logout Action
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        if (confirm('A true warrior does not flee. Are you sure you want to exit RAGNAR?')) {
            try {
                const response = await fetch('/api/auth/logout', { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                    showToast('Safely logged out of portal.');
                    setTimeout(() => { window.location.href = '/login.html'; }, 1000);
                }
            } catch (err) {
                console.error(err);
                showToast('Failed to contact server to close session.', 'error');
            }
        }
    });

    // ----------------------------------------------------
    // STATS & RECENT LOGS REFRESH
    // ----------------------------------------------------
    function refreshDashboardStats() {
        statNotes.textContent = notes.length;
        // Fetch files count and update lists dynamically
        loadFiles();
        
        // Populate recent notes list
        const recentNotesList = document.getElementById('recentNotesList');
        recentNotesList.innerHTML = '';
        
        const sortedNotes = [...notes].sort((a,b) => new Date(b.updated_at) - new Date(a.updated_at)).slice(0, 4);
        
        if (sortedNotes.length === 0) {
            recentNotesList.innerHTML = '<li class="recent-item-placeholder">No recent notes found. Create one in the vault!</li>';
        } else {
            sortedNotes.forEach(note => {
                const li = document.createElement('li');
                li.className = 'recent-item';
                li.style.cursor = 'pointer';
                li.addEventListener('click', () => {
                    switchView('notes');
                    selectNote(note.id);
                });
                
                const timeStr = formatRelativeTime(new Date(note.updated_at));
                li.innerHTML = `
                    <div class="recent-item-meta">
                        <span class="recent-item-icon">📝</span>
                        <span class="recent-item-title">${escapeHTML(note.title)}</span>
                    </div>
                    <span class="recent-item-time">${timeStr}</span>
                `;
                recentNotesList.appendChild(li);
            });
        }
    }

    // ----------------------------------------------------
    // NOTES LOGIC (Vault)
    // ----------------------------------------------------
    async function loadNotes() {
        try {
            const response = await fetch('/api/notes');
            const data = await response.json();
            if (data.success) {
                notes = data.notes;
                renderNotesList();
                renderCategoryFilters();
                refreshDashboardStats();
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to load notes from database.', 'error');
        }
    }

    function renderNotesList() {
        const query = noteSearch.value.toLowerCase().trim();
        const selectedCat = noteCategoryFilter.value;

        notesListScroll.innerHTML = '';

        const filtered = notes.filter(note => {
            const matchesSearch = note.title.toLowerCase().includes(query) || (note.content && note.content.toLowerCase().includes(query));
            const matchesCat = !selectedCat || note.category === selectedCat;
            return matchesSearch && matchesCat;
        });

        if (filtered.length === 0) {
            notesListScroll.innerHTML = '<div style="padding: 20px; text-align:center; color:var(--text-muted); font-size:0.8rem;">No notes matching criteria.</div>';
            return;
        }

        filtered.forEach(note => {
            const card = document.createElement('div');
            card.className = `note-item-card ${note.id === selectedNoteId ? 'active' : ''}`;
            card.addEventListener('click', () => selectNote(note.id));

            const timeStr = new Date(note.updated_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
            const previewText = note.content ? note.content.substring(0, 60) : 'No content...';

            card.innerHTML = `
                <div class="note-item-header">
                    <h5 class="note-item-title">${escapeHTML(note.title)}</h5>
                    <span class="note-item-cat">${escapeHTML(note.category || 'General')}</span>
                </div>
                <p class="note-item-body">${escapeHTML(previewText)}</p>
                <div class="note-item-date">${timeStr}</div>
            `;
            notesListScroll.appendChild(card);
        });
    }

    function renderCategoryFilters() {
        const uniqueCategories = [...new Set(notes.map(n => n.category || 'General'))];
        const currentValue = noteCategoryFilter.value;
        
        noteCategoryFilter.innerHTML = '<option value="">All Categories</option>';
        uniqueCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            noteCategoryFilter.appendChild(opt);
        });
        
        noteCategoryFilter.value = currentValue;
    }

    function selectNote(noteId) {
        selectedNoteId = noteId;
        const note = notes.find(n => n.id === noteId);
        
        // Highlight in list
        document.querySelectorAll('.note-item-card').forEach(card => card.classList.remove('active'));
        renderNotesList(); // Rerender keeps highlight synced

        if (note) {
            editorTitle.value = note.title;
            editorCategory.value = note.category || 'General';
            editorContent.value = note.content || '';
            updateMarkdownPreview();
        }
    }

    function updateMarkdownPreview() {
        const mdText = editorContent.value;
        markdownPreview.innerHTML = renderMarkdown(mdText);
    }

    editorContent.addEventListener('input', updateMarkdownPreview);
    noteSearch.addEventListener('input', renderNotesList);
    noteCategoryFilter.addEventListener('change', renderNotesList);

    // Save Note Click Handler
    saveNoteBtn.addEventListener('click', async () => {
        const title = editorTitle.value.trim();
        const category = editorCategory.value.trim() || 'General';
        const content = editorContent.value;

        if (!title) {
            showToast('Note title is required!', 'error');
            return;
        }

        const isEdit = selectedNoteId !== null;
        const url = isEdit ? `/api/notes/${selectedNoteId}` : '/api/notes';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, category, content })
            });
            const result = await response.json();
            if (result.success) {
                showToast(isEdit ? 'Note updated successfully' : 'New note created');
                await loadNotes();
                if (!isEdit) {
                    // Auto select newly created note
                    selectNote(result.note.id);
                }
            } else {
                showToast(result.message || 'Error saving note', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Server connection error.', 'error');
        }
    });

    // Delete Note Click Handler
    deleteNoteBtn.addEventListener('click', async () => {
        if (!selectedNoteId) {
            showToast('Select a note to delete first.', 'error');
            return;
        }

        if (confirm('Are you sure you want to delete this note? This action is irreversible.')) {
            try {
                const response = await fetch(`/api/notes/${selectedNoteId}`, { method: 'DELETE' });
                const result = await response.json();
                if (result.success) {
                    showToast('Note deleted');
                    selectedNoteId = null;
                    clearEditor();
                    loadNotes();
                } else {
                    showToast(result.message || 'Error deleting note', 'error');
                }
            } catch (err) {
                console.error(err);
                showToast('Server connection error.', 'error');
            }
        }
    });

    newNoteBtn.addEventListener('click', () => {
        selectedNoteId = null;
        clearEditor();
        document.querySelectorAll('.note-item-card').forEach(card => card.classList.remove('active'));
        editorTitle.focus();
    });

    function clearEditor() {
        editorTitle.value = '';
        editorCategory.value = '';
        editorContent.value = '';
        markdownPreview.innerHTML = '';
    }

    // ----------------------------------------------------
    // FILE MANAGER LOGIC
    // ----------------------------------------------------
    async function loadFiles() {
        try {
            const response = await fetch('/api/files');
            const data = await response.json();
            if (data.success) {
                renderFilesList(data.files);
                statFiles.textContent = data.files.length;
                renderRecentFiles(data.files);
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderFilesList(files) {
        filesTableBody.innerHTML = '';
        if (files.length === 0) {
            filesTableBody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">
                        No files uploaded. Drop your PDFs, ZIPs, or Images here.
                    </td>
                </tr>
            `;
            return;
        }

        files.forEach(file => {
            const tr = document.createElement('tr');
            
            const sizeStr = formatBytes(file.size);
            const dateStr = new Date(file.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
            
            const isImg = file.mimetype && file.mimetype.startsWith('image/');
            const fileIcon = isImg ? '🖼' : file.filename.endsWith('.zip') ? '📦' : '📄';

            tr.innerHTML = `
                <td>
                    <div class="file-name-col">
                        <span class="file-icon" style="font-size: 1.2rem;">${fileIcon}</span>
                        <span>${escapeHTML(file.original_name)}</span>
                    </div>
                </td>
                <td>${sizeStr}</td>
                <td>${dateStr}</td>
                <td>
                    <div class="file-actions">
                        <button class="btn btn-secondary" onclick="window.location.href='/api/files/download/${file.id}'">Download</button>
                        <button class="btn btn-danger btn-delete-file" data-id="${file.id}">Delete</button>
                    </div>
                </td>
            `;
            filesTableBody.appendChild(tr);
        });

        // Add delete file listener
        document.querySelectorAll('.btn-delete-file').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                if (confirm('Delete this file permanently?')) {
                    try {
                        const response = await fetch(`/api/files/${id}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (result.success) {
                            showToast('File deleted successfully');
                            loadFiles();
                        } else {
                            showToast(result.message || 'Error deleting file', 'error');
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            });
        });
    }

    function renderRecentFiles(files) {
        const recentFilesList = document.getElementById('recentFilesList');
        recentFilesList.innerHTML = '';
        const recent = files.slice(0, 4);

        if (recent.length === 0) {
            recentFilesList.innerHTML = '<li class="recent-item-placeholder">No files archived yet.</li>';
            return;
        }

        recent.forEach(file => {
            const li = document.createElement('li');
            li.className = 'recent-item';
            
            const isImg = file.mimetype && file.mimetype.startsWith('image/');
            const icon = isImg ? '🖼' : file.filename.endsWith('.zip') ? '📦' : '📄';
            const relativeTime = formatRelativeTime(new Date(file.created_at));

            li.innerHTML = `
                <div class="recent-item-meta">
                    <span class="recent-item-icon">${icon}</span>
                    <span class="recent-item-title" style="cursor:pointer;" onclick="window.location.href='/api/files/download/${file.id}'">${escapeHTML(file.original_name)}</span>
                </div>
                <span class="recent-item-time">${relativeTime}</span>
            `;
            recentFilesList.appendChild(li);
        });
    }

    // Drag-and-drop Events
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length) {
            uploadFile(files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            uploadFile(fileInput.files[0]);
            fileInput.value = ''; // Reset input
        }
    });

    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        
        showToast('Uploading file to Vault...');

        try {
            const response = await fetch('/api/files/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            if (data.success) {
                showToast('File stored successfully.');
                loadFiles();
            } else {
                showToast(data.message || 'File upload failed', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('Unable to upload. Connection error.', 'error');
        }
    }

    // ----------------------------------------------------
    // CYBERSECURITY WIKI LOGIC
    // ----------------------------------------------------
    let cyberTopicsList = [];
    async function loadCyberWiki() {
        try {
            const response = await fetch('/api/cyber');
            const data = await response.json();
            if (data.success) {
                cyberTopicsList = data.topics;
                renderCyberNav();
            }
        } catch (err) {
            console.error(err);
        }
    }

    function renderCyberNav() {
        cyberNavPanel.innerHTML = '';
        
        // Group by category to build sidebar dividers
        const categories = [...new Set(cyberTopicsList.map(t => t.category))];
        
        categories.forEach(cat => {
            const catHeader = document.createElement('div');
            catHeader.style.fontSize = '0.75rem';
            catHeader.style.fontWeight = 'bold';
            catHeader.style.textTransform = 'uppercase';
            catHeader.style.color = 'var(--accent-color)';
            catHeader.style.marginTop = '10px';
            catHeader.style.marginBottom = '5px';
            catHeader.style.letterSpacing = '1px';
            catHeader.textContent = cat;
            cyberNavPanel.appendChild(catHeader);

            const filtered = cyberTopicsList.filter(t => t.category === cat);
            filtered.forEach(topic => {
                const btn = document.createElement('button');
                btn.className = 'cyber-nav-btn';
                btn.textContent = topic.title;
                btn.addEventListener('click', () => loadCyberTopicDetails(topic.id, btn));
                cyberNavPanel.appendChild(btn);
            });
        });
    }

    async function loadCyberTopicDetails(topicId, btnElement) {
        // Toggle Active
        document.querySelectorAll('.cyber-nav-btn').forEach(btn => btn.classList.remove('active'));
        if (btnElement) btnElement.classList.add('active');

        try {
            const response = await fetch(`/api/cyber/${topicId}`);
            const data = await response.json();
            if (data.success) {
                const topic = data.topic;
                cyberContentView.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:15px; margin-bottom:20px;">
                        <h1 style="margin:0; font-family:'Cinzel', serif; color:var(--accent-color);">${escapeHTML(topic.title)}</h1>
                        <span style="font-size:0.75rem; background:rgba(212,175,55,0.1); border:0.5px solid var(--border-color); color:var(--accent-color); padding:3px 8px; border-radius:3px;">${escapeHTML(topic.category)}</span>
                    </div>
                    <div>
                        ${renderMarkdown(topic.content)}
                    </div>
                `;
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to load topic contents.', 'error');
        }
    }

    // ----------------------------------------------------
    // IDENTITY (PROFILE) LOGIC
    // ----------------------------------------------------
    usernameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('profileUsername').value.trim();
        if (!username) return;

        try {
            const response = await fetch('/api/auth/profile/username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            const result = await response.json();
            if (result.success) {
                showToast('Username updated successfully');
                currentUser.username = username;
                updateUserUI();
            } else {
                showToast(result.message || 'Error updating username', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    });

    passwordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;

        try {
            const response = await fetch('/api/auth/profile/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const result = await response.json();
            if (result.success) {
                showToast('Password changed successfully');
                passwordForm.reset();
            } else {
                showToast(result.message || 'Incorrect credentials', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    });

    avatarInput.addEventListener('change', async () => {
        if (!avatarInput.files.length) return;
        const file = avatarInput.files[0];
        const formData = new FormData();
        formData.append('avatar', file);

        showToast('Uploading profile image...');

        try {
            const response = await fetch('/api/auth/profile/avatar', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                showToast('Profile image updated');
                currentUser.profilePicture = result.profilePicture;
                updateUserUI();
                avatarInput.value = '';
            } else {
                showToast(result.message || 'Avatar upload failed', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    });

    // ----------------------------------------------------
    // SETTINGS MODULE LOGIC
    // ----------------------------------------------------
    // Theme accent configuration
    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            const color = dot.getAttribute('data-color');
            
            // Set Attribute on html tag
            document.documentElement.setAttribute('data-accent', color);
            localStorage.setItem('ragnar_accent_color', color);
            
            // Active selection dot toggle
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            
            showToast(`Accent color shifted to ${color.replace('-', ' ')}`);
        });
    });

    // DB Backup handler
    backupDbBtn.addEventListener('click', async () => {
        showToast('Initializing secure table backup...');
        try {
            const response = await fetch('/api/backup', { method: 'POST' });
            const result = await response.json();
            if (result.success) {
                showToast('Database backup completed successfully!');
                // Auto trigger download
                window.location.href = result.file;
            } else {
                showToast(result.message || 'Backup failed', 'error');
            }
        } catch (err) {
            console.error(err);
        }
    });

    // Export Notes click
    exportNotesBtn.addEventListener('click', () => {
        window.location.href = '/api/notes/export';
        showToast('Notes backup downloaded');
    });

    // ----------------------------------------------------
    // HELPER FUNCTIONS & FORMATTERS
    // ----------------------------------------------------
    function renderMarkdown(md) {
        if (!md) return '';
        // Escape HTML tags to prevent XSS
        let html = md
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        
        // Blockquotes
        html = html.replace(/^\s*>\s+\[!(.*?)\]\s*([^]*?)$/gim, (match, type, content) => {
            return `<div class="quote-alert alert-${type.toLowerCase()}" style="padding:15px; border-left:4px solid var(--accent-color); background:rgba(255,255,255,0.02); margin:15px 0;"><strong>${type.toUpperCase()}:</strong> ${content}</div>`;
        });

        // Headers
        html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
        html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
        html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
        
        // Bold
        html = html.replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>');
        
        // Code Blocks
        html = html.replace(/```(.*?)\n([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>');
        
        // Inline Code
        html = html.replace(/`(.*?)`/gim, '<code>$1</code>');
        
        // Bullet Lists
        html = html.replace(/^\s*-\s+(.*$)/gim, '<li>$1</li>');
        
        // Wrap consecutive li items (simple approach: lines containing <li>)
        // In real markdown parser it's cleaner, but for our simple viewer this works fine.
        
        // Clean linebreaks
        const lines = html.split('\n');
        let parsedHtml = '';
        let inList = false;

        lines.forEach(line => {
            const trimmed = line.trim();
            if (trimmed.startsWith('<li>')) {
                if (!inList) {
                    parsedHtml += '<ul style="margin-left: 20px; margin-bottom: 12px;">\n';
                    inList = true;
                }
                parsedHtml += line + '\n';
            } else {
                if (inList) {
                    parsedHtml += '</ul>\n';
                    inList = false;
                }
                
                if (trimmed.startsWith('<h') || trimmed.startsWith('<pre') || trimmed.startsWith('</pre') || trimmed.startsWith('<div') || trimmed.startsWith('</div')) {
                    parsedHtml += line + '\n';
                } else if (trimmed === '') {
                    parsedHtml += '<p style="margin-bottom: 10px;"></p>\n';
                } else {
                    parsedHtml += line + '<br>\n';
                }
            }
        });
        
        if (inList) {
            parsedHtml += '</ul>\n';
        }

        return parsedHtml;
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    function formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHr = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHr / 24);

        if (diffSec < 60) return 'Just now';
        if (diffMin < 60) return `${diffMin}m ago`;
        if (diffHr < 24) return `${diffHr}h ago`;
        if (diffDays === 1) return 'Yesterday';
        return `${diffDays} days ago`;
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function showToast(message, type = 'success') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'error' : ''}`;
        
        const icon = type === 'error' ? '🛡️' : '⚔️';
        
        toast.innerHTML = `
            <span>${icon}</span>
            <span>${message}</span>
        `;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeIn 0.3s ease reverse forwards';
            setTimeout(() => { toast.remove(); }, 300);
        }, 3500);
    }
});
