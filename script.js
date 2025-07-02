class NoticeBoard {
    constructor() {
        this.notices = [];
        this.currentFilter = 'all';
        this.editingNotice = null;
        this.selectedTags = [];
        this.availableTags = new Set();
        this.currentTags = [];
        this.darkMode = localStorage.getItem('darkMode') === 'true';
        this.isAdmin = sessionStorage.getItem('isAdmin') === 'true';
        this.adminCode = 'teju_smp';
        this.pollInterval = null;
        this.lastModified = null;
        this.initializeTheme();
        this.initializeEditor();
        this.initializeEventListeners();
        this.initializeAdminState();
        this.initializeJSONBin();
    }

    initializeEventListeners() {
        // Modal controls
        document.getElementById('addNoticeBtn').addEventListener('click', () => this.openModal());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn').addEventListener('click', () => this.closeModal());
        document.getElementById('modalOverlay').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modalOverlay')) {
                this.closeModal();
            }
        });

        // Form submission
        document.getElementById('noticeForm').addEventListener('submit', (e) => this.handleFormSubmit(e));

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e.target.dataset.category));
        });
        
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        
        // Tag input
        document.getElementById('tagInput').addEventListener('keypress', (e) => this.handleTagInput(e));
        

        // Admin controls
        document.getElementById('adminLoginBtn').addEventListener('click', () => this.openAdminLogin());
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.adminLogout());
        document.getElementById('closeAdminModal').addEventListener('click', () => this.closeAdminLogin());
        document.getElementById('cancelAdminLogin').addEventListener('click', () => this.closeAdminLogin());
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => this.handleAdminLogin(e));

        // Set default date to today
        document.getElementById('noticeDate').valueAsDate = new Date();
    }

    openModal(notice = null) {
        // Check if admin privileges are required for adding or editing notices
        if (!this.isAdmin) {
            this.showNotification('Admin login required to add or edit notices', 'error');
            return;
        }
        
        this.editingNotice = notice;
        document.getElementById('modalOverlay').classList.add('active');
        document.body.style.overflow = 'hidden';
        
        if (notice) {
            // Populate form for editing
            document.getElementById('noticeTitle').value = notice.title;
            this.quill.root.innerHTML = notice.content;
            document.getElementById('noticeCategory').value = notice.category;
            document.getElementById('noticePriority').value = notice.priority;
            document.getElementById('noticeDate').value = notice.date;
            document.getElementById('noticeDeadline').value = notice.deadline || '';
            document.getElementById('noticeAuthor').value = notice.author;
            this.currentTags = [...(notice.tags || [])];
            this.renderTags();
            document.getElementById('submitBtn').textContent = 'Update Notice';
        } else {
            document.getElementById('submitBtn').textContent = 'Add Notice';
        }
    }

    closeModal() {
        document.getElementById('modalOverlay').classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('noticeForm').reset();
        document.getElementById('noticeDate').valueAsDate = new Date();
        this.quill.setContents([]);
        this.currentTags = [];
        this.renderTags();
        this.editingNotice = null;
    }

    async handleFormSubmit(e) {
        e.preventDefault();
        
        // Check if admin is logged in for adding/editing notices
        if (!this.isAdmin) {
            this.showNotification('Admin login required to add or edit notices', 'error');
            return;
        }
        
        // Get form values
        const title = document.getElementById('noticeTitle').value.trim();
        const content = this.quill.root.innerHTML.trim(); // Use HTML content for rich formatting
        const category = document.getElementById('noticeCategory').value;
        const date = document.getElementById('noticeDate').value;
        
        // Validate required fields
        if (!title) {
            this.showNotification('Please enter a title for the notice', 'error');
            document.getElementById('noticeTitle').focus();
            return;
        }
        
        // Validate content
        if (!content || content === '<p><br></p>' || this.quill.getText().trim().length === 0) {
            this.showNotification('Please enter content for the notice', 'error');
            this.quill.focus();
            return;
        }
        
        if (!category) {
            this.showNotification('Please select a category', 'error');
            document.getElementById('noticeCategory').focus();
            return;
        }
        
        if (!date) {
            this.showNotification('Please select a notice date', 'error');
            document.getElementById('noticeDate').focus();
            return;
        }
        
        const notice = {
            id: this.editingNotice ? this.editingNotice.id : Date.now().toString(),
            title: title,
            content: content,
            category: category,
            priority: document.getElementById('noticePriority').value || 'normal',
            date: date,
            deadline: document.getElementById('noticeDeadline').value || null,
            author: document.getElementById('noticeAuthor').value.trim() || 'Administration',
            tags: [...this.currentTags],
            timestamp: this.editingNotice ? this.editingNotice.timestamp : new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        try {
            if (this.editingNotice) {
                await this.updateNotice(notice);
            } else {
                await this.addNotice(notice);
            }
            this.closeModal();
        } catch (error) {
            console.error('Error saving notice:', error);
            this.showNotification('Error saving notice. Please try again.', 'error');
        }
    }

    async addNotice(notice) {
        if (this.isJSONBinConfigured()) {
            try {
                this.notices.unshift(notice);
                await this.saveToJSONBin();
                this.showNotification(`Notice "${notice.title}" added successfully!`, 'success');
            } catch (error) {
                console.error('Error adding notice to JSONBin:', error);
                this.showNotification('Error saving notice online. Changes saved locally.', 'error');
                this.saveNoticesLocally();
            }
        } else {
            this.notices.unshift(notice);
            this.saveNoticesLocally();
            this.updateAvailableTags();
            this.renderNotices();
        }
    }
    
    async updateNotice(notice) {
        if (this.isJSONBinConfigured()) {
            try {
                const index = this.notices.findIndex(n => n.id === notice.id);
                if (index !== -1) {
                    this.notices[index] = notice;
                    await this.saveToJSONBin();
                    this.showNotification(`Notice "${notice.title}" updated successfully!`, 'success');
                }
            } catch (error) {
                console.error('Error updating notice in JSONBin:', error);
                this.showNotification('Error updating notice online. Changes saved locally.', 'error');
                this.saveNoticesLocally();
            }
        } else {
            const index = this.notices.findIndex(n => n.id === notice.id);
            if (index !== -1) {
                this.notices[index] = notice;
                this.saveNoticesLocally();
                this.updateAvailableTags();
                this.renderNotices();
            }
        }
    }
    
    editNotice(id) {
        const notice = this.notices.find(n => n.id === id);
        if (notice) {
            this.openModal(notice);
        }
    }

    async deleteNotice(id) {
        if (!this.isAdmin) {
            this.showNotification('Admin login required to delete notices', 'error');
            return;
        }
        
        if (confirm('Are you sure you want to delete this notice?')) {
            if (this.isJSONBinConfigured()) {
                try {
                    this.notices = this.notices.filter(notice => notice.id !== id);
                    await this.saveToJSONBin();
                    this.showNotification('Notice deleted successfully!', 'success');
                } catch (error) {
                    console.error('Error deleting notice from JSONBin:', error);
                    this.showNotification('Error deleting notice online. Removed locally.', 'error');
                    this.saveNoticesLocally();
                    this.renderNotices();
                }
            } else {
                this.notices = this.notices.filter(notice => notice.id !== id);
                this.saveNoticesLocally();
                this.renderNotices();
                this.showNotification('Notice deleted successfully!', 'success');
            }
        }
    }

    
    toggleTheme() {
        this.darkMode = !this.darkMode;
        localStorage.setItem('darkMode', this.darkMode);
        document.body.classList.toggle('dark-mode', this.darkMode);
        document.getElementById('themeToggle').innerHTML = 
            this.darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    }
    
    initializeTheme() {
        if (this.darkMode) {
            document.body.classList.add('dark-mode');
            document.getElementById('themeToggle').innerHTML = '<i class="fas fa-sun"></i>';
        }
    }
    
    initializeEditor() {
        this.quill = new Quill('#noticeContentEditor', {
            theme: 'snow',
            placeholder: 'Enter notice content...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline'],
                    ['link', 'blockquote'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['clean']
                ]
            }
        });
    }

    handleFilter(category) {
        this.currentFilter = category;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        this.renderNotices();
    }

    getFilteredNotices() {
        let filtered = this.notices;

        // Apply category filter
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(notice => notice.category === this.currentFilter);
        }

        // Apply tag filter
        if (this.selectedTags.length > 0) {
            filtered = filtered.filter(notice => 
                this.selectedTags.every(tag => (notice.tags || []).includes(tag))
            );
        }

        // Apply sorting (default to date-desc)
        filtered.sort((a, b) => {
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        return filtered;
    }

    renderNotices() {
        const noticesGrid = document.getElementById('noticesGrid');
        const emptyState = document.getElementById('emptyState');
        const filteredNotices = this.getFilteredNotices();

        if (filteredNotices.length === 0) {
            noticesGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        noticesGrid.style.display = 'grid';
        emptyState.style.display = 'none';

        noticesGrid.innerHTML = filteredNotices.map(notice => this.createNoticeCard(notice)).join('');

        // Add event listeners for notice actions
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteNotice(btn.dataset.id);
            });
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.editNotice(btn.dataset.id);
            });
        });
        
        document.querySelectorAll('.notice-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTagFilter(tag.textContent.trim());
            });
        });
    }

    createNoticeCard(notice) {
        const formatDate = (dateString) => {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
            });
        };

        const getCategoryIcon = (category) => {
            const icons = {
                academic: 'fas fa-graduation-cap',
                events: 'fas fa-calendar-alt',
                exams: 'fas fa-file-alt',
                urgent: 'fas fa-exclamation-triangle',
                scholarship: 'fas fa-award',
                'fee-payments': 'fas fa-credit-card',
                admission: 'fas fa-user-plus',
                placement: 'fas fa-briefcase',
                library: 'fas fa-book'
            };
            return icons[category] || 'fas fa-bell';
        };

        const getPriorityClass = (priority) => {
            return priority === 'critical' ? 'priority-critical' : 
                   priority === 'high' ? 'priority-high' : '';
        };


        return `
            <div class="notice-card ${notice.category} ${getPriorityClass(notice.priority)}">
                <div class="notice-header">
                    <h3 class="notice-title">${this.escapeHtml(notice.title)}</h3>
                    <div class="notice-badges">
                        <span class="notice-category ${notice.category}">
                            <i class="${getCategoryIcon(notice.category)}"></i>
                            ${notice.category}
                        </span>
                        ${notice.priority !== 'normal' ? `<span class="priority-badge ${notice.priority}">
                            <i class="fas fa-flag"></i>
                            ${notice.priority}
                        </span>` : ''}
                    </div>
                </div>
                <div class="notice-content">
                    ${notice.content}
                </div>
                ${notice.deadline ? `<div class="deadline-info">
                    <i class="fas fa-clock"></i>
                    <span>Deadline: ${formatDate(notice.deadline)}</span>
                </div>` : ''}
                ${notice.tags && notice.tags.length > 0 ? `<div class="notice-tags">
                    ${notice.tags.map(tag => `<span class="notice-tag">${this.escapeHtml(tag)}</span>`).join('')}
                </div>` : ''}
                <div class="notice-footer">
                    <div class="notice-info">
                        <div class="notice-date">
                            <i class="fas fa-calendar"></i>
                            ${formatDate(notice.date)}
                        </div>
                        <div class="notice-author">
                            <i class="fas fa-user"></i>
                            ${this.escapeHtml(notice.author)}
                        </div>
                    </div>
                    <div class="notice-actions">
                        ${this.isAdmin ? `
                            <button class="edit-btn" data-id="${notice.id}" title="Edit Notice">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="delete-btn" data-id="${notice.id}" title="Delete Notice">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : `
                            <span class="admin-required" title="Admin login required for editing">
                                <i class="fas fa-lock"></i>
                            </span>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add notification styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#2ed573' : type === 'error' ? '#ff4757' : '#667eea',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            zIndex: '9999',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.9rem',
            fontWeight: '500',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    initializeJSONBin() {
        if (this.isJSONBinConfigured()) {
            this.loadFromJSONBin();
            this.startPolling();
        } else {
            console.log('JSONBin not configured, using local storage');
            this.loadNoticesLocally();
        }
    }

    isJSONBinConfigured() {
        return window.JSONBIN_CONFIG && 
               window.JSONBIN_CONFIG.apiKey !== 'YOUR_API_KEY' && 
               window.JSONBIN_CONFIG.binId !== 'YOUR_BIN_ID';
    }

    async loadFromJSONBin() {
        this.showSyncStatus('syncing');
        try {
            const response = await fetch(`${window.JSONBIN_CONFIG.baseUrl}/b/${window.JSONBIN_CONFIG.binId}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': window.JSONBIN_CONFIG.apiKey,
                    'X-Bin-Meta': 'true'
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.notices = result.record?.notices || result.notices || [];
                this.lastModified = result.metadata?.version_updated || response.headers.get('X-Bin-Version-Updated') || new Date().toISOString();
                
                if (this.notices.length === 0) {
                    this.notices = this.loadSampleNotices();
                    await this.saveToJSONBin();
                } else {
                    this.saveNoticesLocally(); // Save loaded data locally as backup
                    this.showSyncStatus('synced');
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading from JSONBin:', error);
            this.showNotification('Error connecting to server. Using offline mode.', 'error');
            this.showSyncStatus('offline');
            this.loadNoticesLocally();
        }
        
        this.updateAvailableTags();
        this.renderNotices();
    }

    async saveToJSONBin() {
        if (!this.isJSONBinConfigured()) return;
        
        try {
            const response = await fetch(`${window.JSONBIN_CONFIG.baseUrl}/b/${window.JSONBIN_CONFIG.binId}`, {
                method: 'PUT',
                headers: {
                    'X-Master-Key': window.JSONBIN_CONFIG.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    notices: this.notices,
                    lastUpdated: new Date().toISOString()
                })
            });

            if (response.ok) {
                const result = await response.json();
                this.lastModified = result.metadata.version_updated;
                this.saveNoticesLocally(); // Also save locally as backup
                this.updateAvailableTags();
                this.renderNotices();
                this.showSyncStatus('synced');
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error saving to JSONBin:', error);
            this.showSyncStatus('error');
            throw error;
        }
    }

    async checkForUpdates() {
        if (!this.isJSONBinConfigured()) return;
        
        try {
            const response = await fetch(`${window.JSONBIN_CONFIG.baseUrl}/b/${window.JSONBIN_CONFIG.binId}/latest`, {
                method: 'GET',
                headers: {
                    'X-Master-Key': window.JSONBIN_CONFIG.apiKey,
                    'X-Bin-Meta': 'true'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const lastModified = result.metadata?.version_updated || response.headers.get('X-Bin-Version-Updated');
                
                if (lastModified && lastModified !== this.lastModified) {
                    this.notices = result.record?.notices || result.notices || [];
                    this.lastModified = lastModified;
                    this.saveNoticesLocally(); // Save updated data locally
                    this.updateAvailableTags();
                    this.renderNotices();
                    this.showSyncStatus('updated');
                }
                this.showSyncStatus('synced');
            } else {
                this.showSyncStatus('error');
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
            this.showSyncStatus('offline');
        }
    }

    startPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        // Poll every 5 seconds for updates (faster sync)
        this.pollInterval = setInterval(() => {
            this.checkForUpdates();
        }, 5000);
        
        // Also check for updates when window gains focus
        window.addEventListener('focus', () => {
            this.checkForUpdates();
        });
    }

    loadNoticesLocally() {
        try {
            const stored = localStorage.getItem('college-notices');
            if (stored) {
                this.notices = JSON.parse(stored);
            } else {
                this.notices = this.loadSampleNotices();
                this.saveNoticesLocally();
            }
        } catch (error) {
            console.error('Error loading notices locally:', error);
            this.notices = this.loadSampleNotices();
        }
        this.updateAvailableTags();
        this.renderNotices();
    }

    loadSampleNotices() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const pastDate = new Date(today);
        pastDate.setDate(today.getDate() - 2);
        
        return [
            {
                id: '1',
                title: 'Mid-Semester Examination Schedule Released',
                content: 'The mid-semester examination schedule for all departments has been published. Students are advised to check their respective department notice boards and prepare accordingly.',
                category: 'exams',
                priority: 'high',
                date: today.toISOString().split('T')[0],
                deadline: nextWeek.toISOString().split('T')[0],
                author: 'Examination Controller',
                timestamp: today.toISOString()
            },
            {
                id: '2',
                title: 'Assignment Submission - Database Systems',
                content: 'Final assignment for Database Systems course is due tomorrow. Late submissions will not be accepted without prior approval.',
                category: 'academic',
                priority: 'critical',
                date: today.toISOString().split('T')[0],
                deadline: tomorrow.toISOString().split('T')[0],
                author: 'Computer Science Department',
                timestamp: today.toISOString()
            },
            {
                id: '3',
                title: 'Library Timings Extended',
                content: 'Due to upcoming examinations, the library timings have been extended. The library will now remain open from 8:00 AM to 10:00 PM on weekdays.',
                category: 'academic',
                priority: 'normal',
                date: today.toISOString().split('T')[0],
                deadline: null,
                author: 'Library Administration',
                timestamp: today.toISOString()
            },
            {
                id: '4',
                title: 'Fee Payment Overdue Notice',
                content: 'Students who have not paid their semester fees are reminded that the payment was due two days ago. Please clear your dues immediately to avoid penalties.',
                category: 'urgent',
                priority: 'critical',
                date: today.toISOString().split('T')[0],
                deadline: pastDate.toISOString().split('T')[0],
                author: 'Accounts Department',
                timestamp: today.toISOString()
            },
            {
                id: '5',
                title: 'Annual Cultural Fest - Registrations Open',
                content: 'Registration is now open for the Annual Cultural Festival. Students can participate in various events including dance, music, drama, and literary competitions.',
                category: 'events',
                priority: 'normal',
                date: today.toISOString().split('T')[0],
                deadline: nextWeek.toISOString().split('T')[0],
                author: 'Cultural Committee',
                timestamp: today.toISOString()
            }
        ];
    }

    saveNoticesLocally() {
        try {
            localStorage.setItem('college-notices', JSON.stringify(this.notices));
        } catch (error) {
            console.error('Error saving notices locally:', error);
            this.showNotification('Error saving notice locally. Please try again.', 'error');
        }
    }
    
    updateAvailableTags() {
        this.availableTags.clear();
        this.notices.forEach(notice => {
            (notice.tags || []).forEach(tag => this.availableTags.add(tag));
        });
    }
    
    handleTagInput(e) {
        if (e.key === 'Enter' && e.target.value.trim()) {
            e.preventDefault();
            const tag = e.target.value.trim().toLowerCase();
            if (!this.currentTags.includes(tag)) {
                this.currentTags.push(tag);
                this.renderTags();
            }
            e.target.value = '';
        }
    }
    
    renderTags() {
        const container = document.getElementById('tagsDisplay');
        container.innerHTML = this.currentTags.map(tag => 
            `<span class="tag-item">${this.escapeHtml(tag)}<button type="button" onclick="noticeBoard.removeTag('${tag}')">×</button></span>`
        ).join('');
    }
    
    removeTag(tag) {
        this.currentTags = this.currentTags.filter(t => t !== tag);
        this.renderTags();
    }
    
    toggleTagFilter(tag) {
        const index = this.selectedTags.indexOf(tag);
        if (index === -1) {
            this.selectedTags.push(tag);
        } else {
            this.selectedTags.splice(index, 1);
        }
        this.renderActiveTagFilters();
        this.renderNotices();
    }
    
    renderActiveTagFilters() {
        const container = document.getElementById('activeTags');
        container.innerHTML = this.selectedTags.map(tag => 
            `<span class="active-tag">${this.escapeHtml(tag)}<button onclick="noticeBoard.toggleTagFilter('${tag}')">×</button></span>`
        ).join('');
    }
    
    
    initializeAdminState() {
        this.updateAdminUI();
    }
    
    openAdminLogin() {
        document.getElementById('adminLoginModal').classList.add('active');
        document.body.style.overflow = 'hidden';
        document.getElementById('adminPassword').focus();
        document.getElementById('loginError').style.display = 'none';
    }
    
    closeAdminLogin() {
        document.getElementById('adminLoginModal').classList.remove('active');
        document.body.style.overflow = 'auto';
        document.getElementById('adminLoginForm').reset();
        document.getElementById('loginError').style.display = 'none';
    }
    
    handleAdminLogin(e) {
        e.preventDefault();
        const password = document.getElementById('adminPassword').value;
        
        if (password === this.adminCode) {
            this.isAdmin = true;
            sessionStorage.setItem('isAdmin', 'true');
            this.updateAdminUI();
            this.closeAdminLogin();
            this.renderNotices(); // Re-render to show admin controls
            this.showNotification('Admin login successful!', 'success');
        } else {
            document.getElementById('loginError').style.display = 'block';
            document.getElementById('adminPassword').value = '';
            document.getElementById('adminPassword').focus();
        }
    }
    
    adminLogout() {
        if (confirm('Are you sure you want to logout from admin mode?')) {
            this.isAdmin = false;
            sessionStorage.removeItem('isAdmin');
            this.updateAdminUI();
            this.renderNotices(); // Re-render to hide admin controls
            this.showNotification('Admin logout successful', 'success');
        }
    }
    
    updateAdminUI() {
        const adminLoginBtn = document.getElementById('adminLoginBtn');
        const adminLogoutBtn = document.getElementById('adminLogoutBtn');
        const addNoticeBtn = document.getElementById('addNoticeBtn');
        
        if (this.isAdmin) {
            adminLoginBtn.style.display = 'none';
            adminLogoutBtn.style.display = 'flex';
            addNoticeBtn.style.display = 'flex';
        } else {
            adminLoginBtn.style.display = 'flex';
            adminLogoutBtn.style.display = 'none';
            addNoticeBtn.style.display = 'none';
        }
    }
    
    showSyncStatus(status) {
        // Remove existing sync status indicators
        const existingStatus = document.querySelector('.sync-status');
        if (existingStatus) {
            existingStatus.remove();
        }
        
        // Create sync status indicator
        const statusElement = document.createElement('div');
        statusElement.className = `sync-status ${status}`;
        
        let icon, text, color;
        switch (status) {
            case 'syncing':
                icon = 'fas fa-sync-alt fa-spin';
                text = 'Syncing...';
                color = '#ffa726';
                break;
            case 'synced':
                icon = 'fas fa-check-circle';
                text = 'Synced';
                color = '#66bb6a';
                break;
            case 'updated':
                icon = 'fas fa-arrow-down';
                text = 'Updated';
                color = '#42a5f5';
                break;
            case 'offline':
                icon = 'fas fa-wifi-slash';
                text = 'Offline';
                color = '#ef5350';
                break;
            case 'error':
                icon = 'fas fa-exclamation-triangle';
                text = 'Sync Error';
                color = '#ff7043';
                break;
            default:
                return;
        }
        
        statusElement.innerHTML = `<i class="${icon}"></i> ${text}`;
        
        Object.assign(statusElement.style, {
            position: 'fixed',
            bottom: '20px',
            left: '20px',
            background: color,
            color: 'white',
            padding: '8px 12px',
            borderRadius: '20px',
            fontSize: '0.85rem',
            fontWeight: '500',
            zIndex: '9998',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.3s ease'
        });
        
        document.body.appendChild(statusElement);
        
        // Auto-hide success status after 3 seconds
        if (status === 'synced' || status === 'updated') {
            setTimeout(() => {
                if (statusElement.parentNode) {
                    statusElement.style.opacity = '0';
                    statusElement.style.transform = 'translateY(10px)';
                    setTimeout(() => {
                        if (statusElement.parentNode) {
                            statusElement.parentNode.removeChild(statusElement);
                        }
                    }, 300);
                }
            }, 3000);
        }
    }
}

// Initialize the notice board when DOM is loaded
let noticeBoard;
document.addEventListener('DOMContentLoaded', () => {
    noticeBoard = new NoticeBoard();
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N to add new notice
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        document.getElementById('addNoticeBtn').click();
    }
    
    // Escape to close modal
    if (e.key === 'Escape') {
        const modal = document.getElementById('modalOverlay');
        if (modal.classList.contains('active')) {
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
});
