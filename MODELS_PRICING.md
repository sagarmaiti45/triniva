# Triniva AI - Model Pricing & Token Rates

## Overview
This document contains all integrated AI models in Triniva AI platform with their OpenRouter API pricing details.

**Last Updated**: December 2024  
**Currency**: USD per 1 Million tokens  
**Source**: OpenRouter API

---

## 📊 Pricing Summary Table

| Model | Provider | Input ($/1M) | Output ($/1M) | Context (tokens) | Free Tier |
|-------|----------|--------------|---------------|------------------|-----------|
| **GPT OSS 20B** | OpenAI | $0.00 | $0.00 | 131,072 | ✅ Yes |
| **Mistral Medium 3** | Mistral | $0.40 | $2.00 | 131,072 | ❌ No |
| **GPT-4o Mini** | OpenAI | $0.15 | $0.60 | 128,000 | ❌ No |
| **Qwen3 Coder** | Qwen | $0.20 | $0.80 | 262,144 | ❌ No |
| **Kimi K2** | MoonshotAI | $0.00 | $0.00 | 32,768 | ✅ Yes |
| **Claude Sonnet 4** | Anthropic | $3.00 | $15.00 | 200,000 | ❌ No |
| **GPT-5 Mini** | OpenAI | $0.25 | $2.00 | 400,000 | ❌ No |
| **GPT-5** | OpenAI | $1.25 | $10.00 | 400,000 | ❌ No |
| **Claude 3.5 Haiku** | Anthropic | $0.80 | $4.00 | 200,000 | ❌ No |
| **Gemini 2.5 Flash** | Google | $0.30 | $2.50 | 1,048,576 | ❌ No |
| **Grok 4** | xAI | $3.00 | $15.00 | 256,000 | ❌ No |
| **Grok 3 Mini** | xAI | $0.30 | $0.50 | 131,072 | ❌ No |
| **Llama 4 Maverick** | Meta | $0.15 | $0.60 | 1,048,576 | ❌ No |
| **Llama 4 Maverick (Free)** | Meta | $0.00 | $0.00 | 128,000 | ✅ Yes |
| **GLM 4.5** | Z.AI | $0.20 | $0.80 | 131,072 | ❌ No |
| **DeepSeek R1** | DeepSeek | $0.00 | $0.00 | 163,840 | ✅ Yes |

---

## 🆓 Free Models (4 models)

### 1. GPT OSS 20B
- **Model ID**: `openai/gpt-oss-20b:free`
- **Input Cost**: $0.00
- **Output Cost**: $0.00
- **Context Window**: 131,072 tokens
- **Image Support**: ✅ Yes

### 2. Kimi K2
- **Model ID**: `moonshotai/kimi-k2:free`
- **Input Cost**: $0.00
- **Output Cost**: $0.00
- **Context Window**: 32,768 tokens
- **Image Support**: ❌ No

### 3. Llama 4 Maverick (Free)
- **Model ID**: `meta-llama/llama-4-maverick:free`
- **Input Cost**: $0.00
- **Output Cost**: $0.00
- **Context Window**: 128,000 tokens
- **Image Support**: ❌ No

### 4. DeepSeek R1
- **Model ID**: `deepseek/deepseek-r1-0528:free`
- **Input Cost**: $0.00
- **Output Cost**: $0.00
- **Context Window**: 163,840 tokens
- **Image Support**: ❌ No

---

## 💰 Paid Models (12 models)

### Budget Tier ($0.15-$0.40 per 1M input)

#### 1. GPT-4o Mini
- **Model ID**: `openai/gpt-4o-mini-search-preview`
- **Input Cost**: $0.15 / 1M tokens
- **Output Cost**: $0.60 / 1M tokens
- **Context Window**: 128,000 tokens
- **Image Support**: ✅ Yes

#### 2. Llama 4 Maverick
- **Model ID**: `meta-llama/llama-4-maverick`
- **Input Cost**: $0.15 / 1M tokens
- **Output Cost**: $0.60 / 1M tokens
- **Context Window**: 1,048,576 tokens
- **Image Support**: ❌ No

#### 3. Qwen3 Coder
- **Model ID**: `qwen/qwen3-coder`
- **Input Cost**: $0.20 / 1M tokens
- **Output Cost**: $0.80 / 1M tokens
- **Context Window**: 262,144 tokens
- **Image Support**: ✅ Yes

#### 4. GLM 4.5
- **Model ID**: `z-ai/glm-4.5`
- **Input Cost**: $0.20 / 1M tokens
- **Output Cost**: $0.80 / 1M tokens
- **Context Window**: 131,072 tokens
- **Image Support**: ❌ No

#### 5. GPT-5 Mini
- **Model ID**: `openai/gpt-5-mini`
- **Input Cost**: $0.25 / 1M tokens
- **Output Cost**: $2.00 / 1M tokens
- **Context Window**: 400,000 tokens
- **Image Support**: ✅ Yes

#### 6. Gemini 2.5 Flash
- **Model ID**: `google/gemini-2.5-flash`
- **Input Cost**: $0.30 / 1M tokens
- **Output Cost**: $2.50 / 1M tokens
- **Context Window**: 1,048,576 tokens
- **Image Support**: ✅ Yes

#### 7. Grok 3 Mini
- **Model ID**: `x-ai/grok-3-mini`
- **Input Cost**: $0.30 / 1M tokens
- **Output Cost**: $0.50 / 1M tokens
- **Context Window**: 131,072 tokens
- **Image Support**: ❌ No

