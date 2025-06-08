/**
 * Enhanced debugging utilities for the LinkedIn Self-Centered Post Detector
 */

// Debug mode flag - set to true to enable detailed logging
export const DEBUG_MODE = true;

// Log levels
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG'
}

// Visual styling for different log levels
const LOG_STYLES = {
  [LogLevel.ERROR]: 'background: #e94c2b; color: white; padding: 2px 5px; border-radius: 3px;',
  [LogLevel.WARN]: 'background: #f39c12; color: white; padding: 2px 5px; border-radius: 3px;',
  [LogLevel.INFO]: 'background: #3498db; color: white; padding: 2px 5px; border-radius: 3px;',
  [LogLevel.DEBUG]: 'background: #27ae60; color: white; padding: 2px 5px; border-radius: 3px;'
};

/**
 * Debug logger that only outputs when DEBUG_MODE is true
 */
export function debugLog(
  message: string, 
  data?: any, 
  level: LogLevel = LogLevel.DEBUG
): void {
  if (!DEBUG_MODE && level !== LogLevel.ERROR) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `%c[${level}]%c [${timestamp}]`;
  
  if (data !== undefined) {
    console.groupCollapsed(
      prefix + ` ${message}`, 
      LOG_STYLES[level], 
      'color: gray;'
    );
    console.log('Details:', data);
    console.groupEnd();
  } else {
    console.log(
      prefix + ` ${message}`, 
      LOG_STYLES[level], 
      'color: gray;'
    );
  }
}

/**
 * Visualize DOM element in console
 * Helps debug which elements are being processed
 */
export function visualizeElement(element: HTMLElement, label: string): void {
  if (!DEBUG_MODE) return;
  
  console.groupCollapsed(`%c[DOM Element] %c${label}`, 'background: #9b59b6; color: white; padding: 2px 5px; border-radius: 3px;', 'color: #9b59b6; font-weight: bold;');
  console.log('Element:', element);
  
  // Show basic element info
  console.log('Tag:', element.tagName);
  console.log('Classes:', element.className);
  console.log('ID:', element.id);
  
  // Show dimensions and position
  const rect = element.getBoundingClientRect();
  console.log('Dimensions:', {
    width: rect.width,
    height: rect.height,
    top: rect.top,
    left: rect.left,
    visible: rect.width > 0 && rect.height > 0
  });
  
  // Show text content preview
  const text = element.textContent?.trim() || '';
  console.log('Text:', text.length > 100 ? text.substring(0, 100) + '...' : text);
  
  console.groupEnd();
  
  // Highlight the element in the page temporarily
  if (rect.width > 0 && rect.height > 0) {
    const originalOutline = element.style.outline;
    const originalZIndex = element.style.zIndex;
    
    element.style.outline = '2px dashed #9b59b6';
    element.style.zIndex = '10000';
    
    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.zIndex = originalZIndex;
    }, 3000);
  }
}

/**
 * Counts and logs the posts that appear on the page
 */
export function countVisiblePosts(): void {
  if (!DEBUG_MODE) return;
  
  // Try different LinkedIn post selectors
  const selectors = [
    '.feed-shared-update-v2',               // Traditional selector
    '.occludable-update',                   // Sometimes used by LinkedIn
    '.feed-shared-card',                    // Another feed item container
    'div[data-urn]',                        // Posts with data-urn attribute
    'div[data-id]',                         // Posts with data-id attribute
    'div[data-test-id="feed-shared-update"]' // Test ID selector
  ];
  
  console.group('%c[DOM Analysis] %cLinkedIn Feed Posts', 'background: #e67e22; color: white; padding: 2px 5px; border-radius: 3px;', 'color: #e67e22; font-weight: bold;');
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    console.log(`${selector}: ${elements.length} posts found`);
    
    if (elements.length > 0) {
      // Log the first post as example
      console.groupCollapsed(`Example of ${selector}`);
      console.log(elements[0]);
      console.groupEnd();
    }
  });
  
  console.groupEnd();
}

/**
 * Updates statistics in storage and notifies popup if active
 */
export function updateStats(key: string, increment: number = 1): void {
  chrome.storage.local.get([key], (data) => {
    const currentValue = data[key] || 0;
    const newValue = currentValue + increment;
    
    chrome.storage.local.set({ [key]: newValue }, () => {
      debugLog(`Updated ${key} to ${newValue}`, null, LogLevel.INFO);
    });
  });
}
