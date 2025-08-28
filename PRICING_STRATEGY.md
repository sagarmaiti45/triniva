# Triniva AI - Pricing Strategy & Token Multipliers

## Overview
This document outlines the pricing strategy that ensures profitability while providing fair access to all AI models through a token multiplier system.

## Token Multiplier System

### Base Unit: "Triniva Credits"
- Users purchase plans with Triniva Credits (not raw tokens)
- Different models consume different amounts of credits
- 1 Credit = 1000 tokens for free models (baseline)

### Model Categories & Multipliers

#### 🆓 **Free Tier Models** (1x Multiplier)
- **Cost to us**: $0.00
- **Credit consumption**: 1 credit per 1000 tokens
- **Models**: GPT OSS 20B, Kimi K2, Llama 4 Maverick (Free), DeepSeek R1

#### 💡 **Budget Tier Models** (2x-4x Multiplier)  
- **Cost range**: $0.15-$0.40 per 1M input tokens
- **Credit consumption**: 2-4 credits per 1000 tokens
- **Models**:
  - GPT-4o Mini: 2x (Cost: $0.15/$0.60)
  - Llama 4 Maverick: 2x (Cost: $0.15/$0.60)
  - Qwen3 Coder: 3x (Cost: $0.20/$0.80) 
  - GLM 4.5: 3x (Cost: $0.20/$0.80)
  - GPT-5 Mini: 4x (Cost: $0.25/$2.00)
  - Gemini 2.5 Flash: 4x (Cost: $0.30/$2.50)
  - Grok 3 Mini: 3x (Cost: $0.30/$0.50)
  - Mistral Medium: 4x (Cost: $0.40/$2.00)

#### 💎 **Mid-Tier Models** (8x-12x Multiplier)
- **Cost range**: $0.80-$1.25 per 1M input tokens
- **Credit consumption**: 8-12 credits per 1000 tokens
- **Models**:
  - Claude 3.5 Haiku: 8x (Cost: $0.80/$4.00)
  - GPT-5: 12x (Cost: $1.25/$10.00)

#### 👑 **Premium Tier Models** (20x Multiplier)
- **Cost range**: $3.00+ per 1M input tokens  
- **Credit consumption**: 20 credits per 1000 tokens
- **Models**:
  - Claude Sonnet 4: 20x (Cost: $3.00/$15.00)
  - Grok 4: 20x (Cost: $3.00/$15.00)

---

## Updated Pricing Plans

### 🚀 **Starter Plan** - ₹297/month (~$3.50)
- **Credits**: 10,000 credits/month
- **Model Access**: 🚫 **Restricted** - No premium models
- **Available Models**: 12 models
  - ✅ Free models: GPT OSS 20B, Kimi K2, Llama 4 Maverick (Free), DeepSeek R1
  - ✅ Budget models: GPT-4o Mini, Llama 4 Maverick, Qwen3 Coder, GLM 4.5, GPT-5 Mini, Gemini 2.5 Flash, Grok 3 Mini, Mistral Medium
  - ❌ **NO ACCESS**: Claude Sonnet 4, Grok 4, GPT-5, Claude 3.5 Haiku
- **Effective Usage**:
  - Free models (1x): 10M tokens (10,000 chats)
  - Budget models (2-4x): 2.5-5M tokens (2,500-5,000 chats)
- **Chat History**: 30 days
- **Support**: Email support

### ⚡ **Pro Plan** - ₹697/month (~$8.20)
- **Credits**: 30,000 credits/month
- **Model Access**: ✅ ALL 16 models available
- **Effective Usage**:
  - Free models (1x): 30M tokens (30,000 chats)
  - Budget models (2-4x): 7.5-15M tokens (7,500-15,000 chats)
  - Mid-tier models (8-12x): 2.5-3.75M tokens (2,500-3,750 chats)
  - Premium models (20x): 1.5M tokens (1,500 chats)
- **Chat History**: 30 days
- **Priority Support**: Email + Chat
- **Early access**: New models

### 🏢 **Business Plan** - ₹1,497/month (~$17.60)
- **Credits**: 80,000 credits/month
- **Model Access**: ✅ ALL 16 models available
- **Effective Usage**:
  - Free models (1x): 80M tokens (80,000 chats)
  - Budget models (2-4x): 20-40M tokens (20,000-40,000 chats)
  - Mid-tier models (8-12x): 6.7-10M tokens (6,700-10,000 chats)
  - Premium models (20x): 4M tokens (4,000 chats)
- **Chat History**: 30 days
- **Priority Support**: Phone + Email + Chat
- **API Access**: Coming soon
- **Custom integrations**: Available

---

## Profitability Analysis

### Cost Structure (per 1000 tokens average usage)
- **Free models**: $0.00 cost = 100% profit
- **Budget models**: ~$0.50 cost vs ₹2-4 revenue = 75-90% profit
- **Mid-tier models**: ~$2-3 cost vs ₹8-12 revenue = 70-80% profit  
- **Premium models**: ~$9 cost vs ₹20 revenue = 55% profit

### Plan Profitability (assuming mixed usage)
- **Starter Plan**: ₹297 revenue - ₹50-150 costs = 50-80% profit margin
- **Pro Plan**: ₹697 revenue - ₹150-400 costs = 40-75% profit margin
- **Business Plan**: ₹1,497 revenue - ₹400-900 costs = 40-70% profit margin

---

## Implementation Strategy

### Phase 1: Token Tracking System
1. Create credit balance tracking for each user
2. Implement token multiplier calculations
3. Real-time credit deduction during chat

### Phase 2: Usage Analytics
1. Track model usage per user
2. Monitor credit consumption patterns
3. Generate usage reports for users

### Phase 3: Fair Usage Policy
1. Soft limits with warnings at 80% usage
2. Model restriction when credits exhausted
3. Automatic credit reset on billing cycle

---

## User Experience Features

### Credit Management
- **Real-time balance**: Show remaining credits
- **Usage breakdown**: Credits spent per model
- **Prediction**: Estimated days remaining based on usage
- **Top-up option**: Buy additional credits

### Model Access Strategy
- **Free users**: Access to free tier models only
- **Paid users**: Access to all models based on credit availability
- **Smart recommendations**: Suggest efficient models for user queries

### Fair Usage Notifications
- **75% usage**: "You've used 75% of your monthly credits"
- **90% usage**: "Running low on credits, consider upgrading"
- **100% usage**: "Credits exhausted, upgrade or wait for next cycle"

---

## Competitive Advantages

1. **Transparent Pricing**: Users know exactly what they're paying for
2. **Model Flexibility**: Access to 16+ models in one platform
3. **Cost Efficiency**: Pay based on actual usage, not flat rates
4. **Profitability**: Sustainable business model with healthy margins
5. **Scalability**: Easy to add new models with appropriate multipliers

---

## Risk Mitigation

### Usage Abuse Prevention
- **Rate limiting**: Max requests per minute/hour
- **Model switching limits**: Prevent rapid expensive model switching
- **Fair usage monitoring**: Flag unusual usage patterns

### Cost Control
- **Monthly credit caps**: Hard limits prevent runaway costs
- **Model availability**: Can disable expensive models during high usage
- **Dynamic pricing**: Adjust multipliers based on actual costs

---

## Next Steps

1. ✅ **Finalize pricing structure**
2. ⏳ **Implement credit tracking system**
3. ⏳ **Update frontend with new pricing**
4. ⏳ **Integrate Razorpay payment system**
5. ⏳ **Build user dashboard with credit management**
6. ⏳ **Create usage analytics and monitoring**

---

*Last Updated: January 2025*
*Pricing subject to change based on API cost fluctuations*