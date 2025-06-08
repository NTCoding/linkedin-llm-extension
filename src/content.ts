import { LLMDetector } from './llmDetector';
import { ImageAnalyzer } from './imageAnalyzer';
import { debugLog, LogLevel, visualizeElement, countVisiblePosts, updateStats, DEBUG_MODE } from './utils/logger';
import { DebugConsole } from './utils/debugConsole';

// Global debug console instance
const debugConsole = new DebugConsole();

// Global detector instance
let detectorInstance: LinkedInLLMDetector;

// Function to establish connection with background script
function connectToBackgroundScript() {
    debugLog('Attempting to connect to background script', null, LogLevel.INFO);
    try {
        // Send a ping message to the background script to establish connection
        chrome.runtime.sendMessage({ action: 'ping' }, (response) => {
            if (chrome.runtime.lastError) {
                debugLog(`Connection error: ${chrome.runtime.lastError.message}`, null, LogLevel.ERROR);
                // Try again after a delay (exponential backoff would be better in production)
                setTimeout(connectToBackgroundScript, 1000);
            } else {
                debugLog('Successfully connected to background script', response, LogLevel.INFO);
            }
        });
    } catch (error) {
        debugLog('Error connecting to background script', error, LogLevel.ERROR);
    }
}

class LinkedInLLMDetector {
    private llmDetector: LLMDetector;
    private imageAnalyzer: ImageAnalyzer;
    private mutationObserver!: MutationObserver; // Using definite assignment assertion
    private processedPosts: Set<string> = new Set();
    private postSelectors: string[] = [
        '.feed-shared-update-v2',
        '.occludable-update',
        '.feed-shared-card',
        'div[data-urn]',
        'div[data-id]',
        'div[data-test-id="feed-shared-update"]'
    ];
    private feedContainerSelectors: string[] = [
        '.core-rail',
        '.feed-container',
        'div[role="main"]',
        '#voyager-feed',
        '.scaffold-finite-scroll__content'
    ];

    constructor() {
        debugLog('Initializing LinkedIn Self-Centered Post Detector', null, LogLevel.INFO);
        this.llmDetector = new LLMDetector();
        this.imageAnalyzer = new ImageAnalyzer();
        this.setupMutationObserver();
        this.injectStyles();
        
        // Analyze the page after a short delay to ensure content is loaded
        setTimeout(() => {
            countVisiblePosts();
            this.processExistingPosts();
        }, 2000);
    }

    /**
     * Public method to analyze the current feed
     * This can be called from outside the class
     */
    public analyze(): void {
        debugLog('Manual analysis triggered via public analyze() method', null, LogLevel.INFO);
        countVisiblePosts();
        this.processExistingPosts();
    }

