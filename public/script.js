class S3Gallery {
    constructor() {
        this.allImages = [];
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadImages();
    }

    initializeElements() {
        this.elements = {
            loadingMessage: document.getElementById('loadingMessage'),
            imageGrid: document.getElementById('imageGrid'),
            emptyMessage: document.getElementById('emptyMessage'),
            modal: document.getElementById('imageModal'),
            modalImage: document.getElementById('modalImage'),
            modalFileName: document.getElementById('modalFileName'),
            modalFileInfo: document.getElementById('modalFileInfo'),
            closeModal: document.querySelector('.close')
        };
    }

    attachEventListeners() {
        this.elements.closeModal.addEventListener('click', () => this.closeModal());
        this.elements.modal.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) this.closeModal();
        });

        // Handle ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    async loadImages() {
        try {
            this.elements.loadingMessage.style.display = 'block';
            this.elements.imageGrid.style.display = 'none';
            this.elements.emptyMessage.style.display = 'none';

            const response = await fetch('/api/images');
            if (!response.ok) throw new Error('Failed to load images');
            
            this.allImages = await response.json();
            this.updateUI();
        } catch (error) {
            console.error('Error loading images:', error);
            this.elements.loadingMessage.style.display = 'none';
            this.elements.emptyMessage.style.display = 'block';
        } finally {
            this.elements.loadingMessage.style.display = 'none';
        }
    }



    updateUI() {
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
        const fileName = image.key.split('/').pop();
        const fileSize = this.formatFileSize(image.size);
        const uploadDate = new Date(image.lastModified).toLocaleDateString();

        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        
        imageItem.innerHTML = `
            <div class="image-container">
                <img src="${image.url}" alt="${fileName}" loading="lazy">
                <button class="share-btn" onclick="event.stopPropagation()">
                    <i class="fas fa-share"></i>
                </button>
            </div>
            <div class="image-info">
                <div class="image-name">${fileName}</div>
                <div class="image-details">
                    ${fileSize} • ${uploadDate}
                </div>
            </div>
        `;

        // Add click listeners
        imageItem.addEventListener('click', () => this.openModal(image));
        
        const shareBtn = imageItem.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.shareImage(image);
        });

        return imageItem;
    }

    openModal(image) {
        const fileName = image.key.split('/').pop();
        const fileSize = this.formatFileSize(image.size);
        const uploadDate = new Date(image.lastModified).toLocaleString();

        this.elements.modalImage.src = image.url;
        this.elements.modalFileName.textContent = fileName;
        this.elements.modalFileInfo.textContent = `Size: ${fileSize} | Uploaded: ${uploadDate}`;
        
        this.elements.modal.style.display = 'block';
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.elements.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    async shareImage(image) {
        const fileName = image.key.split('/').pop();
        
        if (navigator.share) {
            // Use native sharing if available (mobile devices)
            try {
                await navigator.share({
                    title: fileName,
                    text: `Check out this image: ${fileName}`,
                    url: image.url
                });
            } catch (error) {
                console.log('Share cancelled or failed:', error);
            }
        } else {
            // Fallback: copy URL to clipboard
            try {
                await navigator.clipboard.writeText(image.url);
                this.showNotification('Image URL copied to clipboard!');
            } catch (error) {
                // Final fallback: manual URL display
                this.showUrlModal(image.url, fileName);
            }
        }
    }

    showUrlModal(url, fileName) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 20px;
                max-width: 90%;
                text-align: center;
            ">
                <h3 style="color: #E81C75; margin-bottom: 1rem;">Share ${fileName}</h3>
                <input type="text" value="${url}" style="
                    width: 100%;
                    padding: 1rem;
                    border: 2px solid #f0f0f0;
                    border-radius: 50px;
                    margin-bottom: 1rem;
                " readonly>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: #E81C75;
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 50px;
                    cursor: pointer;
                ">Close</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.querySelector('input').select();
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
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new S3Gallery();
}); 