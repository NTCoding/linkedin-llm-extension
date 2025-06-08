import { debugLog, LogLevel } from './logger';

/**
 * Creates a debug console UI that can be injected into the LinkedIn page
 * to show real-time debugging information
 */
export class DebugConsole {
  private consoleElement: HTMLElement | null = null;
  private logContainer: HTMLElement | null = null;
  private logs: Array<{message: string, level: LogLevel, timestamp: string}> = [];
  private maxLogs: number = 100;
  private isVisible: boolean = false;
  
  constructor() {
    debugLog('DebugConsole initialized', null, LogLevel.INFO);
  }
  
  /**
   * Shows the debug console UI on the page
   */
  public show(): void {
    if (this.isVisible) return;
    
    if (!this.consoleElement) {
      this.createConsoleUI();
    }
    
    if (this.consoleElement) {
      this.consoleElement.style.display = 'block';
      this.isVisible = true;
      debugLog('Debug console shown', null, LogLevel.INFO);
    }
  }
  
  /**
   * Hides the debug console UI
   */
  public hide(): void {
    if (!this.isVisible || !this.consoleElement) return;
    
    this.consoleElement.style.display = 'none';
    this.isVisible = false;
    debugLog('Debug console hidden', null, LogLevel.INFO);
  }
  
  /**
   * Toggles the debug console visibility
   */
  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * Adds a log entry to the debug console
   */
  public log(message: string, level: LogLevel = LogLevel.DEBUG): void {
    const timestamp = new Date().toISOString();
    
    // Add to our internal log array
    this.logs.push({ message, level, timestamp });
    
    // Trim logs if we exceed the maximum
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    // Add to the UI if visible
    if (this.isVisible && this.logContainer) {
      this.addLogToUI(message, level, timestamp);
    }
  }
  
  /**
   * Clears all logs from the console
   */
  public clear(): void {
    this.logs = [];
    
    if (this.logContainer) {
      this.logContainer.innerHTML = '';
    }
    
    debugLog('Debug console cleared', null, LogLevel.INFO);
  }
  
  /**
   * Creates the console UI elements
   */
  private createConsoleUI(): void {
    // Create main container
    this.consoleElement = document.createElement('div');
    this.consoleElement.className = 'linkedin-self-centered-debug-console';
    this.consoleElement.style.cssText = `
      position: fixed;
      bottom: 10px;
      right: 10px;
      width: 400px;
      height: 300px;
      background-color: rgba(0, 0, 0, 0.8);
      color: white;
      z-index: 9999;
      border-radius: 5px;
      display: flex;
      flex-direction: column;
      font-family: monospace;
      font-size: 12px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    `;
    
    // Create header
    const header = document.createElement('div');
    header.className = 'linkedin-self-centered-debug-header';
    header.style.cssText = `
      padding: 5px 10px;
      background-color: #0a66c2;
      border-radius: 5px 5px 0 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const title = document.createElement('div');
    title.textContent = 'LinkedIn Self-Centered Post Detector - Debug Console';
    
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
    `;
    closeButton.addEventListener('click', () => this.hide());
    
    header.appendChild(title);
    header.appendChild(closeButton);
    
    // Create log container
    this.logContainer = document.createElement('div');
    this.logContainer.className = 'linkedin-self-centered-debug-logs';
    this.logContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 10px;
    `;
    
    // Create footer with controls
    const footer = document.createElement('div');
    footer.className = 'linkedin-self-centered-debug-footer';
    footer.style.cssText = `
      padding: 5px 10px;
      background-color: #333;
      border-radius: 0 0 5px 5px;
      display: flex;
      justify-content: space-between;
    `;
    
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear';
    clearButton.style.cssText = `
      background-color: #666;
      color: white;
      border: none;
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
    `;
    clearButton.addEventListener('click', () => this.clear());
    
    const analyzeButton = document.createElement('button');
    analyzeButton.textContent = 'Analyze Feed';
    analyzeButton.style.cssText = `
      background-color: #27ae60;
      color: white;
      border: none;
      padding: 3px 8px;
      border-radius: 3px;
      cursor: pointer;
    `;
    analyzeButton.addEventListener('click', () => {
      this.log('Manually triggered feed analysis', LogLevel.INFO);
      // Dispatch custom event that content.ts can listen for
      document.dispatchEvent(new CustomEvent('linkedin-self-centered-analyze'));
    });
    
    footer.appendChild(clearButton);
    footer.appendChild(analyzeButton);
    
    // Assemble the console
    this.consoleElement.appendChild(header);
    this.consoleElement.appendChild(this.logContainer);
    this.consoleElement.appendChild(footer);
    
    // Add to the page
    document.body.appendChild(this.consoleElement);
    
    // Add existing logs
    this.renderExistingLogs();
  }
  
  /**
   * Renders all existing logs into the UI
   */
  private renderExistingLogs(): void {
    if (!this.logContainer) return;
    
    this.logContainer.innerHTML = '';
    
    for (const log of this.logs) {
      this.addLogToUI(log.message, log.level, log.timestamp);
    }
    
    // Scroll to bottom
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }
  
  /**
   * Adds a single log entry to the UI
   */
  private addLogToUI(message: string, level: LogLevel, timestamp: string): void {
    if (!this.logContainer) return;
    
    const logEntry = document.createElement('div');
    logEntry.className = `linkedin-self-centered-debug-log linkedin-self-centered-debug-log-${level.toLowerCase()}`;
    logEntry.style.cssText = `
      margin-bottom: 5px;
      border-left: 3px solid ${this.getLevelColor(level)};
      padding-left: 5px;
    `;
    
    const timeEl = document.createElement('span');
    timeEl.className = 'linkedin-self-centered-debug-timestamp';
    timeEl.textContent = timestamp.split('T')[1].split('.')[0] + ' ';
    timeEl.style.cssText = `
      color: #999;
      margin-right: 5px;
    `;
    
    const levelEl = document.createElement('span');
    levelEl.className = 'linkedin-self-centered-debug-level';
    levelEl.textContent = level + ': ';
    levelEl.style.cssText = `
      color: ${this.getLevelColor(level)};
      font-weight: bold;
      margin-right: 5px;
    `;
    
    const messageEl = document.createElement('span');
    messageEl.className = 'linkedin-self-centered-debug-message';
    messageEl.textContent = message;
    
    logEntry.appendChild(timeEl);
    logEntry.appendChild(levelEl);
    logEntry.appendChild(messageEl);
    
    this.logContainer.appendChild(logEntry);
    
    // Scroll to bottom
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }
  
  /**
   * Gets the color for a log level
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR:
        return '#e94c2b';
      case LogLevel.WARN:
        return '#f39c12';
      case LogLevel.INFO:
        return '#3498db';
      case LogLevel.DEBUG:
      default:
        return '#27ae60';
    }
  }
}
