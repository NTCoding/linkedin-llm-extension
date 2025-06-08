import { debugLog, LogLevel, visualizeElement } from './utils/logger';

export class ImageAnalyzer {
    private faceDetectionEnabled: boolean = false;
    
    private imageSelectors = [
        'img',
        '.ivm-view-attr__img-wrapper img',
        '.feed-shared-image__container img',
        '.feed-shared-article__image-container img',
        '.feed-shared-image img',
        '.entity-image'
    ];
    
    private profilePicSelectors = [
        '.update-components-actor__avatar-image',
        '.presence-entity__image',
        '.feed-shared-actor__avatar',
        '.evi-image'
    ];

    constructor() {
        debugLog('ImageAnalyzer initialized');
        
        // Check if we can use the Face Detection API
        if ('FaceDetector' in window) {
            this.faceDetectionEnabled = true;
            debugLog('Face Detection API is available', null, LogLevel.INFO);
        } else {
            debugLog('Face Detection API is not available, using fallback detection', null, LogLevel.WARN);
        }
    }

    public containsAuthorImage(postElement: HTMLElement): boolean {
        debugLog('Analyzing post for author images', postElement);
        
        try {
            // Get all image elements in the post
            let imageElements: NodeListOf<HTMLImageElement> = postElement.querySelectorAll('img');
            
            if (imageElements.length === 0) {
                // Try with our more specific selectors
                for (const selector of this.imageSelectors) {
                    imageElements = postElement.querySelectorAll(selector);
                    if (imageElements.length > 0) {
                        debugLog(`Found ${imageElements.length} images with selector: ${selector}`);
                        break;
                    }
                }
            }
            
            if (imageElements.length === 0) {
                debugLog('No images found in post', null, LogLevel.DEBUG);
                return false;
            }
            
            debugLog(`Found ${imageElements.length} total images in post`);
            
            // Log details about each image
            for (let i = 0; i < Math.min(imageElements.length, 5); i++) {
                const img = imageElements[i];
                visualizeElement(img, `Image #${i+1} in post`);
                debugLog(`Image #${i+1} details:`, {
                    src: img.src ? (img.src.length > 100 ? img.src.substring(0, 100) + '...' : img.src) : 'No src',
                    width: img.width,
                    height: img.height,
                    className: img.className,
                    alt: img.alt
                });
            }
            
            // Filter out profile pictures
            const contentImages = Array.from(imageElements).filter(img => {
                // Check if it's a profile pic using our selectors
                let isProfilePic = false;
                for (const selector of this.profilePicSelectors) {
                    if (img.matches(selector)) {
                        isProfilePic = true;
                        debugLog(`Image matched profile pic selector: ${selector}`, img);
                        break;
                    }
                }
                
                // Also exclude by size (profile pics are usually small)
                if (!isProfilePic && img.width > 0 && img.width < 80) {
                    isProfilePic = true;
                    debugLog(`Image appears to be a profile pic based on size: ${img.width}x${img.height}`, img);
                }
                
                return !isProfilePic;
            });
            
            debugLog(`Found ${contentImages.length} content images (excluding profile pics)`);
            
            // If the post has at least one content image, we'll assume it contains 
            // an image of the author (this is a simplification)
            const containsAuthorImage = contentImages.length > 0;
            debugLog(`Post ${containsAuthorImage ? 'contains' : 'does not contain'} author images`);
            
            return containsAuthorImage;
        } catch (error) {
            debugLog('Error analyzing images in post', error, LogLevel.ERROR);
            return false;
        }
    }

    // Advanced implementation (if browser supports Face Detection API)
    private async containsFaceInImage(imageUrl: string): Promise<boolean> {
        if (!this.faceDetectionEnabled) {
            debugLog('Face detection skipped - API not available', null, LogLevel.DEBUG);
            return true;
        }

        try {
            debugLog(`Analyzing image for faces: ${imageUrl.substring(0, 100)}...`);
            
            // Create a temporary image element
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // Wait for the image to load
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = (error) => {
                    debugLog('Error loading image', error, LogLevel.WARN);
                    reject(error);
                };
                img.src = imageUrl;
            });

            debugLog(`Image loaded successfully: ${img.width}x${img.height}`);
            
            // Create a canvas and draw the image
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                debugLog('Failed to get canvas context', null, LogLevel.WARN);
                return false;
            }
            
            ctx.drawImage(img, 0, 0);

            debugLog('Image drawn to canvas, detecting faces...');
            
            // Detect faces in the image
            // @ts-ignore - FaceDetector might not be recognized by TypeScript
            const faceDetector = new FaceDetector();
            // @ts-ignore
            const faces = await faceDetector.detect(img);
            
            debugLog(`Face detection complete. Found ${faces.length} faces.`, faces);
            
            return faces.length > 0;
        } catch (error) {
            debugLog('Error detecting faces', error, LogLevel.ERROR);
            return false;
        }
    }
}