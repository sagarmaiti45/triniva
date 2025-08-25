// Model pricing per million tokens (in USD)
const modelPricing = {
    'openai/gpt-oss-20b:free': { input: 0, output: 0, isFree: true },
    'moonshotai/kimi-k2:free': { input: 0, output: 0, isFree: true },
    'deepseek/deepseek-r1-0528:free': { input: 0, output: 0, isFree: true },
    'mistralai/mistral-medium': { input: 2.70, output: 8.10, isFree: false },
    'openai/gpt-4o-mini': { input: 0.15, output: 0.60, isFree: false },
    'qwen/qwen3-coder': { input: 0.10, output: 0.10, isFree: false },
    'anthropic/claude-sonnet-4': { input: 3.00, output: 15.00, isFree: false },
    'openai/gpt-5-mini': { input: 2.00, output: 8.00, isFree: false },
    'openai/gpt-5': { input: 15.00, output: 60.00, isFree: false },
    'anthropic/claude-3.5-haiku': { input: 0.25, output: 1.25, isFree: false },
    'google/gemini-2.5-flash': { input: 0.075, output: 0.30, isFree: false },
    'x-ai/grok-4': { input: 10.00, output: 30.00, isFree: false },
    'x-ai/grok-3-mini': { input: 2.00, output: 6.00, isFree: false },
    'meta-llama/llama-4-maverick': { input: 0.65, output: 2.70, isFree: false },
    'meta-llama/llama-3.3-70b-instruct': { input: 0.70, output: 2.80, isFree: false },
    'z-ai/glm-4.5': { input: 1.00, output: 1.00, isFree: false },
    'deepseek/deepseek-chat-v3-0324': { input: 0.14, output: 0.28, isFree: false }
};

// Calculate token cost (returns tokens to deduct from user balance)
function calculateTokenCost(model, inputTokens, outputTokens) {
    const pricing = modelPricing[model];
    
    if (!pricing) {
        console.warn(`No pricing found for model: ${model}`);
        // Default to a moderate cost if model not found
        return Math.ceil((inputTokens + outputTokens) * 1.5);
    }
    
    if (pricing.isFree) {
        return 0;
    }
    
    // For paid models, we use a simplified token calculation
    // Actual tokens consumed = (input + output) * multiplier based on cost
    const inputCost = (inputTokens / 1000000) * pricing.input;
    const outputCost = (outputTokens / 1000000) * pricing.output;
    const totalCostUSD = inputCost + outputCost;
    
    // Convert USD cost to tokens (1 token = $0.00001 approximately)
    // This gives us a reasonable token consumption rate
    const tokensToDeduct = Math.ceil(totalCostUSD * 100000);
    
    // Minimum 10 tokens for any paid request
    return Math.max(10, tokensToDeduct);
}

// Check if model is free
function isModelFree(model) {
    const pricing = modelPricing[model];
    return pricing ? pricing.isFree : false;
}

// Get all free models
function getFreeModels() {
    return Object.keys(modelPricing).filter(model => modelPricing[model].isFree);
}

export {
    modelPricing,
    calculateTokenCost,
    isModelFree,
    getFreeModels
};