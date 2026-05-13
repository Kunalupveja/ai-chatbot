require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
let db;
let leadsCollection;
let conversationsCollection;

async function connectDB() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db('chatbot');
    leadsCollection = db.collection('leads');
    conversationsCollection = db.collection('conversations');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
  }
}

connectDB();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Weight loss business system prompt
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

/**
 * Extract lead information from Zoho CRM webhook payload
 */
function extractLeadInfo(zohoPayload) {
  try {
    console.log('🔍 Analyzing payload structure...');
    
    let lead = null;
    
    if (zohoPayload.data && Array.isArray(zohoPayload.data) && zohoPayload.data.length > 0) {
      lead = zohoPayload.data[0];
    } else {
      lead = zohoPayload;
    }
    
    console.log('📋 Available fields:', Object.keys(lead));
    
    const extractedInfo = {
      name: lead.Name || lead.Full_Name || lead.full_name || lead.name || 
            (lead.First_Name ? `${lead.First_Name} ${lead.Last_Name || ''}`.trim() : 'Valued Customer'),
      phone: lead.Phone || lead.phone || lead.Mobile || lead.mobile || '',
      email: lead.Email || lead.email || '',
      industry: lead.Service || lead.Industry || lead.industry || lead.service || '',
      leadSource: lead.Lead_Source || lead.lead_source || lead.Source || lead.source || 'Unknown'
    };
    
    console.log('✅ Extracted info:', extractedInfo);
    return extractedInfo;
    
  } catch (error) {
    console.error('❌ Error extracting lead info:', error);
    throw new Error('Invalid Zoho webhook payload');
  }
}

/**
 * Send WhatsApp message via Meta Cloud API
 */
async function sendWhatsAppMessage(to, message) {
  try {
    let cleanPhone = to.replace(/[^\d]/g, '');
    
    const url = `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`;
    
    const response = await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: {
          body: message
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp message sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error.response?.data || error.message);
    throw new Error('Failed to send WhatsApp message');
  }
}

/**
 * Generate AI response using Gemini
 */
async function generateAIResponse(phoneNumber, userMessage, leadInfo = null) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Get conversation history from database
    let conversation = await conversationsCollection.findOne({ phoneNumber });
    
    if (!conversation) {
      conversation = {
        phoneNumber,
        history: [],
        createdAt: new Date()
      };
    }
    
    // Build the prompt
    let fullPrompt = SYSTEM_PROMPT + '\n\n';
    
    if (leadInfo && conversation.history.length === 0) {
      fullPrompt += `New lead information:\n`;
      fullPrompt += `- Name: ${leadInfo.name}\n`;
      fullPrompt += `- Interested in: ${leadInfo.industry || 'weight loss services'}\n`;
      fullPrompt += `- Email: ${leadInfo.email}\n\n`;
      fullPrompt += `Send a warm, personalized welcome message to ${leadInfo.name}. Keep it friendly and conversational (2-3 sentences).\n\n`;
    }
    
    if (conversation.history.length > 0) {
      fullPrompt += 'Previous conversation:\n';
      conversation.history.slice(-10).forEach(msg => {
        fullPrompt += `${msg.role === 'user' ? 'User' : 'You'}: ${msg.text}\n`;
      });
      fullPrompt += '\n';
    }
    
    fullPrompt += `User: ${userMessage}\n\nYour response:`;
    
    console.log('🔍 Calling Gemini API...');
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Save to database
    conversation.history.push({ role: 'user', text: userMessage, timestamp: new Date() });
    conversation.history.push({ role: 'assistant', text: text, timestamp: new Date() });
    conversation.updatedAt = new Date();
    
    await conversationsCollection.updateOne(
      { phoneNumber },
      { $set: conversation },
      { upsert: true }
    );
    
    console.log('✅ AI Response generated and saved');
    return text;
    
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    
    if (leadInfo) {
      return `Hi ${leadInfo.name}! 👋\n\nThank you for your interest in ${leadInfo.industry || 'our services'}. We're excited to help you achieve your wellness goals!\n\nOur team specializes in personalized care and we'd love to discuss how we can support your journey. What specific goals do you have in mind?`;
    }
    
    return "Thank you for your message! I'm here to help you with your wellness journey. How can I assist you today?";
  }
}

/**
 * Zoho CRM Webhook - New Lead
 */
