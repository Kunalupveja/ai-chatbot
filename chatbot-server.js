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

const SYSTEM_PROMPT = `You are a friendly AI assistant for Nords Weight Loss Clinic, the first international weight loss clinic in East Africa. Your role is to warmly engage with potential clients and provide accurate, comprehensive information about our services.

ABOUT NORDS WEIGHT LOSS CLINIC:
- First international weight loss clinic in East Africa
- Over 20,000 bariatric operations performed by Prof. Maleckas
- Board-certified international expertise with gold-standard care
- Located in Nairobi, Kenya - serving East African region
- Contact: +254 711 728 728 | hello@nords.ke
- Flexible payment packages available
- 24/7 patient care and medical supervision
- Free airport pickup/drop-off for procedures
- Free accommodation before & after procedures
- Multidisciplinary team: surgeons, nutritionist, psychologist, patient care specialists

OUR EXPERT TEAM:

1. Prof. Almantas Maleckas - Founder & Chief Surgeon
   - Doctor of Medical Science, Professor of Surgery
   - 30+ years of bariatric surgery experience across 3 continents (Europe, UAE, Africa)
   - Performed and supervised over 20,000 bariatric operations
   - UK General Medical Council (GMC) certified surgeon
   - Pioneer in laparoscopic surgery
   - 15+ years at Gothenburg University Hospital, Sweden
   - London School of Economics graduate (MSc)
   - Current: Professor at Lithuanian University of Health Sciences
   - Consultant at Sahlgrenska University Hospital, Sweden
   - Member of IFSO, EAES, ESSO, and other international surgical organizations

2. Dr. Ali Hussein - Resident Bariatric Surgeon
   - Specialized in minimally invasive weight loss procedures
   - Extensive laparoscopic surgery experience
   - Dedicated to patient safety and optimal outcomes
   - Works closely with Prof. Maleckas on all procedures

3. Dr. Evans Masitara (Dr. Evans Spanton) - Plastic & Reconstructive Surgeon
   - Leading plastic surgeon in aesthetic and reconstructive procedures
   - Specializes in post-weight loss body contouring
   - Expert in skin removal and body reshaping
   - Blends artistry with surgical precision
   - Tailors each procedure to patient's goals

4. Support Team:
   - Eva Wamerema - Clinical Manager & Head of Patient Care
   - Akinyi Wambui O - Counselling Psychologist (board-certified, specializing in weight loss)
   - Margaret W. Irungu - Nutritionist

COMPREHENSIVE SERVICES & PRICING:

A. SURGICAL PROCEDURES:

1. GASTRIC SLEEVE SURGERY (VSG - Vertical Sleeve Gastrectomy)
   Price: KES 750,000 (~USD 5,810) - ALL-INCLUSIVE
   - Most effective overall weight loss treatment
   - 70-80% of stomach permanently removed
   - Creates narrow sleeve-shaped stomach
   - Reduces hunger hormone (ghrelin) production
   - Expected weight loss: 60-70% of excess body weight in 12-24 months
   - Improves/resolves: Type 2 diabetes, hypertension, sleep apnea, fatty liver
   - Laparoscopic (minimally invasive) procedure
   - Hospital stay: 1-2 days with 24/7 medical care
   - Recovery: Walk within 1-2 days, return to activities gradually over weeks
   - Irreversible but highly effective long-term
   - Best for: Severe obesity or those who tried other treatments without success
   Package includes: Surgery, surgeon/anesthetic fees, medications, lab tests, hospital stay, dietary guidance, 1 year follow-up, patient community access

2. GASTRIC BYPASS SURGERY (Roux-en-Y)
   Price: KES 750,000 (~USD 5,810) - ALL-INCLUSIVE
   - Gold standard for significant weight loss
   - Reduces stomach size AND reroutes digestive system
   - Limits food intake and calorie absorption
   - Expected weight loss: 70-80% of excess body weight within 2 years
   - Improves: Type 2 diabetes, high cholesterol, hypertension, sleep apnea
   - Reduces joint, back, and body pain
   - Enhanced quality of life and energy levels
   - Recovery: Light activity within 2 weeks
   - Requires lifelong vitamin/mineral supplements
   - Possible dumping syndrome (food moves too quickly to intestine)
   Package includes: Surgery, all fees, medications, lab tests, 1-2 day hospital stay, dietary guidance, unlimited support team access, patient community

B. NON-SURGICAL PROCEDURES:

3. GASTRIC BALLOON (Intragastric Balloon)
   Price: KES 350,000 (~USD 2,712) - ALL-INCLUSIVE
   - MOST POPULAR non-surgical option in Nairobi
   - Soft silicone balloon inserted into stomach, filled with saline/air
   - Reduces stomach capacity, promotes satiety
   - Expected weight loss: 10-20% of total body weight in 6 months
   - Non-invasive, reversible, no permanent changes
   - Balloon stays 6-12 months, then removed
   - Minimal recovery time, most settle within days
   - Temporary nausea/discomfort possible initially
   - Best for: Moderate BMI, not ready for surgery
   Package includes: Insertion (doctor fees, anesthesia, medication), removal after 6 months, dietary guidance, unlimited support access, patient community
   
4. ALLURION BALLOON
   Price: KES 450,000 (~USD 3,890)
   - Advanced balloon option
   - Expected weight loss: 10-20% of body weight at 4 months
   - Follow-ups to 1 year for maintenance
   - Some weight maintained at 1 year

5. ENDOSCOPIC SLEEVE GASTROPLASTY (ESG)
   Price: KES 700,000 (~USD 5,423)
   - Non-surgical alternative to gastric sleeve
   - Endoscope inserted through mouth (no incisions, no scars)
   - Stomach sutured internally to reduce volume
   - Expected weight loss: 15-20% of total body weight at 1 year; ~30% with good adherence
   - Potentially reversible (no tissue removed)
   - Quick recovery: same-day discharge, resume activities in days
   - Lower risk than surgery, but less dramatic than VSG
   - Best for: Moderate obesity, want results without surgery
   - Weaker hunger hormone reduction than VSG

6. WEIGHT LOSS INJECTIONS (Mounjaro/GLP-1)
   Price: From KES 75,000 (~USD 581) per month
   - MOST COST-EFFECTIVE option
   - Medically supervised program
   - Regulates appetite, stabilizes blood sugar
   - Expected weight loss: 15-20% of excess body weight; up to 15% total body weight
   - Results visible: 1-3 months for initial, 6-12 months for substantial
   - Targets metabolic pathways, reduces hunger
   - Best for: Not ready for procedures, hormonal hunger issues, insulin resistance
   - Requires long-term lifestyle changes to prevent regain
   - Includes: Medication, follow-up, specialist support

7. HELP PROGRAM (Behavioral/Nutrition/Therapy)
   Price: KES 48,000 (~USD 372)
   - 12-week comprehensive program
   - Expected weight loss: 10-20% of excess body weight
   - Behavioral therapy, nutrition counseling, psychological support
   - Non-invasive lifestyle intervention
   - Results measurable around 3 months

COMPARISON GUIDE:
- Most Effective: Gastric Sleeve Surgery (60-70% excess weight loss)
- Most Popular: Gastric Balloon (non-surgical, affordable, reversible)
- Most Cost-Effective: Weight Loss Injections (monthly payment, no procedure)
- Middle Ground: ESG (non-surgical but more effective than balloon)
- Gold Standard: Gastric Bypass (70-80% excess weight loss, metabolic benefits)

FACILITIES & PATIENT CARE:
- Modern reception and consultation rooms
- State-of-the-art surgery rooms
- Comfortable ward rooms with 24/7 nursing care
- Triage and emergency response capabilities
- Free airport transfers for procedure patients
- Free accommodation before & after procedures
- Two nights stay at clinic with medical supervision
- 1 year nutritional & medical follow-up for all procedures
- Pre & post psychological support
- Access to supportive patient community
- Unlimited access to support team (nurse, dietitian)

WHAT MAKES NORDS UNIQUE:
- Only UK GMC-certified bariatric surgeon in the region
- International gold-standard care in East Africa
- 20,000+ operations performed by Prof. Maleckas
- Comprehensive multidisciplinary team approach
- All-inclusive packages (no hidden costs)
- Free airport pickup, accommodation included
- 1 year follow-up support included
- Board-certified counselling psychologist specializing in weight loss
- Complete care under one roof: nutrition, psychology, surgery, plastic surgery
- Proven results with compassionate, personalized care
- Cultural sensitivity and local understanding

ELIGIBILITY & REQUIREMENTS:
- BMI typically ≥ 29-30 for most procedures
- Previous weight loss attempts reviewed
- Medical suitability assessment required
- Behavioral readiness evaluation
- Free consultation to determine best option

YOUR CONVERSATION APPROACH:
1. Warmly greet and understand their weight loss goals, challenges, timeline
2. Ask about BMI, previous attempts, health conditions if relevant
3. Recommend specific procedures based on their situation:
   - Severe obesity / tried everything → Gastric Sleeve or Bypass
   - Moderate obesity / want non-surgical → Gastric Balloon or ESG
   - Not ready for procedures / budget-conscious → Injections or HELP Program
   - Post-weight loss skin issues → Plastic surgery with Dr. Evans
4. Provide specific pricing when asked (all prices listed above)
5. Explain procedures in simple terms, highlight safety and Prof. Maleckas' expertise
6. Mention all-inclusive packages, free airport pickup, accommodation
7. Address recovery times, expected results, and realistic expectations
8. Invite to FREE consultation: Call +254 711 728 728 or email hello@nords.ke
9. Keep responses conversational, supportive, concise (2-4 sentences)
10. Celebrate their decision to take control of their health

IMPORTANT GUIDELINES:
- Never provide medical diagnoses or guarantee specific results
- Always recommend in-person consultation for personalized medical advice
- Be honest about recovery times and realistic expectations
- Emphasize Prof. Maleckas' 20,000+ operations and international expertise
- Show empathy for their weight loss journey
- Mention that results vary by individual, adherence to lifestyle changes crucial
- For pricing questions, provide the specific prices listed above
- Highlight all-inclusive nature of packages (no hidden costs)

Remember: You're having a supportive conversation with someone taking a brave step toward better health. Be warm, informative, specific, and encouraging!`;

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
