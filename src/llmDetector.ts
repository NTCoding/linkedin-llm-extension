import { debugLog, LogLevel } from './utils/logger';

export class LLMDetector {
    private selfCenteredKeywords: string[] = [
        'I achieved', 'my success', 'I\'m excited to announce', 'I\'m proud', 
        'thrilled to share', 'I\'ve been', 'my journey', 'my experience',
        'I learned', 'my accomplishment', 'I created', 'I built', 'my promotion',
        'I was featured', 'I was recognized', 'my book', 'my podcast', 
        'personal brand', 'personal growth', 'I started', 'my startup'
    ];

    constructor() {
        debugLog('LLMDetector initialized with keywords', this.selfCenteredKeywords);
    }

    public containsLLMKeyword(content: string): boolean {
        if (!content || content.trim() === '') {
            debugLog('Empty content provided to keyword detector', null, LogLevel.WARN);
            return false;
        }
        
        const normalizedContent = content.toLowerCase();
        
        // Check each keyword individually and log which ones match
        const matchedKeywords: string[] = [];
        
        for (const keyword of this.selfCenteredKeywords) {
            if (normalizedContent.includes(keyword.toLowerCase())) {
                matchedKeywords.push(keyword);
            }
        }
        
        if (matchedKeywords.length > 0) {
            debugLog('Self-centered keywords found in content', {
                matchedKeywords,
                contentPreview: content.length > 100 ? content.substring(0, 100) + '...' : content
            });
            return true;
        }
        
        return false;
    }

    public highlightLLMMentions(element: HTMLElement): void {
        if (!element || !element.innerHTML) {
            debugLog('Invalid element provided for highlighting', element, LogLevel.WARN);
            return;
        }

        debugLog('Highlighting self-centered keywords in element', {
            elementTag: element.tagName,
            elementText: element.textContent?.substring(0, 50) + '...'
        });

        let highlightedContent = element.innerHTML;
        let keywordsHighlighted = 0;

        this.selfCenteredKeywords.forEach(keyword => {
            try {
                const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi');
                
                // Count occurrences before replacement
                const matches = highlightedContent.match(regex);
                if (matches && matches.length > 0) {
                    keywordsHighlighted += matches.length;
                    debugLog(`Found ${matches.length} occurrences of "${keyword}"`);
                }
                
                highlightedContent = highlightedContent.replace(
                    regex, 
                    match => `<span class="self-centered-keyword-highlight">${match}</span>`
                );
            } catch (error) {
                debugLog(`Error highlighting keyword: ${keyword}`, error, LogLevel.ERROR);
            }
        });

        if (keywordsHighlighted > 0) {
            debugLog(`Highlighted ${keywordsHighlighted} total keywords`);
            element.innerHTML = highlightedContent;
        }
    }
}