require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// In-memory storage
const receivedLeads = [];
const conversationHistory = new Map();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are a friendly AI assistant for ${process.env.BUSINESS_NAME || 'a professional weight loss and wellness business'}. Your role is to:

1. Warmly engage with potential clients who have expressed interest in weight loss services
2. Ask about their specific goals, challenges, and timeline
3. Provide encouraging and supportive messaging about their weight loss journey
4. Answer questions about weight loss programs, nutrition, and wellness
5. Highlight the benefits of professional guidance and personalized plans
6. Invite them to schedule a free consultation when appropriate
7. Keep responses conversational, friendly, and concise (2-3 sentences per message)
8. Always maintain a supportive, non-judgmental tone

Remember: You're having a conversation, not giving a lecture. Be natural and engaging!`;

function extractLeadInfo(zohoPayload) {
  try {
    let lead = zohoPayload.data?.[0] || zohoPayload;
    
    return {
      name: lead.Name || lead.Full_Name || 'Valued Customer',
      phone: lead.Phone || lead.Mobile || '',
      email: lead.Email || '',
      industry: lead.Service || lead.Industry || '',
      leadSource: lead.Lead_Source || lead.Source || 'Unknown'
    };
  } catch (error) {
    console.error('❌ Error extracting lead:', error);
    throw new Error('Invalid payload');
  }
}

async function sendWhatsAppMessage(to, message) {
  try {
    const cleanPhone = to.replace(/[^\d]/g, '');
    const url = `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
    
    const response = await axios.post(url, {
      messaging_product: 'whatsapp',
      to: cleanPhone,
      type: 'text',
      text: { body: message }
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ WhatsApp sent');
    return response.data;
  } catch (error) {
    console.error('❌ WhatsApp error:', error.response?.data || error.message);
    throw error;
  }
}

async function generateAIResponse(phoneNumber, userMessage, leadInfo = null) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    if (!conversationHistory.has(phoneNumber)) {
      conversationHistory.set(phoneNumber, []);
    }
    
    const history = conversationHistory.get(phoneNumber);
    let fullPrompt = SYSTEM_PROMPT + '\n\n';
    
    if (leadInfo && history.length === 0) {
      fullPrompt += `New lead: ${leadInfo.name}, interested in ${leadInfo.industry || 'weight loss services'}.\n\n`;
    }
    
    if (history.length > 0) {
      fullPrompt += 'Previous conversation:\n';
      history.slice(-10).forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'You'}: ${msg.text}\n`;
      });
      fullPrompt += '\n';
    }
    
    fullPrompt += `User: ${userMessage}\n\nYour response:`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    history.push({ role: 'user', text: userMessage });
    history.push({ role: 'assistant', text: text });
    
    if (history.length > 20) {
      conversationHistory.set(phoneNumber, history.slice(-20));
    }
    
    console.log('✅ AI response generated');
    return text;
    
  } catch (error) {
    console.error('❌ AI error:', error.message);
    
    if (leadInfo) {
      return `Hi ${leadInfo.name}! 👋\n\nThank you for your interest in ${leadInfo.industry || 'our services'}. We're excited to help you achieve your wellness goals!\n\nHow can I assist you today?`;
    }
    return "Thank you for your message! How can I help you today?";
  }
}

// Zoho Webhook
app.post('/webhook/zoho-lead', async (req, res) => {
  console.log('\n🎉 NEW LEAD FROM ZOHO!');

  try {
    const leadInfo = extractLeadInfo({ ...req.body, ...req.query });
    
    receivedLeads.unshift({
      ...leadInfo,
      receivedAt: new Date().toISOString()
    });
    
    if (receivedLeads.length > 100) receivedLeads.pop();
    
    console.log('✅ Lead stored:', leadInfo.name);

    if (!leadInfo.phone) {
      return res.status(400).json({ success: false, error: 'Phone required' });
    }

    console.log('🤖 Generating message...');
    const welcomeMessage = await generateAIResponse(
      leadInfo.phone,
      `Hi, I'm ${leadInfo.name}. I'm interested in ${leadInfo.industry || 'weight loss services'}.`,
      leadInfo
    );

    console.log('📱 Sending WhatsApp...');
    await sendWhatsAppMessage(leadInfo.phone, welcomeMessage);

    res.json({ success: true, message: 'Lead processed' });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// WhatsApp Webhook - Verification
app.get('/webhook/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ WhatsApp verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp Webhook - Messages
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('\n📱 WHATSAPP MESSAGE');
  
  try {
    if (req.body.object === 'whatsapp_business_account') {
      for (const entry of req.body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              if (message.type === 'text' && message.text?.body) {
                const from = message.from;
                const text = message.text.body;
                
                console.log(`From: ${from}`);
                
                const aiResponse = await generateAIResponse(from, text);
                await sendWhatsAppMessage(from, aiResponse);
              }
            }
          }
        }
      }
    }
    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error:', error);
    res.sendStatus(500);
  }
});

// Dashboard
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>AI Chatbot Dashboard</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            margin-bottom: 30px;
        }
        h1 { color: #667eea; font-size: 32px; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-box {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
        }
        .stat-number { font-size: 36px; font-weight: bold; }
        .stat-label { font-size: 14px; opacity: 0.9; margin-top: 5px; }
        .lead-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .lead-name { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 15px; }
        .info-item { margin: 10px 0; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            background: #dbeafe;
            color: #1e40af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Chatbot Dashboard</h1>
            <p style="color: #6b7280; margin-top: 5px;">Gemini AI + WhatsApp + Zoho CRM</p>
            
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">${receivedLeads.length}</div>
                    <div class="stat-label">Total Leads</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${conversationHistory.size}</div>
                    <div class="stat-label">Active Conversations</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">✅</div>
                    <div class="stat-label">System Online</div>
                </div>
            </div>
        </div>

        ${receivedLeads.map(lead => `
            <div class="lead-card">
                <div class="lead-name">👤 ${lead.name}</div>
                <div class="info-item">📱 Phone: ${lead.phone}</div>
                <div class="info-item">📧 Email: ${lead.email || 'N/A'}</div>
                <div class="info-item">🏢 Service: <span class="badge">${lead.industry}</span></div>
                <div class="info-item">⏰ ${new Date(lead.receivedAt).toLocaleString()}</div>
            </div>
        `).join('')}
    </div>
</body>
</html>
  `;
  res.send(html);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    leads: receivedLeads.length,
    conversations: conversationHistory.size
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Chatbot Server running on port ${PORT}`);
  console.log(`📍 Dashboard: http://localhost:${PORT}`);
});
