# Debugging Guide for Internal Server Error

## Common Causes & Solutions

### 1. Missing Environment Variables
Check if all required environment variables are set in Vercel:
- `STABILITY_API_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `JWT_SECRET`

### 2. API Key Issues
- Verify your Stability AI API key is valid
- Check if you have sufficient credits
- Ensure the key has proper permissions

### 3. Redis Connection
- Verify Upstash Redis credentials are correct
- Check if Redis instance is active
- Look for connection timeout errors

### 4. Request Format Issues
Common request problems:
```json
{
  "prompt": "test image",          // Required
  "model": "sd3.5-flash",          // Must be valid model
  "width": 1024,                   // Must match aspect ratio
  "height": 1024,                  // Must match aspect ratio
  "style_preset": "photographic",  // Optional
  "cfg_scale": 4,                  // 1-10 range
  "negative_prompt": "blurry"      // Optional
}
```

### 5. Model-Specific Issues
- `sd3.5-flash`, `sd3.5-medium`, `sd3.5-large-turbo` use `/generate/sd3` endpoint
- `stable-image-core` uses `/generate/core` endpoint
- `stable-image-ultra` uses `/generate/ultra` endpoint

## How to Debug

### 1. Check Vercel Function Logs
```bash
vercel logs --follow
```

### 2. Test Locally
```bash
npm run dev
# Check console for detailed errors
```

### 3. Use Postman Collection
Import `postman-collection.json` and test:
1. Set `baseUrl` variable to your deployment URL
2. Test each endpoint systematically
3. Check response details for specific errors

### 4. Common Error Messages

#### "Invalid API key"
- Check `STABILITY_API_KEY` in Vercel environment variables
- Regenerate key if needed

#### "Insufficient credits"
- Check your Stability AI account balance
- API costs: Flash (2.5), Core (3), Medium (3.5), Turbo (4), Ultra (8)

#### "Redis connection failed"
- Verify Upstash credentials
- Check if Redis instance is paused

#### "Rate limit exceeded"
- Guest users: 10 requests per 24h
- Logged users: 100 requests per 24h

### 5. Test Minimal Request
Try this basic request first:
```bash
curl -X POST https://your-app.vercel.app/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "a simple red circle",
    "model": "sd3.5-flash",
    "width": 1024,
    "height": 1024
  }'
```

## Environment Variable Check
Run this to verify all env vars are set:
```javascript
// Add temporarily to your API route
console.log({
  hasStabilityKey: !!process.env.STABILITY_API_KEY,
  hasRedisUrl: !!process.env.UPSTASH_REDIS_REST_URL,
  hasRedisToken: !!process.env.UPSTASH_REDIS_REST_TOKEN,
  hasJwtSecret: !!process.env.JWT_SECRET
});
```