#### 8. Mistral Medium 3
- **Model ID**: `mistralai/mistral-medium-3`
- **Input Cost**: $0.40 / 1M tokens
- **Output Cost**: $2.00 / 1M tokens
- **Context Window**: 131,072 tokens
- **Image Support**: ❌ No

### Mid Tier ($0.80-$1.25 per 1M input)

#### 9. Claude 3.5 Haiku
- **Model ID**: `anthropic/claude-3.5-haiku`
- **Input Cost**: $0.80 / 1M tokens
- **Output Cost**: $4.00 / 1M tokens
- **Context Window**: 200,000 tokens
- **Image Support**: ✅ Yes

#### 10. GPT-5
- **Model ID**: `openai/gpt-5`
- **Input Cost**: $1.25 / 1M tokens
- **Output Cost**: $10.00 / 1M tokens
- **Context Window**: 400,000 tokens
- **Image Support**: ✅ Yes

### Premium Tier ($3.00+ per 1M input)

#### 11. Claude Sonnet 4
- **Model ID**: `anthropic/claude-sonnet-4`
- **Input Cost**: $3.00 / 1M tokens
- **Output Cost**: $15.00 / 1M tokens
- **Context Window**: 200,000 tokens
- **Image Support**: ✅ Yes

#### 12. Grok 4
- **Model ID**: `x-ai/grok-4`
- **Input Cost**: $3.00 / 1M tokens
- **Output Cost**: $15.00 / 1M tokens
- **Context Window**: 256,000 tokens
- **Image Support**: ✅ Yes

---

## 📈 Cost Analysis by Model Category

### Most Economical (Best for high volume)
1. **Free Models** - $0.00 cost
2. **GPT-4o Mini** - $0.15/$0.60
3. **Llama 4 Maverick** - $0.15/$0.60

### Best Balance (Performance vs Cost)
1. **Qwen3 Coder** - $0.20/$0.80
2. **GLM 4.5** - $0.20/$0.80
3. **Mistral Medium 3** - $0.40/$2.00

### Premium Performance
1. **GPT-5** - $1.25/$10.00
2. **Claude Sonnet 4** - $3.00/$15.00
3. **Grok 4** - $3.00/$15.00

### Largest Context Windows
1. **Gemini 2.5 Flash** - 1,048,576 tokens
2. **Llama 4 Maverick** - 1,048,576 tokens
3. **GPT-5 / GPT-5 Mini** - 400,000 tokens

---

## 💵 Token Cost Calculator

### Example Conversation (1000 tokens input, 1000 tokens output)

| Model | Input Cost | Output Cost | Total Cost | Cost in INR (₹85/$) |
|-------|------------|-------------|------------|---------------------|
| Free Models | $0.00 | $0.00 | **$0.00** | ₹0.00 |
| GPT-4o Mini | $0.00015 | $0.0006 | **$0.00075** | ₹0.064 |
| Mistral Medium | $0.0004 | $0.002 | **$0.0024** | ₹0.20 |
| GPT-5 | $0.00125 | $0.01 | **$0.01125** | ₹0.96 |
| Claude Sonnet 4 | $0.003 | $0.015 | **$0.018** | ₹1.53 |
| Grok 4 | $0.003 | $0.015 | **$0.018** | ₹1.53 |

---

## 🎯 Triniva AI Pricing Tiers vs Costs

### Starter Plan (₹197/month - 100,000 tokens)
- **Using Free Models**: 100% profit margin
- **Using GPT-4o Mini**: ~₹32 cost = 84% profit margin
- **Using Premium Models**: ~₹765 cost = -288% (loss)

### Pro Plan (₹497/month - 500,000 tokens)
- **Using Free Models**: 100% profit margin  
- **Using GPT-4o Mini**: ~₹160 cost = 68% profit margin
- **Using Premium Models**: ~₹3,825 cost = -670% (loss)

### Business Plan (₹997/month - 2,000,000 tokens)
- **Using Free Models**: 100% profit margin
- **Using GPT-4o Mini**: ~₹640 cost = 36% profit margin
- **Using Premium Models**: ~₹15,300 cost = -1435% (loss)

---

## 📝 Notes

1. **Model IDs**: Use exact model IDs when calling OpenRouter API
2. **Free Tier Limits**: Free models may have rate limits or usage restrictions
3. **Image Support**: Models with image support can process multimodal inputs
4. **Context Windows**: Larger context = more conversation history but higher cost
5. **Pricing Updates**: These prices are subject to change by OpenRouter

---

## 🔄 Update History

- **December 2024**: Initial documentation created
- Models updated: Replaced `llama-3.3-70b-instruct` with `llama-4-maverick:free`
- Added free versions for DeepSeek models

---

## 📞 API Integration

```javascript
// Example API call with model pricing awareness
const modelPricing = {
  'openai/gpt-4o-mini-search-preview': { input: 0.15, output: 0.60 },
  'anthropic/claude-sonnet-4': { input: 3.00, output: 15.00 },
  // ... other models
};

// Calculate cost for a request
function calculateCost(model, inputTokens, outputTokens) {
  const pricing = modelPricing[model];
  const inputCost = (inputTokens / 1000000) * pricing.input;
  const outputCost = (outputTokens / 1000000) * pricing.output;
  return inputCost + outputCost;
}
```