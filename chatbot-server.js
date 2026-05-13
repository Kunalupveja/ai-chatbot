require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database tables
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        industry VARCHAR(255),
        lead_source VARCHAR(255),
        received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        raw_data JSONB
      )
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(50) UNIQUE,
        history JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ Database tables initialized');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

initDB();

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
    let lead = zohoPayload.data?.[0] || zohoPayload;
    
    return {
      name: lead.Name || lead.Full_Name || lead.full_name || lead.name || 'Valued Customer',
      phone: lead.Phone || lead.phone || lead.Mobile || lead.mobile || '',
      email: lead.Email || lead.email || '',
      industry: lead.Service || lead.Industry || lead.industry || lead.service || '',
      leadSource: lead.Lead_Source || lead.lead_source || lead.Source || lead.source || 'Unknown'
    };
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
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ WhatsApp message sent');
    return response.data;
  } catch (error) {
    console.error('❌ Error sending WhatsApp:', error.response?.data || error.message);
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
    const result = await pool.query(
      'SELECT history FROM conversations WHERE phone_number = $1',
      [phoneNumber]
    );
    
    let history = result.rows[0]?.history || [];
    
    // Build prompt
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
    
    const aiResult = await model.generateContent(fullPrompt);
    const response = await aiResult.response;
    const text = response.text();
    
    // Save to database
    history.push({ role: 'user', text: userMessage, timestamp: new Date() });
    history.push({ role: 'assistant', text: text, timestamp: new Date() });
    
    await pool.query(`
      INSERT INTO conversations (phone_number, history, updated_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (phone_number)
      DO UPDATE SET history = $2, updated_at = CURRENT_TIMESTAMP
    `, [phoneNumber, JSON.stringify(history)]);
    
    console.log('✅ AI response generated and saved');
    return text;
    
  } catch (error) {
    console.error('❌ Gemini API Error:', error.message);
    
    if (leadInfo) {
      return `Hi ${leadInfo.name}! 👋\n\nThank you for your interest in ${leadInfo.industry || 'our services'}. We're excited to help you achieve your wellness goals!\n\nHow can I assist you today?`;
    }
    
    return "Thank you for your message! I'm here to help. How can I assist you today?";
  }
}

/**
 * Zoho CRM Webhook
 */
app.post('/webhook/zoho-lead', async (req, res) => {
  console.log('\n🎉 NEW LEAD FROM ZOHO CRM!');

  try {
    const leadInfo = extractLeadInfo({ ...req.body, ...req.query });
    
    // Save to database
    await pool.query(`
      INSERT INTO leads (name, phone, email, industry, lead_source, raw_data)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [leadInfo.name, leadInfo.phone, leadInfo.email, leadInfo.industry, leadInfo.leadSource, JSON.stringify(req.body)]);
    
    console.log('✅ Lead saved to database');

    if (!leadInfo.phone) {
      return res.status(400).json({ success: false, error: 'Phone number required' });
    }

    const hasKeys = process.env.GEMINI_API_KEY && process.env.META_ACCESS_TOKEN;
    if (!hasKeys) {
      return res.json({ success: true, message: 'Testing mode', data: leadInfo });
    }

    console.log('🤖 Generating welcome message...');
    const welcomeMessage = await generateAIResponse(
      leadInfo.phone,
      `Hi, I'm ${leadInfo.name}. I'm interested in ${leadInfo.industry || 'weight loss services'}.`,
      leadInfo
    );

    console.log('📱 Sending WhatsApp...');
    await sendWhatsAppMessage(leadInfo.phone, welcomeMessage);

    res.json({
      success: true,
      message: 'Lead processed',
      data: { leadName: leadInfo.name, phone: leadInfo.phone }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * WhatsApp Webhook - Verification
 */
app.get('/webhook/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  
  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

/**
 * WhatsApp Webhook - Receive Messages
 */
app.post('/webhook/whatsapp', async (req, res) => {
  console.log('\n📱 WHATSAPP MESSAGE RECEIVED');
  
  try {
    if (req.body.object === 'whatsapp_business_account') {
      for (const entry of req.body.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              if (message.type === 'text' && message.text?.body) {
                const from = message.from;
                const text = message.text.body;
                
                console.log(`From: ${from}, Message: ${text}`);
                
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

/**
 * Dashboard
 */
app.get('/', async (req, res) => {
  const leadsResult = await pool.query('SELECT * FROM leads ORDER BY received_at DESC LIMIT 50');
  const statsResult = await pool.query('SELECT COUNT(*) as total_leads FROM leads');
  const convoResult = await pool.query('SELECT COUNT(*) as total_convos FROM conversations');
  
  const leads = leadsResult.rows;
  const totalLeads = statsResult.rows[0].total_leads;
  const totalConvos = convoResult.rows[0].total_convos;
  
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
            <p style="color: #6b7280; margin-top: 5px;">PostgreSQL + Gemini AI + WhatsApp</p>
            
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">${totalLeads}</div>
                    <div class="stat-label">Total Leads</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${totalConvos}</div>
                    <div class="stat-label">Conversations</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">✅</div>
                    <div class="stat-label">PostgreSQL Connected</div>
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
                    <div class="info-item"><span class="info-label">⏰ Received:</span> ${new Date(lead.received_at).toLocaleString()}</div>
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
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Chatbot Server running on port ${PORT}`);
  console.log(`📍 Zoho Webhook: http://localhost:${PORT}/webhook/zoho-lead`);
  console.log(`📍 WhatsApp Webhook: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});
