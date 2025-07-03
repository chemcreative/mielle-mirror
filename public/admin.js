class S3AdminMonitor {
    constructor() {
        this.pollingInterval = null;
        this.isPolling = true;
        this.POLL_INTERVAL = 5000; // 5 seconds
        this.allImages = [];
        this.newImageKeys = new Set();
        this.PASSWORD = 'chemlab305';
        
        this.initializeElements();
        this.attachEventListeners();
        this.checkAuth();
    }

    initializeElements() {
        this.elements = {
            // Login elements
            loginScreen: document.getElementById('loginScreen'),
            adminContent: document.getElementById('adminContent'),
            loginForm: document.getElementById('loginForm'),
            passwordInput: document.getElementById('passwordInput'),
            loginError: document.getElementById('loginError'),
            logoutBtn: document.getElementById('logoutBtn'),
            
            // Admin elements
            totalCount: document.getElementById('totalCount'),
            newCount: document.getElementById('newCount'),
            status: document.getElementById('status'),
            refreshBtn: document.getElementById('refreshBtn'),
            togglePolling: document.getElementById('togglePolling'),
            loadingMessage: document.getElementById('loadingMessage'),
            imageGrid: document.getElementById('imageGrid'),
            emptyMessage: document.getElementById('emptyMessage'),
            modal: document.getElementById('imageModal'),
            modalImage: document.getElementById('modalImage'),
            modalFileName: document.getElementById('modalFileName'),
            modalFileInfo: document.getElementById('modalFileInfo'),
            modalDownloadBtn: document.getElementById('modalDownloadBtn'),
            closeModal: document.querySelector('.close')
        };
    }

    attachEventListeners() {
        // Login events
        this.elements.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.elements.logoutBtn.addEventListener('click', () => this.logout());
        
        // Admin events
        this.elements.refreshBtn.addEventListener('click', () => this.checkForNewImages());
        this.elements.togglePolling.addEventListener('click', () => this.togglePolling());
        this.elements.closeModal.addEventListener('click', () => this.closeModal());
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeModal();
        });

        // Handle ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    checkAuth() {
        const isAuthenticated = sessionStorage.getItem('adminAuth') === 'true';
        if (isAuthenticated) {
            this.showAdminContent();
        } else {
            this.showLoginScreen();
        }
    }

    handleLogin(e) {
        e.preventDefault();
        const password = this.elements.passwordInput.value;
        
        if (password === this.PASSWORD) {
            sessionStorage.setItem('adminAuth', 'true');
            this.showAdminContent();
        } else {
            this.showLoginError('Incorrect password');
            this.elements.passwordInput.value = '';
        }
    }

    logout() {
        sessionStorage.removeItem('adminAuth');
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        this.showLoginScreen();
    }

    showLoginScreen() {
        this.elements.loginScreen.style.display = 'flex';
        this.elements.adminContent.style.display = 'none';
        this.elements.passwordInput.focus();
    }

    showAdminContent() {
        this.elements.loginScreen.style.display = 'none';
        this.elements.adminContent.style.display = 'block';
        this.startPolling();
    }

    showLoginError(message) {
        this.elements.loginError.textContent = message;
        this.elements.loginError.classList.add('show');
        setTimeout(() => {
            this.elements.loginError.classList.remove('show');
        }, 3000);
    }

    updateStatus(message, type = 'checking') {
        this.elements.status.textContent = message;
        this.elements.status.className = `stat-value status-${type}`;
    }

    async loadInitialImages() {
        try {
            this.updateStatus('Loading...', 'checking');
            this.elements.loadingMessage.style.display = 'block';
            this.elements.imageGrid.style.display = 'none';
            this.elements.emptyMessage.style.display = 'none';

            const response = await fetch('/api/images');
            if (!response.ok) throw new Error('Failed to load images');
            
            this.allImages = await response.json();
            this.updateUI();
            this.updateStatus('Connected', 'connected');
        } catch (error) {
            console.error('Error loading initial images:', error);
            this.updateStatus('Error', 'error');
            this.showError('Failed to load images from S3 bucket');
        } finally {
            this.elements.loadingMessage.style.display = 'none';
        }
    }

    async checkForNewImages() {
        try {
            this.updateStatus('Checking...', 'checking');
            
            const response = await fetch('/api/check-new-images');
            if (!response.ok) throw new Error('Failed to check for new images');
            
            const data = await response.json();
            
            // Mark new images
            data.newImages.forEach(img => {
                this.newImageKeys.add(img.key);
            });

            // Update all images list
            this.allImages = await this.getAllImages();
            this.updateUI();
            
            this.elements.newCount.textContent = data.newCount;
            this.updateStatus('Connected', 'connected');

            // Show notification for new images
            if (data.newCount > 0) {
                this.showNotification(`${data.newCount} new image${data.newCount > 1 ? 's' : ''} found!`);
                
                // Clear new image indicators after 5 seconds
                setTimeout(() => {
                    this.newImageKeys.clear();
                    this.updateUI();
                }, 5000);
            }
        } catch (error) {
            console.error('Error checking for new images:', error);
            this.updateStatus('Error', 'error');
        }
    }

    async getAllImages() {
        const response = await fetch('/api/images');
        if (!response.ok) throw new Error('Failed to get images');
        return await response.json();
    }

    updateUI() {
        this.elements.totalCount.textContent = this.allImages.length;
        
        if (this.allImages.length === 0) {
            this.elements.imageGrid.style.display = 'none';
            this.elements.emptyMessage.style.display = 'block';
        } else {
            this.elements.imageGrid.style.display = 'grid';
            this.elements.emptyMessage.style.display = 'none';
            this.renderImages();
        }
    }

    renderImages() {
        this.elements.imageGrid.innerHTML = '';
        
        this.allImages.forEach(image => {
            const imageElement = this.createImageElement(image);
            this.elements.imageGrid.appendChild(imageElement);
        });
    }

    createImageElement(image) {
        const isNew = this.newImageKeys.has(image.key);
        const fileName = image.key.split('/').pop();
        const fileSize = this.formatFileSize(image.size);
        const uploadDate = new Date(image.lastModified).toLocaleDateString();

        const imageItem = document.createElement('div');
        imageItem.className = `image-item ${isNew ? 'new-image' : ''}`;
        
        imageItem.innerHTML = `
            <div class="image-container">
                <img src="${image.url}" alt="${fileName}" loading="lazy">
                ${isNew ? '<div class="new-badge">NEW</div>' : ''}
            </div>
            <div class="image-info">
                <div class="image-name">${fileName}</div>
                <div class="image-details">
                    ${fileSize} • ${uploadDate}
                </div>
            </div>
        `;

        // Add click listeners - open full screen for easy save to camera roll
        imageItem.addEventListener('click', () => this.openFullScreen(image));

        return imageItem;
    }

    openFullScreen(image) {
        // Show the watermarked image in full screen for easy save to camera roll
        this.elements.modalImage.src = image.url;
        this.elements.modal.style.display = 'block';
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.elements.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    async downloadImage(image) {
        try {
            const fileName = image.key.split('/').pop();
            const downloadUrl = `/api/download/${encodeURIComponent(image.key)}`;
            
            // Create a temporary link and trigger download
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification(`Downloading ${fileName}...`);
        } catch (error) {
            console.error('Error downloading image:', error);
            this.showError('Failed to download image');
        }
    }

    startPolling() {
        this.loadInitialImages();
        
        this.pollingInterval = setInterval(() => {
            if (this.isPolling) {
                this.checkForNewImages();
            }
        }, this.POLL_INTERVAL);
    }

    togglePolling() {
        this.isPolling = !this.isPolling;
        
        if (this.isPolling) {
            this.elements.togglePolling.innerHTML = '<i class="fas fa-pause"></i> Pause Auto-Check';
            this.elements.togglePolling.className = 'btn btn-secondary';
            this.updateStatus('Connected', 'connected');
        } else {
            this.elements.togglePolling.innerHTML = '<i class="fas fa-play"></i> Resume Auto-Check';
            this.elements.togglePolling.className = 'btn btn-primary';
            this.updateStatus('Paused', 'checking');
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #E81C75;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 20px;
            box-shadow: 0 4px 12px rgba(232, 28, 117, 0.3);
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    showError(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #666;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Initialize the admin application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new S3AdminMonitor();
}); 