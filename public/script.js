class S3Gallery {
    constructor() {
        this.allImages = [];
        this.checkInterval = null;
        this.isChecking = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.loadImages();
        this.startAutoCheck();
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
            closeModal: document.querySelector('.close'),
            refreshButton: this.createRefreshButton()
        };
    }

    createRefreshButton() {
        const refreshButton = document.createElement('button');
        refreshButton.id = 'refreshButton';
        refreshButton.innerHTML = '🔄 Check for New Images';
        refreshButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #E81C75;
            color: white;
            border: none;
            padding: 12px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 12px rgba(232, 28, 117, 0.3);
            z-index: 1000;
            transition: all 0.3s ease;
        `;
        
        refreshButton.addEventListener('mouseenter', () => {
            refreshButton.style.background = '#d0195a';
            refreshButton.style.transform = 'scale(1.05)';
        });
        
        refreshButton.addEventListener('mouseleave', () => {
            refreshButton.style.background = '#E81C75';
            refreshButton.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(refreshButton);
        return refreshButton;
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
        
        // Add refresh button listener
        this.elements.refreshButton.addEventListener('click', () => this.manualRefresh());
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

        const imageItem = document.createElement('div');
        imageItem.className = 'image-item';
        
        imageItem.innerHTML = `
            <div class="image-container">
                <img src="${image.url}" alt="${fileName}" loading="lazy">
                <button class="share-btn" onclick="event.stopPropagation()">
                    <img src="share.png" alt="Share">
                </button>
            </div>
        `;

        // Add click listeners - both image and share button open full screen
        imageItem.addEventListener('click', () => this.openFullScreen(image));
        
        const shareBtn = imageItem.querySelector('.share-btn');
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.openFullScreen(image);
        });

        return imageItem;
    }

    openFullScreen(image) {
        // Show the watermarked image in full screen for easy save to camera roll
        this.elements.modalImage.src = image.url;
        this.elements.modal.style.display = 'block';
        
        // Prevent body scrolling
        document.body.style.overflow = 'hidden';
    }

    setupModalButtons() {
        const downloadOriginal = document.getElementById('downloadOriginal');
        const downloadWatermarked = document.getElementById('downloadWatermarked');
        const toggleWatermark = document.getElementById('toggleWatermark');
        const toggleText = document.getElementById('toggleText');

        // Remove existing listeners
        downloadOriginal.replaceWith(downloadOriginal.cloneNode(true));
        downloadWatermarked.replaceWith(downloadWatermarked.cloneNode(true));
        toggleWatermark.replaceWith(toggleWatermark.cloneNode(true));

        // Get fresh references
        const newDownloadOriginal = document.getElementById('downloadOriginal');
        const newDownloadWatermarked = document.getElementById('downloadWatermarked');
        const newToggleWatermark = document.getElementById('toggleWatermark');
        const newToggleText = document.getElementById('toggleText');

        // Add event listeners
        newDownloadOriginal.addEventListener('click', () => this.downloadOriginal());
        newDownloadWatermarked.addEventListener('click', () => this.downloadWatermarked());
        newToggleWatermark.addEventListener('click', () => this.toggleWatermarkView());

        // Reset toggle button text
        newToggleText.textContent = 'Show with Logo';
    }

    downloadOriginal() {
        if (!this.currentImage) return;
        
        const fileName = this.currentImage.key.split('/').pop();
        const downloadUrl = `/api/download/${encodeURIComponent(this.currentImage.key)}`;
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.showNotification('Downloading original image...');
    }

    downloadWatermarked() {
        if (!this.currentImage) return;
        
        this.showNotification('Creating watermarked image...');
        
        // Create canvas for watermarking
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Load the main image
        const mainImage = new Image();
        mainImage.crossOrigin = 'anonymous';
        
        mainImage.onload = () => {
            console.log('Main image loaded:', mainImage.width, 'x', mainImage.height);
            
            // Set canvas size to exactly 880x1184
            canvas.width = 880;
            canvas.height = 1184;
            
            // Draw the main image scaled to fit the canvas
            ctx.drawImage(mainImage, 0, 0, 880, 1184);
            
            // Load the overlay
            const overlay = new Image();
            overlay.crossOrigin = 'anonymous';
            
            overlay.onload = () => {
                console.log('Overlay loaded:', overlay.width, 'x', overlay.height);
                
                // Calculate overlay size (15% of image width)
                const overlayWidth = Math.floor(880 * 0.15);
                const overlayHeight = (overlay.height * overlayWidth) / overlay.width;
                
                // Position in bottom-right corner with 20px margin
                const x = 880 - overlayWidth - 20;
                const y = 1184 - overlayHeight - 20;
                
                console.log('Applying overlay at:', x, y, 'size:', overlayWidth, 'x', overlayHeight);
                
                // Draw the overlay
                ctx.globalAlpha = 0.9; // Slightly more opaque for better visibility
                ctx.drawImage(overlay, x, y, overlayWidth, overlayHeight);
                ctx.globalAlpha = 1.0;
                
                // Convert canvas to blob and download
                canvas.toBlob((blob) => {
                    if (!blob) {
                        this.showNotification('Error creating watermarked image');
                        return;
                    }
                    
                    const fileName = this.currentImage.key.split('/').pop();
                    const watermarkedName = fileName.replace(/\.[^/.]+$/, '_watermarked.jpg');
                    
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = watermarkedName;
                    link.style.display = 'none';
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    // Clean up
                    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
                    this.showNotification('✅ Watermarked image downloaded!');
                    
                    console.log('Watermarked image downloaded successfully');
                }, 'image/jpeg', 0.95); // Higher quality
            };
            
            overlay.onerror = (error) => {
                console.error('Error loading overlay:', error);
                this.showNotification('❌ Error loading watermark overlay');
            };
            
            overlay.src = '/overlay.png';
        };
        
        mainImage.onerror = (error) => {
            console.error('Error loading main image:', error);
            this.showNotification('❌ Error loading image for watermarking');
        };
        
        mainImage.src = this.currentImage.url;
    }

    toggleWatermarkView() {
        if (!this.currentImage) return;
        
        const toggleText = document.getElementById('toggleText');
        const modalImage = this.elements.modalImage;
        
        if (this.isShowingWatermark) {
            // Switch to original
            modalImage.src = this.currentImage.url;
            toggleText.textContent = 'Show with Logo';
            this.isShowingWatermark = false;
        } else {
            // Create watermarked preview
            this.createWatermarkedPreview();
        }
    }

    createWatermarkedPreview() {
        const toggleText = document.getElementById('toggleText');
        const modalImage = this.elements.modalImage;
        
        // Create canvas for preview
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Load the main image
        const mainImage = new Image();
        mainImage.crossOrigin = 'anonymous';
        
        mainImage.onload = () => {
            console.log('Preview: Main image loaded:', mainImage.width, 'x', mainImage.height);
            
            // Set canvas size to exactly 880x1184
            canvas.width = 880;
            canvas.height = 1184;
            
            // Draw the main image scaled to fit the canvas
            ctx.drawImage(mainImage, 0, 0, 880, 1184);
            
            // Load the overlay
            const overlay = new Image();
            overlay.crossOrigin = 'anonymous';
            
            overlay.onload = () => {
                console.log('Preview: Overlay loaded:', overlay.width, 'x', overlay.height);
                
                // Calculate overlay size (15% of image width)
                const overlayWidth = Math.floor(880 * 0.15);
                const overlayHeight = (overlay.height * overlayWidth) / overlay.width;
                
                // Position in bottom-right corner with 20px margin
                const x = 880 - overlayWidth - 20;
                const y = 1184 - overlayHeight - 20;
                
                console.log('Preview: Applying overlay at:', x, y, 'size:', overlayWidth, 'x', overlayHeight);
                
                // Draw the overlay
                ctx.globalAlpha = 0.9; // Same opacity as download
                ctx.drawImage(overlay, x, y, overlayWidth, overlayHeight);
                ctx.globalAlpha = 1.0;
                
                // Convert canvas to data URL and display
                const dataURL = canvas.toDataURL('image/jpeg', 0.95);
                modalImage.src = dataURL;
                toggleText.textContent = 'Show Original';
                this.isShowingWatermark = true;
                
                console.log('Watermarked preview created successfully');
            };
            
            overlay.onerror = (error) => {
                console.error('Preview: Error loading overlay:', error);
                this.showNotification('❌ Error loading watermark overlay for preview');
            };
            
            overlay.src = '/overlay.png';
        };
        
        mainImage.onerror = (error) => {
            console.error('Preview: Error loading main image:', error);
            this.showNotification('❌ Error loading image for watermark preview');
        };
        
        mainImage.src = this.currentImage.url;
    }

    closeModal() {
        this.elements.modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }

    async shareImage(image) {
        const fileName = image.key.split('/').pop();
        
        // Create watermarked image and download for camera roll
        this.downloadWatermarkedForShare(image, fileName);
    }

    async downloadWatermarkedForShare(image, fileName) {
        try {
            this.showNotification('📱 Preparing image for camera roll...');
            
            // Create canvas for watermarked version
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Load the main image
            const mainImage = new Image();
            mainImage.crossOrigin = 'anonymous';
            
            mainImage.onload = () => {
                // Set canvas size to exactly 880x1184 (portrait format)
                canvas.width = 880;
                canvas.height = 1184;
                
                // Draw the main image scaled to fit
                ctx.drawImage(mainImage, 0, 0, 880, 1184);
                
                // Load the overlay
                const overlay = new Image();
                overlay.crossOrigin = 'anonymous';
                
                overlay.onload = () => {
                    // Full-width overlay at bottom (like server-side)
                    const overlayWidth = 880; // Full width
                    const overlayHeight = (overlay.height * overlayWidth) / overlay.width;
                    
                    // Position at bottom with no padding
                    const x = 0;
                    const y = 1184 - overlayHeight;
                    
                    // Draw the overlay
                    ctx.globalAlpha = 0.9;
                    ctx.drawImage(overlay, x, y, overlayWidth, overlayHeight);
                    ctx.globalAlpha = 1.0;
                    
                    // Convert to blob and download
                    canvas.toBlob((blob) => {
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = fileName.replace('.jpg', '_mielle.jpg');
                        link.style.display = 'none';
                        
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Clean up
                        URL.revokeObjectURL(url);
                        
                        this.showNotification('💾 Image saved! Check your Downloads or Camera Roll');
                    }, 'image/jpeg', 0.95);
                };
                
                overlay.onerror = () => {
                    this.showNotification('❌ Error loading watermark overlay');
                };
                
                overlay.src = '/overlay.png';
            };
            
            mainImage.onerror = () => {
                this.showNotification('❌ Error loading image');
            };
            
            mainImage.src = image.url;
            
        } catch (error) {
            console.error('Error creating watermarked image for share:', error);
            this.showNotification('❌ Error preparing image for download');
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

    startAutoCheck() {
        // Check for new images every 10 seconds
        this.checkInterval = setInterval(() => {
            this.checkForNewImages();
        }, 10000);
    }

    async checkForNewImages() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        
        try {
            const response = await fetch('/api/check-new-images');
            if (!response.ok) throw new Error('Failed to check for new images');
            
            const data = await response.json();
            
            // Handle deleted images
            if (data.deletedImages && data.deletedImages.length > 0) {
                console.log(`${data.deletedImages.length} images were deleted from S3`);
                
                // Update our local array to match server state
                this.allImages = this.allImages.filter(img => 
                    !data.deletedImages.some(deletedImg => deletedImg.key === img.key)
                );
                
                // Refresh the entire UI to reflect deletions
                this.updateUI();
                
                this.showNotification(`🗑️ ${data.deletedImages.length} image${data.deletedImages.length > 1 ? 's' : ''} removed`);
            }
            
            // Handle new images
            if (data.newImages && data.newImages.length > 0) {
                console.log(`Found ${data.newImages.length} new images`);
                
                // Add new images to the beginning of our array
                this.allImages = [...data.newImages, ...this.allImages];
                
                // Update the UI
                this.updateUI();
                
                // Show notification
                this.showNotification(`🎉 ${data.newImages.length} new image${data.newImages.length > 1 ? 's' : ''} found!`);
                
                // Highlight new images
                this.highlightNewImages(data.newImages);
            }
            
            // If we have significant changes (new + deleted > 0), sync with server's total count
            if ((data.newCount + data.deletedCount) > 0) {
                console.log(`Total images: ${data.totalImages} (was ${this.allImages.length})`);
                
                // If there's a mismatch, reload all images to ensure sync
                if (this.allImages.length !== data.totalImages) {
                    console.log('Image count mismatch, reloading all images...');
                    await this.loadImages();
                }
            }
            
        } catch (error) {
            console.error('Error checking for new images:', error);
        } finally {
            this.isChecking = false;
        }
    }

    highlightNewImages(newImages) {
        // Add a "NEW" badge to new images for 10 seconds
        setTimeout(() => {
            newImages.forEach(newImage => {
                const imageElements = document.querySelectorAll('.image-item');
                imageElements.forEach(element => {
                    const img = element.querySelector('img');
                    if (img && img.src.includes(encodeURIComponent(newImage.key))) {
                        // Add NEW badge
                        const badge = document.createElement('div');
                        badge.className = 'new-badge';
                        badge.textContent = 'NEW';
                        badge.style.cssText = `
                            position: absolute;
                            top: 10px;
                            left: 10px;
                            background: #00ff00;
                            color: #000;
                            padding: 4px 8px;
                            border-radius: 12px;
                            font-size: 12px;
                            font-weight: bold;
                            z-index: 10;
                            animation: pulse 1s infinite;
                        `;
                        
                        element.querySelector('.image-container').appendChild(badge);
                        
                        // Remove badge after 10 seconds
                        setTimeout(() => {
                            if (badge.parentNode) {
                                badge.parentNode.removeChild(badge);
                            }
                        }, 10000);
                    }
                });
            });
        }, 100);
    }

    async manualRefresh() {
        const originalText = this.elements.refreshButton.innerHTML;
        this.elements.refreshButton.innerHTML = '🔄 Checking...';
        this.elements.refreshButton.disabled = true;
        
        try {
            await this.checkForNewImages();
            this.showNotification('✅ Refresh completed!');
        } catch (error) {
            this.showNotification('❌ Error checking for new images');
        } finally {
            this.elements.refreshButton.innerHTML = originalText;
            this.elements.refreshButton.disabled = false;
        }
    }

    cleanup() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
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
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    .image-container {
        position: relative;
    }
`;
document.head.appendChild(style);

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.s3Gallery = new S3Gallery();
    
    // Cleanup when page is unloaded
    window.addEventListener('beforeunload', () => {
        if (window.s3Gallery && window.s3Gallery.checkInterval) {
            clearInterval(window.s3Gallery.checkInterval);
        }
    });
}); 