// Constants
const API_KEY_PATTERN = /^sk-[a-zA-Z0-9]{32,}$/;
const STORAGE_KEY = 'deepseek_api_key';

// DOM Elements
const apiKeyInput = document.getElementById('apiKey');
const saveButton = document.getElementById('saveBtn');
const statusDiv = document.getElementById('status');

// Validate API key format
function validateApiKey(apiKey) {
    if (!apiKey) return false;
    return API_KEY_PATTERN.test(apiKey);
}

// Save API key to chrome.storage
async function saveApiKey(apiKey) {
    if (!validateApiKey(apiKey)) {
        throw new Error('Invalid API key format. Key should start with "sk-" followed by 32 or more characters.');
    }

    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: apiKey });
    } catch (error) {
        console.error('Failed to save API key:', error);
        throw new Error('Failed to save API key');
    }
}

// Get API key from storage
async function getApiKey() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || null;
    } catch (error) {
        console.error('Failed to retrieve API key:', error);
        return null;
    }
}

// Load saved API key
async function loadSavedApiKey() {
    const apiKey = await getApiKey();
    if (apiKey) {
        // Show only last 4 characters of the API key
        apiKeyInput.value = '•'.repeat(16) + apiKey.slice(-4);
        apiKeyInput.setAttribute('data-masked', 'true');
    }
}

// Show status message
function showStatus(message, isError = false) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? 'error' : 'success'}`;
    statusDiv.style.display = 'block';
    
    // Hide status after 3 seconds
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 3000);
}

// Handle API key input focus
apiKeyInput.addEventListener('focus', function() {
    if (this.getAttribute('data-masked') === 'true') {
        this.value = '';
        this.removeAttribute('data-masked');
    }
});

// Handle save button click
saveButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    try {
        if (!validateApiKey(apiKey)) {
            throw new Error('Invalid API key format. Key should start with "sk-" followed by 32 or more characters.');
        }

        await saveApiKey(apiKey);
        showStatus('API key saved successfully!');
        
        // Mask the API key
        setTimeout(() => {
            apiKeyInput.value = '•'.repeat(16) + apiKey.slice(-4);
            apiKeyInput.setAttribute('data-masked', 'true');
        }, 500);
    } catch (error) {
        showStatus(error.message, true);
    }
});

// Load saved API key when page loads
document.addEventListener('DOMContentLoaded', loadSavedApiKey);