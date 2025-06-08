// Background script that handles API requests to LinkedIn
import { debugLog, LogLevel } from './utils/logger';

debugLog('Background script initialized', null, LogLevel.INFO);

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    debugLog('Received message in background script', message);
    
    if (message.action === 'ping') {
        // Handle ping messages for connection testing
        debugLog('Received ping from content script', { sender }, LogLevel.INFO);
        sendResponse({ success: true, message: 'Connection established' });
        return true;
    } else if (message.action === 'unfollow') {
        debugLog(`Attempting to unfollow author: ${message.authorId}`, null, LogLevel.INFO);
        
        unfollowAuthor(message.authorId)
            .then(() => {
                debugLog('Successfully unfollowed author', null, LogLevel.INFO);
                sendResponse({ success: true });
            })
            .catch((error) => {
                debugLog('Failed to unfollow author', error, LogLevel.ERROR);
                sendResponse({ success: false, error: error.message });
            });
        
        // Return true to indicate we'll send a response asynchronously
        return true;
    } else if (message.action === 'logDebug') {
        // Allow content scripts to log through the background script
        // This is useful because background script logs appear in the extension's
        // developer tools console, which can be easier to access
        debugLog(`[Content Script] ${message.message}`, message.data, message.level || LogLevel.DEBUG);
        sendResponse({ success: true });
        return true;
    }
});

// Function to unfollow a LinkedIn user
async function unfollowAuthor(authorId: string): Promise<void> {
    debugLog(`Starting unfollow process for author: ${authorId}`);
    
    try {
        // Get the current tab - should be LinkedIn
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        const currentTab = tabs[0];
        
        if (!currentTab || !currentTab.id) {
            throw new Error('No active tab found');
        }
        
        debugLog(`Current tab: ${currentTab.url}`);
        
        // We'll use the content script context to make the request to avoid CORS issues
        // This is done by executing a script in the LinkedIn page context
        await chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            func: executeUnfollow,
            args: [authorId]
        });
        
        debugLog(`Unfollow script executed successfully for author: ${authorId}`, null, LogLevel.INFO);
    } catch (error) {
        debugLog('Error in unfollowAuthor', error, LogLevel.ERROR);
        throw error;
    }
}

// This function runs in the context of the LinkedIn page
function executeUnfollow(authorId: string): Promise<void> {
    return new Promise((resolve, reject) => {
        try {
            console.log(`[LinkedIn Self-Centered Post Detector] Attempting to unfollow author: ${authorId}`);
            
            // We'll use LinkedIn's own CSRF token that's available in the page
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            
            if (!csrfToken) {
                console.error('[LinkedIn Self-Centered Post Detector] CSRF token not found');
                reject(new Error('CSRF token not found'));
                return;
            }
            
            console.log(`[LinkedIn Self-Centered Post Detector] CSRF token found: ${csrfToken.substring(0, 10)}...`);
            
            // Make a request to LinkedIn's API to unfollow the user
            fetch(`https://www.linkedin.com/in/${authorId}/unfollow`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'csrf-token': csrfToken,
                    'x-li-track': '{"clientVersion":"1.12.6741"}'
                },
                credentials: 'include',
                body: JSON.stringify({
                    memberIdentity: authorId,
                    unfollowMemberAction: {
                        unfollowMember: true
                    }
                })
            })
            .then(response => {
                console.log(`[LinkedIn Self-Centered Post Detector] Unfollow response status: ${response.status}`);
                
                if (response.ok) {
                    console.log(`[LinkedIn Self-Centered Post Detector] Successfully unfollowed author: ${authorId}`);
                    resolve();
                } else {
                    console.error(`[LinkedIn Self-Centered Post Detector] Failed to unfollow: ${response.status}`);
                    reject(new Error(`Failed to unfollow: ${response.status}`));
                }
            })
            .catch(error => {
                console.error('[LinkedIn Self-Centered Post Detector] Error unfollowing author:', error);
                reject(error);
            });
        } catch (error) {
            console.error('[LinkedIn Self-Centered Post Detector] Error in executeUnfollow:', error);
            reject(error);
        }
    });
}

// Listen for installation events
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        debugLog('Extension installed', null, LogLevel.INFO);
        
        // Initialize statistics
        chrome.storage.local.set({
            postsAnalyzed: 0,
            llmPostsFound: 0,
            unfollowedAuthors: 0,
            enableDetection: true,
            autoUnfollow: false,
            debugMode: false
        });
        
        // Open options page or welcome page
        chrome.tabs.create({
            url: chrome.runtime.getURL('popup.html')
        });
    } else if (details.reason === 'update') {
        debugLog(`Extension updated from ${details.previousVersion}`, null, LogLevel.INFO);
    }
});
