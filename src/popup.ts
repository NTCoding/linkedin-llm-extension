import { debugLog, LogLevel } from './utils/logger';

document.addEventListener('DOMContentLoaded', function() {
    debugLog('Popup opened', null, LogLevel.INFO);
    
    // Load saved statistics
    chrome.storage.local.get(['postsAnalyzed', 'llmPostsFound', 'unfollowedAuthors', 'enableDetection', 'autoUnfollow'], function(data) {
        debugLog('Loaded statistics', data);
        
        const postsAnalyzedElement = document.getElementById('posts-analyzed');
        const llmPostsFoundElement = document.getElementById('llm-posts-found');
        const unfollowedAuthorsElement = document.getElementById('unfollowed-authors');
        const enableDetectionElement = document.getElementById('enable-detection') as HTMLInputElement | null;
        const autoUnfollowElement = document.getElementById('auto-unfollow') as HTMLInputElement | null;
        
        if (postsAnalyzedElement) postsAnalyzedElement.textContent = String(data.postsAnalyzed || '0');
        if (llmPostsFoundElement) llmPostsFoundElement.textContent = String(data.llmPostsFound || '0');
        if (unfollowedAuthorsElement) unfollowedAuthorsElement.textContent = String(data.unfollowedAuthors || '0');
        
        if (enableDetectionElement) enableDetectionElement.checked = data.enableDetection !== false; // Default to true
        if (autoUnfollowElement) autoUnfollowElement.checked = data.autoUnfollow === true; // Default to false
    });
    
    // Add debug mode toggle
    const debugModeToggle = document.getElementById('debug-mode') as HTMLInputElement | null;
    if (debugModeToggle) {
        chrome.storage.local.get(['debugMode'], function(data) {
            debugModeToggle.checked = data.debugMode === true;
        });
        
        debugModeToggle.addEventListener('change', function(e) {
            const enabled = (e.target as HTMLInputElement).checked;
            chrome.storage.local.set({ debugMode: enabled });
            debugLog(`Debug mode ${enabled ? 'enabled' : 'disabled'}`, null, LogLevel.INFO);
            
            // Send message to content script
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'setDebugMode', enabled });
                }
            });
        });
    }
    
    // Handle enable detection toggle
    const enableDetectionElement = document.getElementById('enable-detection') as HTMLInputElement | null;
    if (enableDetectionElement) {
        enableDetectionElement.addEventListener('change', function(e) {
            const enabled = (e.target as HTMLInputElement).checked;
            chrome.storage.local.set({ enableDetection: enabled });
            debugLog(`Detection ${enabled ? 'enabled' : 'disabled'}`, null, LogLevel.INFO);
            
            // Send message to content script
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'setDetectionEnabled', enabled });
                }
            });
        });
    }
    
    // Handle auto-unfollow toggle
    const autoUnfollowElement = document.getElementById('auto-unfollow') as HTMLInputElement | null;
    if (autoUnfollowElement) {
        autoUnfollowElement.addEventListener('change', function(e) {
            const enabled = (e.target as HTMLInputElement).checked;
            chrome.storage.local.set({ autoUnfollow: enabled });
            debugLog(`Auto-unfollow ${enabled ? 'enabled' : 'disabled'}`, null, LogLevel.INFO);
            
            // Send message to content script
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'setAutoUnfollow', enabled });
                }
            });
        });
    }
    
    // Handle clear stats button
    const clearStatsButton = document.getElementById('clear-stats');
    if (clearStatsButton) {
        clearStatsButton.addEventListener('click', function() {
            chrome.storage.local.set({ 
                postsAnalyzed: 0, 
                llmPostsFound: 0, 
                unfollowedAuthors: 0 
            });
            
            const postsAnalyzedElement = document.getElementById('posts-analyzed');
            const llmPostsFoundElement = document.getElementById('llm-posts-found');
            const unfollowedAuthorsElement = document.getElementById('unfollowed-authors');
            
            if (postsAnalyzedElement) postsAnalyzedElement.textContent = '0';
            if (llmPostsFoundElement) llmPostsFoundElement.textContent = '0';
            if (unfollowedAuthorsElement) unfollowedAuthorsElement.textContent = '0';
            
            debugLog('Statistics cleared', null, LogLevel.INFO);
        });
    }
    
    // Handle analyze now button
    const analyzeButton = document.getElementById('analyze-now');
    if (analyzeButton) {
        analyzeButton.addEventListener('click', function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0].id) {
                    debugLog('Requesting immediate analysis', null, LogLevel.INFO);
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'analyzeNow' });
                }
            });
        });
    }
    
    // Handle debug output button
    const debugOutputButton = document.getElementById('show-debug');
    if (debugOutputButton) {
        debugOutputButton.addEventListener('click', function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                if (tabs[0].id) {
                    debugLog('Opening debug console', null, LogLevel.INFO);
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'showDebugConsole' });
                }
            });
        });
    }
});
