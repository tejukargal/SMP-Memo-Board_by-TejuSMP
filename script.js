class NoticeBoard {
    constructor() {
        this.notices = [];
        this.currentFilter = 'all';
        this.editingNotice = null;
        this.selectedTags = [];
        this.availableTags = new Set();
        this.currentTags = [];
        this.currentAttachments = [];
        this.maxFileSize = 5 * 1024 * 1024; // 5MB
        this.allowedFileTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf', 'text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
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
        
        // File attachment handling
        document.getElementById('noticeAttachments').addEventListener('change', (e) => this.handleFileSelection(e));
        this.setupFileDragDrop();

        // Admin controls
        document.getElementById('adminLoginBtn').addEventListener('click', () => this.openAdminLogin());
        document.getElementById('adminLogoutBtn').addEventListener('click', () => this.adminLogout());
        document.getElementById('closeAdminModal').addEventListener('click', () => this.closeAdminLogin());
        document.getElementById('cancelAdminLogin').addEventListener('click', () => this.closeAdminLogin());
        document.getElementById('adminLoginForm').addEventListener('submit', (e) => this.handleAdminLogin(e));

        // About modal controls
        document.querySelector('.animated-title').addEventListener('dblclick', () => this.openAboutModal());
        document.getElementById('closeAboutModal').addEventListener('click', () => this.closeAboutModal());
        document.getElementById('closeAboutBtn').addEventListener('click', () => this.closeAboutModal());
        document.getElementById('aboutModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('aboutModal')) {
                this.closeAboutModal();
            }
        });

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
            this.currentAttachments = [...(notice.attachments || [])];
            this.renderTags();
            this.updateAttachmentsPreview();
            this.updateDisplayOrderOptions();
            document.getElementById('noticeOrder').value = notice.displayOrder || this.getNextDisplayOrder();
            document.getElementById('submitBtn').textContent = 'Update Notice';
        } else {
            this.updateDisplayOrderOptions();
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
        this.currentAttachments = [];
        this.renderTags();
        this.updateAttachmentsPreview();
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
            attachments: [...this.currentAttachments],
            displayOrder: this.handleDisplayOrderAssignment(document.getElementById('noticeOrder').value || this.getNextDisplayOrder()),
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

    setupFileDragDrop() {
        const fileInputContainer = document.querySelector('.file-input-container');
        const fileInput = document.getElementById('noticeAttachments');
        
        fileInputContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileInputContainer.classList.add('drag-over');
        });
        
        fileInputContainer.addEventListener('dragleave', (e) => {
            e.preventDefault();
            if (!fileInputContainer.contains(e.relatedTarget)) {
                fileInputContainer.classList.remove('drag-over');
            }
        });
        
        fileInputContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            fileInputContainer.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            this.handleFiles(files);
        });
        
        fileInputContainer.addEventListener('click', () => {
            fileInput.click();
        });
    }

    handleFileSelection(e) {
        const files = e.target.files;
        this.handleFiles(files);
    }

    async handleFiles(files) {
        const validFiles = [];
        
        for (let file of files) {
            if (this.validateFile(file)) {
                try {
                    const fileData = await this.readFileAsBase64(file);
                    validFiles.push({
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        data: fileData,
                        id: Date.now() + Math.random()
                    });
                } catch (error) {
                    console.error('Error reading file:', error);
                    this.showNotification(`Error reading file: ${file.name}`, 'error');
                }
            }
        }
        
        this.currentAttachments = [...this.currentAttachments, ...validFiles];
        this.updateAttachmentsPreview();
    }

    validateFile(file) {
        if (!this.allowedFileTypes.includes(file.type)) {
            this.showNotification(`File type not allowed: ${file.name}`, 'error');
            return false;
        }
        
        if (file.size > this.maxFileSize) {
            this.showNotification(`File too large: ${file.name} (Max 5MB)`, 'error');
            return false;
        }
        
        return true;
    }

    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    updateAttachmentsPreview() {
        const preview = document.getElementById('attachmentsPreview');
        preview.innerHTML = '';
        
        this.currentAttachments.forEach((attachment, index) => {
            const attachmentEl = document.createElement('div');
            attachmentEl.className = 'attachment-item';
            
            const fileIcon = this.getFileIcon(attachment.type);
            const fileSize = this.formatFileSize(attachment.size);
            
            attachmentEl.innerHTML = `
                <div class="attachment-info">
                    <i class="${fileIcon}"></i>
                    <div class="attachment-details">
                        <span class="attachment-name">${attachment.name}</span>
                        <span class="attachment-size">${fileSize}</span>
                    </div>
                </div>
                <button type="button" class="remove-attachment" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            attachmentEl.querySelector('.remove-attachment').addEventListener('click', () => {
                this.removeAttachment(index);
            });
            
            preview.appendChild(attachmentEl);
        });
    }

    getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return 'fas fa-image';
        if (fileType === 'application/pdf') return 'fas fa-file-pdf';
        if (fileType.includes('csv') || fileType.includes('excel') || fileType.includes('spreadsheet')) return 'fas fa-file-excel';
        if (fileType.includes('word') || fileType.includes('document')) return 'fas fa-file-word';
        return 'fas fa-file';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    removeAttachment(index) {
        this.currentAttachments.splice(index, 1);
        this.updateAttachmentsPreview();
    }

    downloadAttachment(attachment) {
        const link = document.createElement('a');
        link.href = attachment.data;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        this.showNotification(`Downloading ${attachment.name}`, 'success');
    }

    previewAttachment(attachment) {
        if (!attachment.type.startsWith('image/')) {
            this.showNotification('Preview only available for images', 'error');
            return;
        }

        // Create preview modal
        const previewModal = document.createElement('div');
        previewModal.className = 'preview-modal-overlay';
        previewModal.innerHTML = `
            <div class="preview-modal">
                <div class="preview-header">
                    <h3>${this.escapeHtml(attachment.name)}</h3>
                    <button class="close-preview-btn">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="preview-content">
                    <img src="${attachment.data}" alt="${this.escapeHtml(attachment.name)}" class="preview-image">
                </div>
                <div class="preview-footer">
                    <button class="download-preview-btn">
                        <i class="fas fa-download"></i>
                        Download
                    </button>
                </div>
            </div>
        `;

        // Add event listeners
        previewModal.querySelector('.close-preview-btn').addEventListener('click', () => {
            document.body.removeChild(previewModal);
            document.body.style.overflow = 'auto';
        });

        previewModal.querySelector('.download-preview-btn').addEventListener('click', () => {
            this.downloadAttachment(attachment);
        });

        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                document.body.removeChild(previewModal);
                document.body.style.overflow = 'auto';
            }
        });

        document.body.appendChild(previewModal);
        document.body.style.overflow = 'hidden';
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

        // Apply sorting (display order first, then by date)
        filtered.sort((a, b) => {
            // First, sort by display order (01, 02, 03, then others)
            const orderA = a.displayOrder || '99';
            const orderB = b.displayOrder || '99';
            
            if (orderA !== orderB) {
                return orderA.localeCompare(orderB);
            }
            
            // If display order is the same, sort by timestamp (newest first)
            return new Date(b.timestamp) - new Date(a.timestamp);
        });

        return filtered;
    }

    renderNotices() {
        const noticesGrid = document.getElementById('noticesGrid');
        const emptyState = document.getElementById('emptyState');
        const filteredNotices = this.getFilteredNotices();

        // Render dynamic category filters
        this.renderCategoryFilters();

        if (filteredNotices.length === 0) {
            noticesGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        noticesGrid.style.display = 'flex';
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

        // Add event listeners for attachment actions
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const attachmentData = JSON.parse(btn.closest('.attachment-item-display').dataset.attachment);
                this.downloadAttachment(attachmentData);
            });
        });

        document.querySelectorAll('.preview-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const attachmentData = JSON.parse(btn.closest('.attachment-item-display').dataset.attachment);
                this.previewAttachment(attachmentData);
            });
        });
    }

    renderCategoryFilters() {
        const filterButtons = document.querySelector('.filter-buttons');
        
        // Get categories that have notices
        const categoriesWithNotices = new Set();
        this.notices.forEach(notice => {
            categoriesWithNotices.add(notice.category);
        });

        // Define category labels
        const categoryLabels = {
            academic: 'Academic',
            events: 'Events',
            exams: 'Exams',
            urgent: 'Urgent',
            scholarship: 'Scholarship',
            'fee-payments': 'Fee Payments',
            admission: 'Admission',
            placement: 'Placement',
            library: 'Library'
        };

        // Build filter buttons HTML
        let buttonsHTML = '<button class="filter-btn active" data-category="all">All</button>';
        
        Object.keys(categoryLabels).forEach(category => {
            if (categoriesWithNotices.has(category)) {
                const isActive = this.currentFilter === category ? 'active' : '';
                buttonsHTML += `<button class="filter-btn ${isActive}" data-category="${category}">${categoryLabels[category]}</button>`;
            }
        });

        filterButtons.innerHTML = buttonsHTML;

        // Re-attach event listeners for filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e.target.dataset.category));
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
                    ${this.processContentURLs(notice.content)}
                </div>
                ${notice.deadline ? `<div class="deadline-info">
                    <i class="fas fa-clock"></i>
                    <span>Deadline: ${formatDate(notice.deadline)}</span>
                </div>` : ''}
                ${notice.tags && notice.tags.length > 0 ? `<div class="notice-tags">
                    ${notice.tags.map(tag => `<span class="notice-tag">${this.escapeHtml(tag)}</span>`).join('')}
                </div>` : ''}
                ${notice.attachments && notice.attachments.length > 0 ? `<div class="notice-attachments">
                    <h4><i class="fas fa-paperclip"></i> Attachments (${notice.attachments.length})</h4>
                    <div class="attachments-list">
                        ${notice.attachments.map(attachment => `
                            <div class="attachment-item-display" data-attachment='${JSON.stringify(attachment)}'>
                                <div class="attachment-info">
                                    <i class="${this.getFileIcon(attachment.type)}"></i>
                                    <div class="attachment-details">
                                        <span class="attachment-name">${this.escapeHtml(attachment.name)}</span>
                                        <span class="attachment-size">${this.formatFileSize(attachment.size)}</span>
                                    </div>
                                </div>
                                <div class="attachment-actions">
                                    ${attachment.type.startsWith('image/') ? `
                                        <button class="preview-btn" title="Preview Image">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    ` : ''}
                                    <button class="download-btn" title="Download">
                                        <i class="fas fa-download"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
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

    processContentURLs(content) {
        // URL regex pattern
        const urlRegex = /(https?:\/\/[^\s<>"]+)/gi;
        
        let urlIndex = 0;
        const urlColors = [
            '#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b',
            '#fa709a', '#ffecd2', '#a8edea', '#fed6e3', '#fdbb2d',
            '#ee9ca7', '#ffdde1', '#89f7fe', '#66a6ff', '#f78ca0'
        ];
        
        return content.replace(urlRegex, (url) => {
            const color = urlColors[urlIndex % urlColors.length];
            urlIndex++;
            
            return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="notice-url" style="background-color: ${color};">
                ${url}
            </a>`;
        });
    }

    getNextDisplayOrder() {
        // Get all existing display orders
        const existingOrders = this.notices.map(notice => notice.displayOrder || '99').sort();
        
        // Find the next available order (01, 02, 03, then incrementing)
        for (let i = 1; i <= 99; i++) {
            const order = i.toString().padStart(2, '0');
            if (!existingOrders.includes(order)) {
                return order;
            }
        }
        
        // If all orders are taken, return 99
        return '99';
    }

    updateDisplayOrderOptions() {
        const orderSelect = document.getElementById('noticeOrder');
        const usedOrders = this.notices
            .filter(notice => notice.id !== (this.editingNotice ? this.editingNotice.id : null))
            .map(notice => notice.displayOrder || '99');
        
        // Reset options
        orderSelect.innerHTML = '';
        
        // Add available options (1-20 should be enough for most use cases)
        for (let i = 1; i <= 20; i++) {
            const order = i.toString().padStart(2, '0');
            const isUsed = usedOrders.includes(order);
            const option = document.createElement('option');
            option.value = order;
            option.textContent = `${order} - ${this.getOrderLabel(i)}${isUsed ? ' (Currently Used)' : ''}`;
            orderSelect.appendChild(option);
        }
        
        // Set default to next available order if creating new notice
        if (!this.editingNotice) {
            const nextOrder = this.getNextDisplayOrder();
            orderSelect.value = nextOrder;
        }
    }

    getOrderLabel(num) {
        const labels = {
            1: 'First', 2: 'Second', 3: 'Third', 4: 'Fourth', 5: 'Fifth',
            6: 'Sixth', 7: 'Seventh', 8: 'Eighth', 9: 'Ninth', 10: 'Tenth',
            11: 'Eleventh', 12: 'Twelfth', 13: 'Thirteenth', 14: 'Fourteenth', 15: 'Fifteenth',
            16: 'Sixteenth', 17: 'Seventeenth', 18: 'Eighteenth', 19: 'Nineteenth', 20: 'Twentieth'
        };
        return labels[num] || `${num}th`;
    }

    handleDisplayOrderAssignment(requestedOrder) {
        // If editing existing notice, check if the order is taken by others
        const currentNoticeId = this.editingNotice ? this.editingNotice.id : null;
        const existingNoticeWithOrder = this.notices.find(notice => 
            notice.displayOrder === requestedOrder && notice.id !== currentNoticeId
        );

        if (existingNoticeWithOrder) {
            // If order is taken, push the existing notice to the next available order
            const nextOrder = this.getNextDisplayOrder();
            existingNoticeWithOrder.displayOrder = nextOrder;
            this.showNotification(`Notice "${existingNoticeWithOrder.title}" moved to position ${nextOrder}`, 'info');
        }

        return requestedOrder;
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add notification styles
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: type === 'success' ? '#2ed573' : type === 'error' ? '#ff4757' : type === 'warning' ? '#ffa502' : '#667eea',
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
                const cloudNotices = result.record?.notices || result.notices || [];
                const attachmentsStripped = result.record?.attachmentsStripped || result.attachmentsStripped || false;
                this.lastModified = result.metadata?.version_updated || response.headers.get('X-Bin-Version-Updated') || new Date().toISOString();
                
                if (cloudNotices.length === 0) {
                    this.notices = this.loadSampleNotices();
                    await this.saveToJSONBin();
                } else {
                    // If attachments were stripped from cloud storage, merge with local data
                    if (attachmentsStripped) {
                        const localNotices = this.getLocalNotices();
                        this.notices = this.mergeNoticesWithAttachments(cloudNotices, localNotices);
                    } else {
                        this.notices = cloudNotices;
                    }
                    this.saveNoticesLocally(); // Save loaded data locally as backup
                }
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error loading from JSONBin:', error);
            this.showNotification('Error connecting to server. Using offline mode.', 'error');
            this.loadNoticesLocally();
        }
        
        this.updateAvailableTags();
        this.renderNotices();
    }

    async saveToJSONBin() {
        if (!this.isJSONBinConfigured()) return;
        
        try {
            // Check payload size before sending
            const payload = {
                notices: this.notices,
                lastUpdated: new Date().toISOString()
            };
            
            const payloadSize = JSON.stringify(payload).length;
            const maxSize = 500000; // 500KB limit for JSONBin
            
            if (payloadSize > maxSize) {
                // Try to save without file attachments if payload is too large
                console.warn('Payload too large, attempting to save without file attachments');
                const noticesWithoutAttachments = this.notices.map(notice => {
                    const { attachments, ...noticeWithoutAttachments } = notice;
                    return {
                        ...noticeWithoutAttachments,
                        hasAttachments: attachments && attachments.length > 0,
                        attachmentCount: attachments ? attachments.length : 0
                    };
                });
                
                payload.notices = noticesWithoutAttachments;
                payload.attachmentsStripped = true;
                
                this.showNotification('File attachments saved locally only due to size limits', 'warning');
            }
            
            const response = await fetch(`${window.JSONBIN_CONFIG.baseUrl}/b/${window.JSONBIN_CONFIG.binId}`, {
                method: 'PUT',
                headers: {
                    'X-Master-Key': window.JSONBIN_CONFIG.apiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const result = await response.json();
                this.lastModified = result.metadata.version_updated;
                this.saveNoticesLocally(); // Also save locally as backup with full data
                this.updateAvailableTags();
                this.renderNotices();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        } catch (error) {
            console.error('Error saving to JSONBin:', error);
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
                    const cloudNotices = result.record?.notices || result.notices || [];
                    const attachmentsStripped = result.record?.attachmentsStripped || result.attachmentsStripped || false;
                    
                    // If attachments were stripped from cloud storage, merge with local data
                    if (attachmentsStripped) {
                        const localNotices = this.getLocalNotices();
                        this.notices = this.mergeNoticesWithAttachments(cloudNotices, localNotices);
                    } else {
                        this.notices = cloudNotices;
                    }
                    
                    this.lastModified = lastModified;
                    this.saveNoticesLocally(); // Save updated data locally
                    this.updateAvailableTags();
                    this.renderNotices();
                }
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
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

    getLocalNotices() {
        try {
            const stored = localStorage.getItem('college-notices');
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading local notices:', error);
            return [];
        }
    }

    mergeNoticesWithAttachments(cloudNotices, localNotices) {
        // Create a map of local notices for quick lookup
        const localNoticesMap = new Map();
        localNotices.forEach(notice => {
            localNoticesMap.set(notice.id, notice);
        });

        // Merge cloud notices with local attachments
        return cloudNotices.map(cloudNotice => {
            const localNotice = localNoticesMap.get(cloudNotice.id);
            if (localNotice && localNotice.attachments && localNotice.attachments.length > 0) {
                // Use local attachments if available
                return {
                    ...cloudNotice,
                    attachments: localNotice.attachments
                };
            }
            return cloudNotice;
        });
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
    
    openAboutModal() {
        document.getElementById('aboutModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    closeAboutModal() {
        document.getElementById('aboutModal').classList.remove('active');
        document.body.style.overflow = 'auto';
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