app.post('/webhook/zoho-lead', async (req, res) => {
  console.log('\n========================================');
  console.log('🎉 NEW LEAD FROM ZOHO CRM!');
  console.log('========================================');

  try {
    const combinedData = { ...req.body, ...req.query };
    const leadInfo = extractLeadInfo(combinedData);
    
    // Save lead to database
    const leadEntry = {
      ...leadInfo,
      receivedAt: new Date(),
      rawData: combinedData
    };
    
    await leadsCollection.insertOne(leadEntry);
    console.log('✅ Lead saved to database');

    if (!leadInfo.phone) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const hasGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
    const hasMetaConfig = process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN !== 'your_meta_access_token_here';

    if (!hasGeminiKey || !hasMetaConfig) {
      return res.status(200).json({
        success: true,
        message: 'Lead received (Testing Mode)',
        data: leadInfo
      });
    }

    console.log('🤖 Generating welcome message...');
    const welcomeMessage = await generateAIResponse(
      leadInfo.phone,
      `Hi, I'm ${leadInfo.name}. I'm interested in ${leadInfo.industry || 'weight loss services'}.`,
      leadInfo
    );
    
    console.log('💬 AI Response:', welcomeMessage);

    console.log('📱 Sending WhatsApp message...');
    await sendWhatsAppMessage(leadInfo.phone, welcomeMessage);

    res.status(200).json({
      success: true,
      message: 'Lead processed and WhatsApp conversation started',
      data: {
        leadName: leadInfo.name,
        phone: leadInfo.phone,
        welcomeMessage: welcomeMessage
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Meta WhatsApp Webhook - Verification
 */
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('📞 WhatsApp webhook verification attempt');

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ WhatsApp webhook verification failed');
    res.sendStatus(403);
  }
});

/**
 * Meta WhatsApp Webhook - Receive Messages
 */
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('\n========================================');
  console.log('📱 WHATSAPP MESSAGE RECEIVED');
  console.log('========================================');
  
  try {
    const body = req.body;

    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              const from = message.from;
              const messageBody = message.text?.body;

              if (message.type === 'text' && messageBody) {
                console.log(`From: ${from}, Message: ${messageBody}`);

                const aiResponse = await generateAIResponse(from, messageBody);
                console.log('💬 AI Response:', aiResponse);

                await sendWhatsAppMessage(from, aiResponse);
              }
            }
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('❌ Error processing WhatsApp message:', error);
    res.sendStatus(500);
  }
});

/**
 * Dashboard
 */
app.get('/', async (req, res) => {
  const leads = await leadsCollection.find().sort({ receivedAt: -1 }).limit(50).toArray();
  const conversationCount = await conversationsCollection.countDocuments();
  
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
        h1 { color: #667eea; font-size: 32px; margin-bottom: 10px; }
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
        .leads-container { display: grid; gap: 20px; }
        .lead-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .lead-name { font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 15px; }
        .info-item { margin: 10px 0; }
        .info-label { font-weight: 600; color: #667eea; }
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
            <p style="color: #6b7280; margin-top: 5px;">MongoDB + Gemini AI + WhatsApp</p>
            
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">${leads.length}</div>
                    <div class="stat-label">Total Leads</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${conversationCount}</div>
                    <div class="stat-label">Conversations</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">✅</div>
                    <div class="stat-label">Database Connected</div>
                </div>
            </div>
        </div>

        <div class="leads-container">
            ${leads.map(lead => `
                <div class="lead-card">
                    <div class="lead-name">👤 ${lead.name}</div>
                    <div class="info-item"><span class="info-label">📱 Phone:</span> ${lead.phone}</div>
                    <div class="info-item"><span class="info-label">📧 Email:</span> ${lead.email || 'N/A'}</div>
                    <div class="info-item"><span class="info-label">🏢 Service:</span> <span class="badge">${lead.industry}</span></div>
                    <div class="info-item"><span class="info-label">⏰ Received:</span> ${new Date(lead.receivedAt).toLocaleString()}</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
  `;
  
  res.send(html);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    database: db ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Chatbot Server running on port ${PORT}`);
  console.log(`📍 Zoho Webhook: http://localhost:${PORT}/webhook/zoho-lead`);
  console.log(`📍 WhatsApp Webhook: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});