    private setupMutationObserver(): void {
        debugLog('Setting up mutation observer');
        
        this.mutationObserver = new MutationObserver((mutations) => {
            debugLog(`Mutation observed: ${mutations.length} mutations`, {
                addedNodes: mutations.reduce((count, m) => count + m.addedNodes.length, 0)
            });
            
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length) {
                    this.processNewNodes(mutation.addedNodes);
                }
            });
        });

        // Try to find the feed container with different selectors
        let feedContainer: Element | null = null;
        for (const selector of this.feedContainerSelectors) {
            feedContainer = document.querySelector(selector);
            if (feedContainer) {
                debugLog(`Found feed container with selector: ${selector}`, feedContainer);
                break;
            }
        }

        if (feedContainer) {
            this.mutationObserver.observe(feedContainer, { childList: true, subtree: true });
            debugLog('Mutation observer attached to feed container', null, LogLevel.INFO);
        } else {
            debugLog('Failed to find feed container - will observe body instead', null, LogLevel.WARN);
            // Fall back to observing the body if we can't find a more specific container
            this.mutationObserver.observe(document.body, { childList: true, subtree: true });
        }
    }

    private processExistingPosts(): void {
        debugLog('Processing existing posts');
        let posts: NodeListOf<Element> = [] as any;
        // Try each selector until we find posts
        for (const selector of this.postSelectors) {
            const foundPosts = document.querySelectorAll(selector);
            if (foundPosts.length > 0) {
                debugLog(`Found ${foundPosts.length} posts with selector: ${selector}`);
                posts = foundPosts;
                break;
            }
        }
        debugLog(`Found ${posts.length} existing posts to process`);
        posts.forEach((post) => this.processPost(post as HTMLElement));
        // Update posts analyzed counter
        updateStats('postsAnalyzed', posts.length);
    }

    private processNewNodes(nodes: NodeList): void {
        nodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                
                // Check if the added node is a post using various selectors
                let isPost = false;
                for (const selector of this.postSelectors) {
                    if (element.matches(selector)) {
                        isPost = true;
                        debugLog(`Direct match: Node is a post (${selector})`, element);
                        this.processPost(element);
                        break;
                    }
                }
                
                if (!isPost) {
                    // Check if it contains posts
                    for (const selector of this.postSelectors) {
                        const posts = element.querySelectorAll(selector);
                        if (posts.length) {
                            debugLog(`Found ${posts.length} posts inside added node (${selector})`, element);
                            posts.forEach((post) => this.processPost(post as HTMLElement));
                            break;
                        }
                    }
                }
            }
        });
    }

    private processPost(postElement: HTMLElement): void {
        try {
            // Extract post content with various selectors
            const contentSelectors = [
                '.feed-shared-update-v2__description-wrapper',
                '.feed-shared-text',
                '.update-components-text',
                'span[dir="ltr"]',
                'div[data-test-id="main-feed-activity-card__commentary"]'
            ];
            let contentElement: Element | null = null;
            for (const selector of contentSelectors) {
                contentElement = postElement.querySelector(selector);
                if (contentElement) {
                    break;
                }
            }
            if (!contentElement) {
                return;
            }
            const content = contentElement.textContent || '';

            // Extract author name with various selectors
            const actorSelectors = [
                '.update-components-actor__title',
                '.feed-shared-actor__title',
                '.update-components-actor__name',
                'a[data-test-id="actor-name"]',
                '.feed-shared-actor__name',
                'span[dir="auto"]',
                'a.update-components-actor__meta-link span[dir="ltr"]',
            ];
            let actorElement: Element | null = null;
            for (const selector of actorSelectors) {
                actorElement = postElement.querySelector(selector);
                if (actorElement) {
                    break;
                }
            }
            let authorName = '';
            if (actorElement) {
                // Get the innermost span content for the author name
                const spanLtr = actorElement.querySelector('span[dir="ltr"]');
                if (spanLtr) {
                    // Just get the text content directly - LinkedIn provides the name correctly inside the span
                    authorName = spanLtr.textContent?.trim() || '';
                } else {
                    authorName = actorElement.textContent?.trim() || '';
                }
            } else {
                const metaLink = postElement.querySelector('a.update-components-actor__meta-link');
                if (metaLink) {
                    const spanLtr = metaLink.querySelector('span[dir="ltr"]');
                    if (spanLtr) {
                        authorName = spanLtr.textContent?.trim() || '';
                    } else {
                        authorName = metaLink.textContent?.trim() || '';
                    }
                }
            }
            // Clean up author name: remove LinkedIn-specific designations if any remain
            if (authorName) {
                // First, remove any direct duplications (e.g. "Manuel PaisManuel Pais")
                // This specific fix handles the exact case where a name is duplicated without spaces
                const isDuplicated = /^(.+)\1$/.test(authorName);
                if (isDuplicated) {
                    authorName = authorName.substring(0, authorName.length / 2);
                }
                
                // Then remove common LinkedIn designations and noise that might appear after the name
                authorName = authorName.replace(/(?:\s+•\s+(?:(?:Premium)|(?:\d+(?:er|nd|rd|th))|(?:1er)))+.*$/i, '').trim();
            }

            // --- TRANSPARENT LOGIC & SINGLE LOG ---
            let isSelfCentred = false;
            let decisionReason = [] as string[];
            let matchedKeywords: string[] = [];
            let containsKeywords = false;
            let containsAuthorImage = false;

            // Rule 1: Author name contains 'Maxime'
            if (authorName && /maxime/i.test(authorName)) {
                isSelfCentred = true;
                decisionReason.push("Author name contains 'Maxime'");
            } else {
                // Rule 2: Content contains self-centered keywords
                containsKeywords = this.llmDetector.containsLLMKeyword(content);
                if (containsKeywords) {
                    // Find which keywords matched (from debugLog in LLMDetector)
                    matchedKeywords = this.llmDetector
                        ['selfCenteredKeywords']
                        .filter(kw => content.toLowerCase().includes(kw.toLowerCase()));
                    decisionReason.push(`Matched keywords: ${matchedKeywords.join(', ')}`);
                    // Rule 3: Post contains author image
                    containsAuthorImage = this.imageAnalyzer.containsAuthorImage(postElement);
                    if (containsAuthorImage) {
                        isSelfCentred = true;
                        decisionReason.push('Post contains author image');
                    } else {
                        decisionReason.push('No author image found');
                    }
                } else {
                    decisionReason.push('No self-centered keywords found');
                }
            }

            // --- SINGLE TRANSPARENT LOG ---
            debugLog(
                `Post processed for author: ${authorName} | Decision: ${isSelfCentred ? 'SELF-CENTRED' : 'not self-centred'}`,
                {
                    author: authorName,
                    contentPreview: content.length > 120 ? content.substring(0, 120) + '...' : content,
                    isSelfCentred,
                    decisionReason
                },
                LogLevel.INFO
            );

            if (isSelfCentred) {
                this.highlightPost(postElement);
                this.addUnsubscribeButton(postElement);
                updateStats('llmPostsFound');
            }
        } catch (error) {
            debugLog('Error processing post', error, LogLevel.ERROR);
        }
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    private highlightPost(postElement: HTMLElement): void {
        debugLog('Highlighting post as self-centered');
        postElement.classList.add('self-centered-post-detected');
        // Add a more obvious indicator (animation + badge)
        postElement.style.boxShadow = '0 0 16px 4px #e94c2b, 0 0 0 6px #fff inset';
        postElement.style.animation = 'selfCenteredPulse 1.2s cubic-bezier(0.4,0,0.2,1)';
        // Add warning badge
        const badge = document.createElement('div');
        badge.className = 'self-centered-warning-badge';
        badge.textContent = '🚨 Self-Centered Post Detected';
        badge.title = 'This post is self-centered and contains the author\'s image or matches detection rules';
        badge.style.fontSize = '15px';
        badge.style.letterSpacing = '0.5px';
        badge.style.padding = '6px 14px';
        badge.style.background = 'linear-gradient(90deg, #e94c2b 60%, #ffb347 100%)';
        badge.style.boxShadow = '0 2px 8px rgba(233,76,43,0.15)';
        // Insert at the top of the post
        postElement.insertBefore(badge, postElement.firstChild);
        // Highlight keywords in the post
        const contentElement = postElement.querySelector('.feed-shared-update-v2__description-wrapper') || 
                              postElement.querySelector('.feed-shared-text') ||
                              postElement.querySelector('.update-components-text');
        if (contentElement) {
            this.llmDetector.highlightLLMMentions(contentElement as HTMLElement);
        }
        // Add keyframes for pulse animation if not already present
        if (!document.getElementById('selfCenteredPulseKeyframes')) {
            const style = document.createElement('style');
            style.id = 'selfCenteredPulseKeyframes';
            style.textContent = `@keyframes selfCenteredPulse {
                0% { box-shadow: 0 0 0 0 #e94c2b66; }
                70% { box-shadow: 0 0 16px 8px #e94c2b66; }
                100% { box-shadow: 0 0 0 0 #e94c2b66; }
            }`;
            document.head.appendChild(style);
        }
        debugLog('Post highlighted successfully');
    }

    private addUnsubscribeButton(postElement: HTMLElement): void {
        debugLog('Adding unsubscribe button to post');
        
        // Find the author's name element with various selectors
        const actorSelectors = [
            '.update-components-actor__title',
            '.feed-shared-actor__title',
            '.update-components-actor__name',
            'a[data-test-id="actor-name"]'
        ];
        
        let actorElement: Element | null = null;
        for (const selector of actorSelectors) {
            actorElement = postElement.querySelector(selector);
            if (actorElement) {
                debugLog(`Found author element with selector: ${selector}`, actorElement);
                break;
            }
        }
        
        if (!actorElement) {
            debugLog('Could not find author element', null, LogLevel.WARN);
            return;
        }
        
        // Create unsubscribe button
        const unsubscribeButton = document.createElement('button');
        unsubscribeButton.className = 'self-centered-unsubscribe-button';
        unsubscribeButton.textContent = 'Unsubscribe';
        unsubscribeButton.title = 'Unsubscribe from this author';
        
        // Add click event
        unsubscribeButton.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            debugLog('Unsubscribe button clicked');
            this.unsubscribeFromAuthor(postElement);
        });
        
        // Insert after the author's name
        actorElement.parentElement?.appendChild(unsubscribeButton);
        debugLog('Unsubscribe button added successfully');
    }

    private unsubscribeFromAuthor(postElement: HTMLElement): void {
        debugLog('Attempting to unsubscribe from author');
        
        // Find the author profile URL with various selectors
        const authorLinkSelectors = [
            '.update-components-actor__title a',
            '.feed-shared-actor__title a',
            'a[data-test-id="actor-name"]'
        ];
        
        let authorLinkElement: Element | null = null;
        for (const selector of authorLinkSelectors) {
            authorLinkElement = postElement.querySelector(selector);
            if (authorLinkElement) {
                debugLog(`Found author link with selector: ${selector}`, authorLinkElement);
                break;
            }
        }
        
        if (!authorLinkElement) {
            debugLog('Could not find author link', null, LogLevel.WARN);
            return;
        }
        
        const authorUrl = (authorLinkElement as HTMLAnchorElement).href;
        const authorId = this.extractAuthorId(authorUrl);
        
        debugLog(`Author URL: ${authorUrl}, ID: ${authorId}`);
        
        if (authorId) {
            // Call LinkedIn's unfollow API
            debugLog(`Unfollowing author with ID: ${authorId}`);
            
            this.unfollowAuthor(authorId)
                .then(() => {
                    debugLog('Successfully unfollowed author', null, LogLevel.INFO);
                    
                    // Update UI to indicate unfollowed
                    const unsubscribeButton = postElement.querySelector('.self-centered-unsubscribe-button');
                    if (unsubscribeButton) {
                        unsubscribeButton.textContent = 'Unfollowed';
                        unsubscribeButton.classList.add('self-centered-unfollowed');
                        unsubscribeButton.setAttribute('disabled', 'true');
                    }
                    
                    // Optionally hide the post
                    postElement.style.opacity = '0.5';
                    
                    // Update counter
                    updateStats('unfollowedAuthors');
                })
                .catch((error) => {
                    debugLog('Failed to unfollow author', error, LogLevel.ERROR);
                    alert('Failed to unfollow. Please try again.');
                });
        }
    }

    private extractAuthorId(profileUrl: string): string | null {
        // Extract the LinkedIn member ID from the profile URL
        const match = profileUrl.match(/linkedin.com\/in\/([^\/]+)/);
        return match ? match[1] : null;
    }

    private async unfollowAuthor(authorId: string): Promise<void> {
        try {
            debugLog(`Sending unfollow message to background script for author: ${authorId}`);
            
            // We can't directly call LinkedIn's API from content script due to CORS
            // So we send a message to the background script to handle this
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { action: 'unfollow', authorId }, 
                    (response) => {
                        if (chrome.runtime.lastError) {
                            debugLog('Runtime error in unfollowAuthor', chrome.runtime.lastError, LogLevel.ERROR);
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        
                        if (response && response.success) {
                            debugLog('Unfollow operation successful', response);
                            resolve();
                        } else {
                            debugLog('Unfollow operation failed', response, LogLevel.ERROR);
                            reject(new Error(response ? response.error : 'Unknown error'));
                        }
                    }
                );
            });
        } catch (error) {
            debugLog('Error in unfollowAuthor', error, LogLevel.ERROR);
            throw error;
        }
    }

    private injectStyles(): void {
        debugLog('Injecting CSS styles');
        
        const style = document.createElement('style');
        style.textContent = `
            .self-centered-post-detected {
                border: 2px solid #e94c2b !important;
                position: relative !important;
                padding-top: 30px !important;
                background-color: rgba(233, 76, 43, 0.05) !important;
                transition: all 0.3s ease !important;
            }
            
            .self-centered-warning-badge {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                background-color: #e94c2b !important;
                color: white !important;
                font-weight: bold !important;
                padding: 4px 8px !important;
                border-radius: 0 0 4px 0 !important;
                font-size: 12px !important;
                z-index: 10 !important;
                box-shadow: 0 1px 3px rgba(0,0,0,0.12) !important;
            }
            
            .self-centered-unsubscribe-button {
                background-color: #0a66c2 !important;
                color: white !important;
                border: none !important;
                border-radius: 16px !important;
                padding: 4px 12px !important;
                margin-left: 8px !important;
                cursor: pointer !important;
                font-size: 12px !important;
                font-weight: bold !important;
                transition: background-color 0.2s ease !important;
            }
            
            .self-centered-unsubscribe-button:hover {
                background-color: #004182 !important;
            }
            
            .self-centered-unfollowed {
                background-color: #808080 !important;
            }
            
            .self-centered-keyword-highlight {
                background-color: #ffe066 !important;
                padding: 0 2px !important;
                border-radius: 3px !important;
                font-weight: bold !important;
            }
            
            /* Debug Styles */
            .self-centered-debug-badge {
                position: fixed !important;
                bottom: 10px !important;
                right: 10px !important;
                background-color: rgba(41, 128, 185, 0.9) !important;
                color: white !important;
                padding: 8px 12px !important;
                border-radius: 4px !important;
                font-size: 12px !important;
                z-index: 9999 !important;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2) !important;
                font-family: monospace !important;
            }
        `;
        document.head.appendChild(style);
        
        debugLog('CSS styles injected successfully');
    }
}

