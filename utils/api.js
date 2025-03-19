// Constants
const API_KEY_PATTERN = /^sk-[a-zA-Z0-9]{32,}$/;
const STORAGE_KEY = 'deepseek_api_key';

/**
 * Validates the format of a Deepseek API key
 * @param {string} apiKey - The API key to validate
 * @returns {boolean} - Whether the key is valid
 */
export function validateApiKey(apiKey) {
    if (!apiKey) return false;
    return API_KEY_PATTERN.test(apiKey);
}

/**
 * Saves the API key to chrome.storage.local
 * @param {string} apiKey - The API key to save
 * @returns {Promise<void>}
 */
export async function saveApiKey(apiKey) {
    if (!validateApiKey(apiKey)) {
        throw new Error('Invalid API key format');
    }

    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: apiKey });
    } catch (error) {
        console.error('Failed to save API key:', error);
        throw new Error('Failed to save API key');
    }
}

/**
 * Retrieves the API key from storage
 * @returns {Promise<string|null>}
 */
export async function getApiKey() {
    try {
        const result = await chrome.storage.local.get(STORAGE_KEY);
        return result[STORAGE_KEY] || null;
    } catch (error) {
        console.error('Failed to retrieve API key:', error);
        return null;
    }
}

/**
 * Removes the API key from storage
 * @returns {Promise<void>}
 */
export async function removeApiKey() {
    try {
        await chrome.storage.local.remove(STORAGE_KEY);
    } catch (error) {
        console.error('Failed to remove API key:', error);
        throw new Error('Failed to remove API key');
    }
}

/**
 * Handles API errors and provides user-friendly messages
 * @param {Error} error - The error object
 * @returns {string} - User-friendly error message
 */
export function handleApiError(error) {
    if (error.response) {
        switch (error.response.status) {
            case 401:
                return 'Invalid API key. Please check your settings.';
            case 429:
                return 'Rate limit exceeded. Please try again later.';
            case 500:
                return 'Deepseek API server error. Please try again later.';
            default:
                return `API error: ${error.response.status}`;
        }
    }
    
    if (error.message.includes('Failed to fetch')) {
        return 'Network error. Please check your internet connection.';
    }
    
    return 'An unexpected error occurred. Please try again.';
}

/**
 * Formats the enhancement response
 * @param {string} text - The text to format
 * @returns {string} - Formatted text
 */
export function formatResponse(text) {
    return text
        .trim()
        .replace(/\n{3,}/g, '\n\n') // Remove excessive newlines
        .replace(/\s+$/gm, ''); // Remove trailing whitespace
}

/**
 * Checks if the API key exists and is valid
 * @returns {Promise<boolean>}
 */
export async function isApiKeyConfigured() {
    const apiKey = await getApiKey();
    return Boolean(apiKey && validateApiKey(apiKey));
}