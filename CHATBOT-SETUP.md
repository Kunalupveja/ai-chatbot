# AI Chatbot Setup Guide
## Gemini AI + Meta WhatsApp Cloud API + Zoho CRM

This is a complete two-way AI chatbot that:
1. Receives new leads from Zoho CRM
2. Sends a welcome message via WhatsApp
3. Continues the conversation using Gemini AI

---

## Step 1: Get Your API Keys

### A. Gemini API Key
1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy your API key

### B. Meta WhatsApp Cloud API
1. Go to https://developers.facebook.com/
2. Create a new app or select existing
3. Add "WhatsApp" product
4. Get these values:
   - **Access Token** (Temporary or Permanent)
   - **Phone Number ID** (from WhatsApp > API Setup)
   - **Verify Token** (create your own, e.g., "my_secure_token_123")

---

## Step 2: Configure Environment Variables

Edit the `.env` file with your actual values:

```env
PORT=3000

# Gemini AI API
GEMINI_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Meta WhatsApp Cloud API
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
META_PHONE_NUMBER_ID=123456789012345
META_VERIFY_TOKEN=my_secure_token_123
META_WEBHOOK_SECRET=optional_webhook_secret

# Business Configuration
BUSINESS_NAME=Your Weight Loss Clinic Name
```

---

## Step 3: Start the Server

```bash
node chatbot-server.js
```

Or with auto-reload:
```bash
npm run dev
```

---

## Step 4: Expose with ngrok

```bash
ngrok http 3000
```

You'll get a URL like: `https://abc123.ngrok-free.dev`

---

## Step 5: Configure Meta WhatsApp Webhook

1. Go to Meta Developer Console → Your App → WhatsApp → Configuration
2. Click "Edit" next to Webhook
3. **Callback URL**: `https://abc123.ngrok-free.dev/webhook/whatsapp`
4. **Verify Token**: (same as META_VERIFY_TOKEN in .env)
5. Click "Verify and Save"
6. Subscribe to webhook fields:
   - ✅ messages
   - ✅ message_status (optional)

---

## Step 6: Configure Zoho CRM Webhook

1. Go to Zoho CRM → Setup → Automation → Webhooks
2. Edit your existing webhook or create new
3. **URL**: `https://abc123.ngrok-free.dev/webhook/zoho-lead`
4. **Method**: POST
5. **Parameters**:
   - Name → Last Name
   - Email → Email
   - Phone → Mobile
   - Service → Industry

---

## Step 7: Test the Flow

### Test 1: New Lead
1. Submit a form on your website
2. Lead is created in Zoho CRM
3. Zoho triggers webhook
4. Bot sends welcome message on WhatsApp
5. Check dashboard: http://localhost:3000

### Test 2: Conversation
1. Reply to the WhatsApp message
2. Bot responds using Gemini AI
3. Continue the conversation
4. Bot remembers context

---

## How It Works

### Flow Diagram:
```
Website Form → Zoho CRM → Webhook → Your Server
                                         ↓
                                    Gemini AI
                                         ↓
                                   WhatsApp (Welcome)
                                         
User Reply → WhatsApp → Webhook → Your Server
                                         ↓
                                    Gemini AI
                                         ↓
                                   WhatsApp (Response)
```

### Conversation Memory:
- Each phone number has its own conversation history
- Bot remembers previous messages (last 20 messages)
- Context is maintained throughout the conversation

---

## Dashboard Features

Access at: http://localhost:3000

- 📊 Total leads received
- 💬 Active conversations count
- 🤖 AI status indicator
- 📱 Lead details with phone, email, service
- 🗑️ Clear all leads button

---

## Important Notes

### Phone Number Format
Meta WhatsApp expects phone numbers in this format:
- ✅ Correct: `1234567890` (country code + number, no +)
- ❌ Wrong: `+1234567890` or `+1 234 567 890`

The server automatically cleans phone numbers.

### Testing Phone Numbers
- Use Meta's test numbers first
- Add your phone number in Meta Console → WhatsApp → Phone Numbers
- Verify your number before testing

### Rate Limits
- Meta has rate limits for messages
- Free tier: Limited messages per day
- Upgrade for production use

### Conversation Timeout
- Conversations are stored in memory
- Restart server = lose conversation history
- For production, use a database (MongoDB, Redis)

---

## Troubleshooting

### WhatsApp webhook not receiving messages
1. Check ngrok is running
2. Verify webhook URL in Meta Console
3. Check verify token matches
4. Look at Meta webhook logs

### Gemini API errors
1. Verify API key is correct
2. Check you have API quota
3. Ensure API is enabled in Google Cloud

### Messages not sending
1. Check Meta access token is valid
2. Verify phone number ID is correct
3. Check recipient number is registered
4. Look at server logs for errors

### Zoho webhook not working
1. Verify ngrok URL is correct
2. Check webhook parameters are set
3. Test with Zoho webhook logs
4. Ensure workflow rule is active

---

## Production Deployment

For production, deploy to:
- **Railway** (recommended)
- **Render**
- **Heroku**
- **AWS/DigitalOcean**

Don't forget to:
1. Update webhook URLs in Meta and Zoho
2. Use permanent access token (not temporary)
3. Add database for conversation history
4. Set up monitoring and logging
5. Configure proper error handling

---

## Security Best Practices

1. Never commit `.env` file
2. Use webhook secrets to verify requests
3. Validate all incoming data
4. Rate limit your endpoints
5. Use HTTPS only (ngrok provides this)

---

## Need Help?

Check the logs:
- Server logs show all webhook activity
- Meta Console has webhook logs
- Zoho CRM has webhook execution logs

Common issues are usually:
- Wrong API keys
- Incorrect webhook URLs
- Phone number format issues
- Webhook verification token mismatch
