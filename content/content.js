// Track the currently selected text and its range
let currentSelection = {
    text: '',
    range: null
};

// Listen for text selection changes
document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const text = selection.toString().trim();

    if (text) {
        currentSelection = {
            text,
            range: selection.getRangeAt(0).cloneRange()
        };
    }
});

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'replaceText') {
        replaceSelectedText(message.text);
        sendResponse({ success: true });
    }
});

// Replace the selected text with enhanced version
function replaceSelectedText(newText) {
    if (!currentSelection.range) {
        console.error('No text selection available');
        return;
    }

    try {
        // Create a new range from the stored selection
        const range = currentSelection.range;
        
        // Delete the current contents and insert the new text
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));

        // Clear the selection
        window.getSelection().removeAllRanges();

        // Update current selection
        currentSelection = {
            text: newText,
            range: range
        };
    } catch (error) {
        console.error('Failed to replace text:', error);
    }
}

// Initialize extension message passing
function initializeExtension() {
    // Listen for context menu clicks which might trigger the sidebar
    document.addEventListener('contextmenu', () => {
        const selection = window.getSelection();
        const text = selection.toString().trim();
        
        if (text) {
            currentSelection = {
                text,
                range: selection.getRangeAt(0).cloneRange()
            };
        }
    });
}

// Start the extension
initializeExtension();