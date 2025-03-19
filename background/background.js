// Constants
const API_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const CONTEXT_MENU_ID = 'enhanceText';
const STORAGE_KEY = 'deepseek_api_key';

// Enhancement prompts
const ENHANCEMENT_PROMPTS = {
    grammar: "Please correct any grammatical errors in the following text while preserving its meaning and original language: ",
    summary: "Please provide a concise summary of the following text, keeping the summary in the same language as the original text: "
};

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
    // Create context menu
    chrome.contextMenus.create({
        id: CONTEXT_MENU_ID,
        title: 'Enhance with AI',
        contexts: ['selection']
    });

    // Check for API key
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    if (!stored[STORAGE_KEY]) {
        console.log('API key not found. Please configure in extension options.');
    }
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === CONTEXT_MENU_ID) {
        chrome.sidePanel.open({ windowId: tab.windowId });
        
        // Send selected text to sidebar
        chrome.runtime.sendMessage({
            type: 'textSelected',
            text: info.selectionText
        }).catch(console.error);
    }
});

// Handle messages from sidebar
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'enhance') {
        handleEnhancement(message)
            .then(sendResponse)
            .catch(error => {
                console.error('Enhancement error:', error);
                sendResponse({ error: error.message });
            });
        return true; // Will respond asynchronously
    }
});

// Handle text enhancement requests
async function handleEnhancement(message) {
    const apiKey = await getApiKey();
    if (!apiKey) {
        throw new Error('API key not found. Please configure your Deepseek API key in extension options.');
    }

    console.log('Enhancing text with type:', message.enhancementType);

    try {
        const enhancedText = await enhanceText(
            message.text,
            message.enhancementType,
            message.style,
            message.tone,
            apiKey
        );
        return { result: enhancedText };
    } catch (error) {
        console.error('Enhancement error details:', error);
        throw new Error(getErrorMessage(error));
    }
}

// API communication
async function enhanceText(text, enhancementType, style, tone, apiKey) {
    let prompt = "";
    if (enhancementType === 'custom') {
        prompt = `Enhance this text by converting its style to ${style} and its tone to ${tone}. Keep the original meaning intact and ensure the enhanced text is in the same language as the original:\n${text}`;
    } else {
        prompt = ENHANCEMENT_PROMPTS[enhancementType] + text;
    }
    
    try {
        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error Response:', errorText);
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.error?.message || `API request failed with status ${response.status}`);
            } catch (e) {
                throw new Error(`API request failed with status ${response.status}`);
            }
        }

        const data = await response.json();
        console.log('API Response:', data);
        
        if (!data.choices?.[0]?.message?.content) {
            throw new Error('Invalid API response format');
        }

        return data.choices[0].message.content.trim();
    } catch (error) {
        console.error('API Request Error:', error);
        throw error;
    }
}

// API key management
async function getApiKey() {
    try {
        const stored = await chrome.storage.local.get(STORAGE_KEY);
        return stored[STORAGE_KEY];
    } catch (error) {
        console.error('Failed to retrieve API key:', error);
        return null;
    }
}

// Error handling helper
function getErrorMessage(error) {
    if (error.response) {
        switch (error.response.status) {
            case 401:
                return 'Invalid API key. Please check your settings.';
            case 429:
                return 'Rate limit exceeded. Please try again later.';
            case 500:
                return 'Deepseek API server error. Please try again later.';
            default:
                return `API error (${error.response.status}): ${error.message}`;
        }
    }
    
    if (error.message.includes('Failed to fetch')) {
        return 'Network error. Please check your internet connection.';
    }
    
    return error.message || 'Failed to enhance text. Please try again later.';
}

// Handle errors with automatic retry
async function fetchWithRetry(url, options, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            
            if (response.status === 429) {
                // Rate limit hit - wait and retry
                const retryAfter = response.headers.get('Retry-After') || 5;
                await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
                continue;
            }
            
            return response;
        } catch (error) {
            lastError = error;
            
            if (attempt < maxRetries - 1) {
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => 
                    setTimeout(resolve, Math.pow(2, attempt) * 1000)
                );
            }
        }
    }
    
    throw lastError;
}