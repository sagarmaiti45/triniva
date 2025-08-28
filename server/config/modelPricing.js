// Model Pricing Configuration with Credit Multipliers
export const modelPricing = {
    // Free models (1x multiplier)
    'openai/gpt-oss-20b:free': {
        displayName: 'GPT OSS 20B',
        category: 'free',
        multiplier: 1,
        inputCost: 0,
        outputCost: 0,
        supportsImages: true
    },
    'moonshotai/kimi-k2:free': {
        displayName: 'Kimi K2',
        category: 'free',
        multiplier: 1,
        inputCost: 0,
        outputCost: 0,
        supportsImages: false
    },
    'meta-llama/llama-4-maverick:free': {
        displayName: 'Llama 4 Maverick (Free)',
        category: 'free',
        multiplier: 1,
        inputCost: 0,
        outputCost: 0,
        supportsImages: false
    },
    'deepseek/deepseek-r1-0528:free': {
        displayName: 'DeepSeek R1',
        category: 'free',
        multiplier: 1,
        inputCost: 0,
        outputCost: 0,
        supportsImages: false
    },
    
    // Budget models (2-4x multiplier)
    'openai/gpt-4o-mini': {
        displayName: 'GPT-4o Mini',
        category: 'budget',
        multiplier: 2,
        inputCost: 0.15,
        outputCost: 0.60,
        supportsImages: true
    },
    'meta-llama/llama-4-maverick': {
        displayName: 'Llama 4 Maverick',
        category: 'budget',
        multiplier: 2,
        inputCost: 0.15,
        outputCost: 0.60,
        supportsImages: false
    },
    'qwen/qwen3-coder': {
        displayName: 'Qwen3 Coder',
        category: 'budget',
        multiplier: 3,
        inputCost: 0.20,
        outputCost: 0.80,
        supportsImages: true
    },
    'z-ai/glm-4.5': {
        displayName: 'GLM 4.5',
        category: 'budget',
        multiplier: 3,
        inputCost: 0.20,
        outputCost: 0.80,
        supportsImages: false
    },
    'openai/gpt-5-mini': {
        displayName: 'GPT-5 Mini',
        category: 'budget',
        multiplier: 4,
        inputCost: 0.25,
        outputCost: 2.00,
        supportsImages: true
    },
    'google/gemini-2.5-flash': {
        displayName: 'Gemini 2.5 Flash',
        category: 'budget',
        multiplier: 4,
        inputCost: 0.30,
        outputCost: 2.50,
        supportsImages: true
    },
    'x-ai/grok-3-mini': {
        displayName: 'Grok 3 Mini',
        category: 'budget',
        multiplier: 3,
        inputCost: 0.30,
        outputCost: 0.50,
        supportsImages: false
    },
    'mistralai/mistral-medium': {
        displayName: 'Mistral Medium',
        category: 'budget',
        multiplier: 4,
        inputCost: 0.40,
        outputCost: 2.00,
        supportsImages: false
    },
    
    // Mid-tier models (8-12x multiplier)
    'anthropic/claude-3.5-haiku': {
        displayName: 'Claude 3.5 Haiku',
        category: 'mid',
        multiplier: 8,
        inputCost: 0.80,
        outputCost: 4.00,
        supportsImages: true
    },
    
    // Premium models (12-20x multiplier)
    'openai/gpt-5': {
        displayName: 'GPT-5',
        category: 'premium',
        multiplier: 12,
        inputCost: 1.25,
        outputCost: 10.00,
        supportsImages: true
    },
    'anthropic/claude-sonnet-4': {
        displayName: 'Claude Sonnet 4',
        category: 'premium',
        multiplier: 20,
        inputCost: 3.00,
        outputCost: 15.00,
        supportsImages: true
    },
    'x-ai/grok-4': {
        displayName: 'Grok 4',
        category: 'premium',
        multiplier: 20,
        inputCost: 3.00,
        outputCost: 15.00,
        supportsImages: true
    }
};

// Plan configurations
export const planConfigs = {
    free: {
        name: 'Free',
        credits: 1000,
        allowedModels: ['free'], // Only free category
        features: {
            chatHistoryDays: 7,
            support: 'community'
        }
    },
    starter: {
        name: 'Starter',
        credits: 10000,
        price: 297,
        allowedModels: ['free', 'budget'], // No premium models
        restrictedModels: ['anthropic/claude-sonnet-4', 'x-ai/grok-4', 'openai/gpt-5', 'anthropic/claude-3.5-haiku'],
        features: {
            chatHistoryDays: 30,
            support: 'email',
            export: true
        }
    },
    pro: {
        name: 'Pro',
        credits: 30000,
        price: 697,
        allowedModels: ['all'], // All models
        features: {
            chatHistoryDays: 30,
            support: 'priority',
            export: true,
            earlyAccess: true
        }
    },
    business: {
        name: 'Business',
        credits: 80000,
        price: 1497,
        allowedModels: ['all'], // All models
        features: {
            chatHistoryDays: 30,
            support: '24x7',
            export: true,
            apiAccess: true,
            customIntegrations: true
        }
    }
};

// Calculate credits consumed based on tokens and model
export function calculateCreditsConsumed(tokens, modelId) {
    const modelConfig = modelPricing[modelId];
    if (!modelConfig) {
        console.warn(`Model ${modelId} not found in pricing config, using default multiplier`);
        return Math.ceil(tokens / 1000); // Default 1x multiplier
    }
    
    // Calculate credits: (tokens / 1000) * multiplier
    return Math.ceil((tokens / 1000) * modelConfig.multiplier);
}

// Check if user can use a specific model based on their plan
export function canUseModel(userPlan, modelId) {
    const planConfig = planConfigs[userPlan] || planConfigs.free;
    const modelConfig = modelPricing[modelId];
    
    if (!modelConfig) {
        return false; // Unknown model
    }
    
    // Check if plan allows all models
    if (planConfig.allowedModels.includes('all')) {
        return true;
    }
    
    // Check if model is in restricted list for this plan
    if (planConfig.restrictedModels && planConfig.restrictedModels.includes(modelId)) {
        return false;
    }
    
    // Check if model category is allowed
    return planConfig.allowedModels.includes(modelConfig.category);
}

// Get model information
export function getModelInfo(modelId) {
    return modelPricing[modelId] || null;
}

// Get plan information
export function getPlanInfo(planSlug) {
    return planConfigs[planSlug] || planConfigs.free;
}

// Check if model is free
export function isModelFree(modelId) {
    const model = modelPricing[modelId];
    return model ? model.category === 'free' : false;
}

// Get all free models
export function getFreeModels() {
    return Object.keys(modelPricing).filter(modelId => 
        modelPricing[modelId].category === 'free'
    );
}

// Calculate actual API cost (for internal use)
export function calculateApiCost(inputTokens, outputTokens, modelId) {
    const model = modelPricing[modelId];
    if (!model) return 0;
    
    const inputCost = (inputTokens / 1000000) * model.inputCost;
    const outputCost = (outputTokens / 1000000) * model.outputCost;
    
    return inputCost + outputCost;
}

// Legacy function names for backward compatibility
export const calculateTokenCost = calculateCreditsConsumed;

export default {
    modelPricing,
    planConfigs,
    calculateCreditsConsumed,
    canUseModel,
    getModelInfo,
    getPlanInfo,
    isModelFree,
    getFreeModels,
    calculateApiCost
};