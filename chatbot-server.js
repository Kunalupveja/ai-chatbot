require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Store received leads and conversation history
const receivedLeads = [];
const conversationHistory = new Map(); // Map<phoneNumber, messages[]>

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
    // Clean phone number - Meta expects format without + or spaces
    let cleanPhone = to.replace(/[^\d]/g, '');
    
    // If doesn't start with country code, this might cause issues
    // Meta expects format like: 1234567890 (with country code, no +)
    
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
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Get or create conversation history
    if (!conversationHistory.has(phoneNumber)) {
      conversationHistory.set(phoneNumber, []);
      
      // Add initial context if this is a new lead
      if (leadInfo) {
        const contextMessage = `New lead: ${leadInfo.name}, interested in ${leadInfo.industry || 'weight loss services'}. Start the conversation warmly.`;
        conversationHistory.get(phoneNumber).push({
          role: 'user',
          parts: [{ text: contextMessage }]
        });
      }
    }
    
    const history = conversationHistory.get(phoneNumber);
    
    // Add user message to history
    history.push({
      role: 'user',
      parts: [{ text: userMessage }]
    });
    
    // Start chat with history
    const chat = model.startChat({
      history: history.slice(0, -1), // All except the last message
      generationConfig: {
        maxOutputTokens: 200,
        temperature: 0.7,
      },
    });
    
    // Send message and get response
    const result = await chat.sendMessage(userMessage);
    const response = result.response.text();
    
    // Add AI response to history
    history.push({
      role: 'model',
      parts: [{ text: response }]
    });
    
    // Keep only last 20 messages to avoid token limits
    if (history.length > 20) {
      conversationHistory.set(phoneNumber, history.slice(-20));
    }
    
    return response;
  } catch (error) {
    console.error('❌ Error calling Gemini API:', error);
    throw new Error('Failed to generate AI response');
  }
}

/**
 * Zoho CRM Webhook - New Lead
 */