// Initialize the detector instance when the content script loads
if (!window.hasOwnProperty('__linkedin_llm_detector_initialized__')) {
    // Prevent double-initialization
    (window as any).__linkedin_llm_detector_initialized__ = true;
    detectorInstance = new LinkedInLLMDetector();
    connectToBackgroundScript();
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.action) {
        case 'analyzeNow':
            debugLog('Received analyzeNow message from popup', null, LogLevel.INFO);
            detectorInstance?.analyze();
            sendResponse({ success: true });
            break;
        case 'setDebugMode':
            debugLog(`Received setDebugMode: ${message.enabled}`, null, LogLevel.INFO);
            chrome.storage.local.set({ debugMode: message.enabled });
            (window as any).DEBUG_MODE = message.enabled;
            sendResponse({ success: true });
            break;
        case 'setDetectionEnabled':
            debugLog(`Received setDetectionEnabled: ${message.enabled}`, null, LogLevel.INFO);
            chrome.storage.local.set({ enableDetection: message.enabled });
            sendResponse({ success: true });
            break;
        case 'setAutoUnfollow':
            debugLog(`Received setAutoUnfollow: ${message.enabled}`, null, LogLevel.INFO);
            chrome.storage.local.set({ autoUnfollow: message.enabled });
            sendResponse({ success: true });
            break;
        case 'showDebugConsole':
            debugLog('Received showDebugConsole message from popup', null, LogLevel.INFO);
            debugConsole.show();
            sendResponse({ success: true });
            break;
        default:
            debugLog(`Unknown message action: ${message.action}`, message, LogLevel.WARN);
            break;
    }
    // Return true to indicate async response if needed
    return true;
});
