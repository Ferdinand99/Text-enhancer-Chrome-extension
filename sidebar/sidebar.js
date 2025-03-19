// DOM Elements
const selectedTextElement = document.getElementById('selectedText');
const resultTextElement = document.getElementById('resultText');
const loadingSpinner = document.getElementById('loadingSpinner');
const actionButtons = document.getElementById('actionButtons');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');

// Select elements
const styleSelect = document.getElementById('styleSelect');
const toneSelect = document.getElementById('toneSelect');

// Enhancement buttons
const enhanceBtn = document.getElementById('enhanceBtn');
const grammarBtn = document.getElementById('grammarBtn');
const summaryBtn = document.getElementById('summaryBtn');

// Action buttons
const copyBtn = document.getElementById('copyBtn');
const replaceBtn = document.getElementById('replaceBtn');

let selectedText = '';
let currentTabId = null;

// Initialize the sidebar
async function initialize() {
    try {
        // Get the current tab ID
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        currentTabId = tabs[0]?.id;

        // Check if API key is configured
        const apiKey = await checkApiKey();
        if (!apiKey) {
            showError('API key not configured. Please set up your API key in the extension options.');
            disableEnhancementButtons(true);
            return;
        }

        // Set up event listeners
        setupEventListeners();
    } catch (error) {
        console.error('Initialization error:', error);
        showError('Failed to initialize. Please reload the extension.');
    }
}

function setupEventListeners() {
    // Select event listeners
    styleSelect.addEventListener('change', validateSelections);
    toneSelect.addEventListener('change', validateSelections);

    // Enhancement buttons
    enhanceBtn.addEventListener('click', () => handleEnhancement('custom'));
    grammarBtn.addEventListener('click', () => handleEnhancement('grammar'));
    summaryBtn.addEventListener('click', () => handleEnhancement('summary'));
    
    // Action buttons
    copyBtn.addEventListener('click', copyToClipboard);
    replaceBtn.addEventListener('click', replaceOriginalText);

    // Listen for messages from the content script
    chrome.runtime.onMessage.addListener(handleMessage);
}

function handleMessage(message) {
    if (message.type === 'textSelected') {
        selectedText = message.text;
        displaySelectedText();
        enableEnhancementButtons();
    } else if (message.type === 'error') {
        showError(message.error);
    }
}

function displaySelectedText() {
    selectedTextElement.textContent = selectedText;
    hideError();
    clearResult();
}

async function handleEnhancement(type) {
    if (!selectedText) {
        showError('Please select some text first.');
        return;
    }

    showLoading();
    hideError();
    disableEnhancementButtons(true);

    let enhancementType = type;
    let style = styleSelect.value;
    let tone = toneSelect.value;

    try {
        const response = await chrome.runtime.sendMessage({
            type: 'enhance',
            enhancementType: enhancementType,
            text: selectedText,
            style: style,
            tone: tone
        });

        if (response.error) {
            throw new Error(response.error);
        }

        displayResult(response.result);
    } catch (error) {
        console.error('Enhancement error:', error);
        showError(error.message || 'Failed to enhance text. Please try again.');
    } finally {
        hideLoading();
        disableEnhancementButtons(false);
    }
}

function displayResult(result) {
    resultTextElement.textContent = result;
    actionButtons.classList.remove('hidden');
}

async function copyToClipboard() {
    try {
        await navigator.clipboard.writeText(resultTextElement.textContent);
        showSuccess('Copied to clipboard!');
    } catch (error) {
        showError('Failed to copy text.');
    }
}

async function replaceOriginalText() {
    if (!currentTabId) {
        showError('Tab not found. Please refresh the page.');
        return;
    }

    try {
        await chrome.tabs.sendMessage(currentTabId, {
            type: 'replaceText',
            text: resultTextElement.textContent
        });
        showSuccess('Text replaced successfully!');
    } catch (error) {
        showError('Failed to replace text. Please try selecting the text again.');
    }
}

async function checkApiKey() {
    try {
        const result = await chrome.storage.local.get('deepseek_api_key');
        return result.deepseek_api_key;
    } catch (error) {
        console.error('Failed to check API key:', error);
        return null;
    }
}

// UI Helpers
function showLoading() {
    loadingSpinner.classList.remove('hidden');
    actionButtons.classList.add('hidden');
}

function hideLoading() {
    loadingSpinner.classList.add('hidden');
}

function showError(message) {
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = message;
}

function hideError() {
    errorContainer.classList.add('hidden');
    errorMessage.textContent = '';
}

function showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.textContent = message;
    document.body.appendChild(successElement);

    setTimeout(() => {
        successElement.remove();
    }, 2000);
}

function clearResult() {
    resultTextElement.textContent = '';
    actionButtons.classList.add('hidden');
}

function disableEnhancementButtons(disabled) {
    const buttons = [enhanceBtn, grammarBtn, summaryBtn];
    buttons.forEach(button => {
        button.disabled = disabled;
        if (disabled) {
            button.classList.add('disabled');
        } else {
            button.classList.remove('disabled');
        }
    });
}

function enableEnhancementButtons() {
    disableEnhancementButtons(false);
}

function validateSelections() {
    if (styleSelect.value && toneSelect.value) {
        enhanceBtn.disabled = false;
    } else {
        enhanceBtn.disabled = true;
    }
}

// Initialize the sidebar when the DOM is loaded
document.addEventListener('DOMContentLoaded', initialize);