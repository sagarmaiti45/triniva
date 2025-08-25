// Simple token estimation (more accurate would use tiktoken)
function estimateTokens(text) {
    if (!text) return 0;
    
    // Rough estimation: 1 token ≈ 4 characters for English text
    // This is a simplified approach. For production, use proper tokenization
    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;
    
    // Average between character-based and word-based estimation
    const charBasedTokens = Math.ceil(charCount / 4);
    const wordBasedTokens = Math.ceil(wordCount * 1.3);
    
    return Math.ceil((charBasedTokens + wordBasedTokens) / 2);
}

// Count tokens in images (rough estimate)
function estimateImageTokens(imageCount) {
    // Each image typically consumes around 85-100 tokens
    return imageCount * 85;
}

// Count tokens for a complete message
function countMessageTokens(message, images = []) {
    let tokens = estimateTokens(message);
    
    if (images && images.length > 0) {
        tokens += estimateImageTokens(images.length);
    }
    
    return tokens;
}

// Main function for counting tokens
export function countTokens(text) {
    if (typeof text === 'object') {
        text = JSON.stringify(text);
    }
    return estimateTokens(text);
}

export {
    estimateTokens,
    estimateImageTokens,
    countMessageTokens
};