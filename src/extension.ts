// Initialize extension
function initExtension() {
    // You can optionally log to the console for debugging
    if (typeof console !== 'undefined') {
        console.log('Extension initialized');
    }
    // Check if we're in a content script context
    if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'init') {
                if (typeof console !== 'undefined') {
                    console.log('Extension initialization message received');
                }
                sendResponse({ success: true });
                return true;
            }
        });
    }
}

// Initialize on load
initExtension();

// Utility function for post processing
function processLinkedInPosts() {
    // Dummy logic for compatibility; real logic should be in content/background scripts
    function detectSelfCenteredPosts(posts: any[]) {
        const results = [];
        for (const post of posts) {
            // Replace with real detection logic if needed
            if (post && post.content && post.content.includes('AI')) {
                results.push(post);
                if (typeof console !== 'undefined') {
                    console.log('Found self-centered post:', post.content.substring(0, 100));
                }
            }
        }
        return results;
    }
    return { detectSelfCenteredPosts };
}

// Optionally attach to window for debugging
if (typeof window !== 'undefined') {
    window.processLinkedInPosts = processLinkedInPosts;
}

function deactivate() {
    if (typeof console !== 'undefined') {
        console.log('LinkedIn Self-Centered Post Detector deactivated');
    }
}