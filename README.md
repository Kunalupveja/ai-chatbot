# AI Chatbot - Zoho CRM + Gemini AI + WhatsApp

A two-way AI chatbot that integrates Zoho CRM, Google Gemini AI, and Meta WhatsApp Cloud API.

## Features

- ✅ Receives new leads from Zoho CRM webhooks
- ✅ Sends personalized welcome messages via WhatsApp
- ✅ Two-way AI conversations using Google Gemini
- ✅ Conversation memory and context awareness
- ✅ Real-time dashboard for monitoring leads
- ✅ Meta WhatsApp Cloud API integration

## Setup

### Environment Variables

Set these in your hosting platform:

```
GEMINI_API_KEY=your_gemini_api_key
META_ACCESS_TOKEN=your_meta_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
META_VERIFY_TOKEN=your_verify_token
BUSINESS_NAME=Your Business Name
PORT=3000
```

### Installation

```bash
npm install
node chatbot-server.js
```

## Webhooks

- **Zoho CRM**: `https://your-domain.com/webhook/zoho-lead`
- **WhatsApp**: `https://your-domain.com/webhook/whatsapp`
- **Dashboard**: `https://your-domain.com/`

## Documentation

See `CHATBOT-SETUP.md` for detailed setup instructions.

## License

ISC