app.post('/webhook/zoho-lead', async (req, res) => {
  console.log('\n========================================');
  console.log('🎉 NEW LEAD FROM ZOHO CRM!');
  console.log('========================================');
  console.log('Payload:', JSON.stringify(req.body, null, 2));

  try {
    const combinedData = { ...req.body, ...req.query };
    const leadInfo = extractLeadInfo(combinedData);
    
    // Store lead
    const leadEntry = {
      ...leadInfo,
      receivedAt: new Date().toISOString(),
      rawData: combinedData
    };
    receivedLeads.unshift(leadEntry);
    
    if (receivedLeads.length > 50) {
      receivedLeads.pop();
    }
    
    console.log('✅ Lead stored:', leadInfo);

    // Validate phone number
    if (!leadInfo.phone) {
      console.error('❌ No phone number provided');
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Check if API keys are configured
    const hasGeminiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
    const hasMetaConfig = process.env.META_ACCESS_TOKEN && process.env.META_ACCESS_TOKEN !== 'your_meta_access_token_here';

    if (!hasGeminiKey || !hasMetaConfig) {
      console.log('⚠️  API KEYS NOT CONFIGURED - TESTING MODE');
      return res.status(200).json({
        success: true,
        message: 'Lead received (Testing Mode)',
        data: leadInfo
      });
    }

    // Generate welcome message using AI
    console.log('🤖 Generating welcome message...');
    const welcomeMessage = await generateAIResponse(
      leadInfo.phone,
      `Hi, I'm ${leadInfo.name}. I'm interested in ${leadInfo.industry || 'weight loss services'}.`,
      leadInfo
    );
    
    console.log('💬 AI Response:', welcomeMessage);

    // Send WhatsApp message
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
  console.log('Mode:', mode);
  console.log('Token received:', token);
  console.log('Token expected:', process.env.META_VERIFY_TOKEN);
  console.log('Challenge:', challenge);

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified');
    res.status(200).send(challenge);
  } else {
    console.log('❌ WhatsApp webhook verification failed');
    console.log('Reason:', !mode ? 'No mode' : token !== process.env.META_VERIFY_TOKEN ? 'Token mismatch' : 'Unknown');
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
      const entries = body.entry;

      for (const entry of entries) {
        const changes = entry.changes;

        for (const change of changes) {
          if (change.field === 'messages') {
            const value = change.value;

            if (value.messages) {
              for (const message of value.messages) {
                const from = message.from;
                const messageBody = message.text?.body;
                const messageType = message.type;

                console.log(`From: ${from}`);
                console.log(`Type: ${messageType}`);
                console.log(`Message: ${messageBody}`);

                // Only respond to text messages
                if (messageType === 'text' && messageBody) {
                  // Generate AI response
                  console.log('🤖 Generating AI response...');
                  const aiResponse = await generateAIResponse(from, messageBody);
                  console.log('💬 AI Response:', aiResponse);

                  // Send response
                  await sendWhatsAppMessage(from, aiResponse);
                }
              }
            }

            // Mark messages as read
            if (value.messages) {
              for (const message of value.messages) {
                await axios.post(
                  `https://graph.facebook.com/v18.0/${process.env.META_PHONE_NUMBER_ID}/messages`,
                  {
                    messaging_product: 'whatsapp',
                    status: 'read',
                    message_id: message.id
                  },
                  {
                    headers: {
                      'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`,
                      'Content-Type': 'application/json'
                    }
                  }
                );
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
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Chatbot Dashboard</title>
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
        .btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin-top: 15px;
            margin-right: 10px;
            transition: all 0.3s;
        }
        .btn:hover { background: #059669; transform: translateY(-2px); }
        .btn-danger { background: #ef4444; }
        .btn-danger:hover { background: #dc2626; }
        .leads-container { display: grid; gap: 20px; }
        .lead-card {
            background: white;
            padding: 25px;
            border-radius: 15px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .lead-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 2px solid #f3f4f6;
        }
        .lead-name { font-size: 24px; font-weight: bold; color: #1f2937; }
        .lead-time { color: #6b7280; font-size: 14px; }
        .lead-info {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 15px;
        }
        .info-item { display: flex; align-items: center; gap: 10px; }
        .info-label { font-weight: 600; color: #667eea; min-width: 80px; }
        .info-value { color: #374151; }
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            background: #dbeafe;
            color: #1e40af;
        }
        .empty-state {
            background: white;
            padding: 60px;
            border-radius: 15px;
            text-align: center;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        .webhook-url {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
            font-family: monospace;
            font-size: 13px;
            word-break: break-all;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .status-active { background: #10b981; }
        .status-inactive { background: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 AI Chatbot Dashboard</h1>
            <p style="color: #6b7280; margin-top: 5px;">Gemini AI + WhatsApp + Zoho CRM Integration</p>
            
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
                    <div class="stat-number">
                        <span class="status-indicator ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? 'status-active' : 'status-inactive'}"></span>
                        ${process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' ? 'Active' : 'Inactive'}
                    </div>
                    <div class="stat-label">AI Status</div>
                </div>
            </div>
            
            <button class="btn" onclick="location.reload()">🔄 Refresh</button>
            <button class="btn btn-danger" onclick="clearLeads()">🗑️ Clear All</button>
            
            <div class="webhook-url">
                <strong>Zoho Webhook:</strong> ${req.protocol}://${req.get('host')}/webhook/zoho-lead<br>
                <strong>WhatsApp Webhook:</strong> ${req.protocol}://${req.get('host')}/webhook/whatsapp
            </div>
        </div>

        <div class="leads-container">
            ${receivedLeads.length === 0 ? `
                <div class="empty-state">
                    <h2>No leads yet</h2>
                    <p>Waiting for leads from Zoho CRM...</p>
                </div>
            ` : receivedLeads.map(lead => `
                <div class="lead-card">
                    <div class="lead-header">
                        <div class="lead-name">👤 ${lead.name}</div>
                        <div class="lead-time">⏰ ${new Date(lead.receivedAt).toLocaleString()}</div>
                    </div>
                    <div class="lead-info">
                        <div class="info-item">
                            <span class="info-label">📱 Phone:</span>
                            <span class="info-value">${lead.phone || 'N/A'}</span>
                        </div>
                        <div class="info-item">
                            <span class="info-label">📧 Email:</span>
                            <span class="info-value">${lead.email || 'N/A'}</span>
                        </div>
                        ${lead.industry ? `
                        <div class="info-item">
                            <span class="info-label">🏢 Service:</span>
                            <span class="badge">${lead.industry}</span>
                        </div>
                        ` : ''}
                        <div class="info-item">
                            <span class="info-label">💬 Chat:</span>
                            <span class="info-value">${conversationHistory.has(lead.phone) ? 'Active' : 'Not Started'}</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <script>
        setTimeout(() => location.reload(), 15000);
        
        async function clearLeads() {
            if (!confirm('Clear all leads?')) return;
            try {
                const response = await fetch('/api/clear-leads', { method: 'POST' });
                const result = await response.json();
                alert('✅ ' + result.message);
                location.reload();
            } catch (error) {
                alert('❌ Error: ' + error.message);
            }
        }
    </script>
</body>
</html>
  `;
  
  res.send(html);
});

/**
 * API Endpoints
 */
app.get('/api/leads', (req, res) => {
  res.json({
    total: receivedLeads.length,
    leads: receivedLeads,
    activeConversations: conversationHistory.size
  });
});

app.post('/api/clear-leads', (req, res) => {
  const count = receivedLeads.length;
  receivedLeads.length = 0;
  conversationHistory.clear();
  console.log(`🗑️ Cleared ${count} leads and all conversations`);
  res.json({
    success: true,
    message: `Cleared ${count} leads and all conversations`
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Zoho-Gemini-WhatsApp Chatbot',
    leadsReceived: receivedLeads.length,
    activeConversations: conversationHistory.size
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Chatbot Server running on port ${PORT}`);
  console.log(`📍 Zoho Webhook: http://localhost:${PORT}/webhook/zoho-lead`);
  console.log(`📍 WhatsApp Webhook: http://localhost:${PORT}/webhook/whatsapp`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
});

module.exports = app;
