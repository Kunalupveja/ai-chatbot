require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const bcrypt = require('bcryptjs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (for agent dashboard)
app.use(express.static('public'));

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

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

// Database Functions
async function saveLead(leadInfo) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .insert([{
        name: leadInfo.name,
        phone: leadInfo.phone,
        email: leadInfo.email,
        industry: leadInfo.industry,
        lead_source: leadInfo.leadSource,
        received_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    console.log('✅ Lead saved to database');
    return data[0];
  } catch (error) {
    console.error('❌ Database error:', error.message);
    return null;
  }
}

async function saveConversation(phoneNumber, userMessage, aiResponse, sentBy = 'ai', agentName = null, whatsappMessageId = null, messageStatus = 'sent', mediaData = null) {
  try {
    const conversationData = {
      phone_number: phoneNumber,
      user_message: userMessage,
      ai_response: aiResponse,
      sent_by: sentBy,
      agent_name: agentName,
      whatsapp_message_id: whatsappMessageId,
      message_status: messageStatus,
      created_at: new Date().toISOString()
    };

    // Add media data if present
    if (mediaData) {
      conversationData.media_type = mediaData.type;
      conversationData.media_url = mediaData.url;
      conversationData.media_id = mediaData.id;
      conversationData.media_mime_type = mediaData.mimeType;
      conversationData.media_filename = mediaData.filename;
      conversationData.media_size = mediaData.size;
      conversationData.media_caption = mediaData.caption;
    }

    const { error} = await supabase
      .from('conversations')
      .insert([conversationData]);

    if (error) throw error;
    console.log('✅ Conversation saved' + (mediaData ? ' with media' : ''));
  } catch (error) {
    console.error('❌ Conversation save error:', error.message);
  }
}

async function getMediaUrl(mediaId) {
  try {
    const response = await axios.get(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`
        }
      }
    );
    return response.data.url;
  } catch (error) {
    console.error('❌ Error getting media URL:', error.message);
    return null;
  }
}

async function getConversationHistory(phoneNumber, limit = 10) {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data.reverse(); // Return oldest first
  } catch (error) {
    console.error('❌ Error fetching history:', error.message);
    return [];
  }
}

async function getAllLeads(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Error fetching leads:', error.message);
    return [];
  }
}

async function getStats() {
  try {
    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    const { data: uniquePhones } = await supabase
      .from('conversations')
      .select('phone_number')
      .limit(1000);

    const uniqueCount = new Set(uniquePhones?.map(c => c.phone_number)).size;

    return {
      totalLeads: leadsCount || 0,
      activeConversations: uniqueCount || 0
    };
  } catch (error) {
    console.error('❌ Error fetching stats:', error.message);
    return { totalLeads: 0, activeConversations: 0 };
  }
}

// ============================================
// AGENT DASHBOARD FUNCTIONS
// ============================================

async function getConversationMode(phoneNumber) {
  try {
    const { data, error } = await supabase
      .from('conversation_modes')
      .select('*')
      .eq('phone_number', phoneNumber)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || { mode: 'ai', agent_id: null, agent_name: null };
  } catch (error) {
    console.error('❌ Error getting mode:', error.message);
    return { mode: 'ai', agent_id: null, agent_name: null };
  }
}

async function setConversationMode(phoneNumber, mode, agentId = null, agentName = null) {
  try {
    const { error } = await supabase
      .from('conversation_modes')
      .upsert({
        phone_number: phoneNumber,
        mode: mode,
        agent_id: agentId,
        agent_name: agentName,
        taken_over_at: mode === 'agent' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;
    console.log(`✅ Mode set to ${mode} for ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('❌ Error setting mode:', error.message);
    return false;
  }
}

async function authenticateAgent(username, password) {
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('username', username)
      .eq('active', true)
      .single();

    if (error) return null;
    
    // For demo, accept any password (in production, use bcrypt.compare)
    // const isValid = await bcrypt.compare(password, data.password_hash);
    const isValid = password === 'password123'; // Demo only
    
    if (isValid) {
      return {
        id: data.id,
        username: data.username,
        name: data.name,
        email: data.email
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return null;
  }
}

async function getAllConversationsForDashboard() {
  try {
    // Get all unique phone numbers from conversations
    const { data: allConversations, error: convError } = await supabase
      .from('conversations')
      .select('phone_number')
      .order('created_at', { ascending: false });

    if (convError) throw convError;

    // Get unique phone numbers
    const uniquePhones = [...new Set(allConversations.map(c => c.phone_number))];
    
    const conversations = [];

    for (const phone of uniquePhones) {
      // Get lead info (may not exist for incoming messages)
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('phone', phone)
        .single();

      // Skip leads that are blocked in test mode
      if (lead && lead.industry && lead.industry.includes('WhatsApp Blocked')) {
        console.log(`⚠️  Skipping blocked lead: ${lead.name} (${phone})`);
        continue;
      }
      
      // Get all messages for this phone
      const { data: messages } = await supabase
        .from('conversations')
        .select('*')
        .eq('phone_number', phone)
        .order('created_at', { ascending: false });

      // Only show in dashboard if:
      // 1. There are messages AND
      // 2. Either has user messages OR has successfully sent messages (not all failed)
      if (messages && messages.length > 0) {
        const hasUserMessages = messages.some(m => m.sent_by === 'user');
        const hasSuccessfulSent = messages.some(m => 
          (m.sent_by === 'ai' || m.sent_by === 'agent') && 
          m.message_status !== 'failed'
        );
        
        // Only show if there's actual conversation (user replied) OR messages were successfully sent
        if (hasUserMessages || hasSuccessfulSent) {
          // Get conversation mode
          const mode = await getConversationMode(phone);
          
          // Get latest message for preview
          const latestMessage = messages[0];

          // If no lead exists, create a temporary one for display
          const displayName = lead ? lead.name : phone; // Use phone number if no lead
          const displayEmail = lead ? lead.email : '';
          const displayIndustry = lead ? lead.industry : 'Incoming Message';

          conversations.push({
            phone: phone,
            name: displayName,
            email: displayEmail,
            industry: displayIndustry,
            mode: mode.mode,
            agentId: mode.agent_id,
            agentName: mode.agent_name,
            lastMessage: latestMessage.created_at,
            preview: latestMessage.user_message || latestMessage.ai_response
          });
        } else {
          console.log(`⚠️  Skipping conversation with only failed messages: ${lead?.name || phone} (${phone})`);
        }
      }
    }

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => new Date(b.lastMessage) - new Date(a.lastMessage));

    return conversations;
  } catch (error) {
    console.error('❌ Error getting conversations:', error.message);
    return [];
  }
}

// Normalize phone number - remove all non-digits
function normalizePhone(phone) {
  if (!phone) return '';
  return phone.replace(/[^\d]/g, '');
}

function extractLeadInfo(zohoPayload) {
  try {
    let lead = zohoPayload.data?.[0] || zohoPayload;
    
    return {
      name: lead.Name || lead.Full_Name || 'Valued Customer',
      phone: normalizePhone(lead.Phone || lead.Mobile || ''),
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
    const cleanPhone = normalizePhone(to);
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
    
    // Return message ID for status tracking
    return { 
      success: true, 
      data: response.data,
      messageId: response.data.messages?.[0]?.id
    };
  } catch (error) {
    console.error('❌ WhatsApp error:', error.response?.data || error.message);
    
    // Check if it's a recipient error (not in test recipients)
    const errorMessage = error.response?.data?.error?.message || '';
    const isRecipientError = errorMessage.includes('recipient') || 
                            errorMessage.includes('not a valid') ||
                            error.response?.data?.error?.code === 131026;
    
    return { 
      success: false, 
      error: error.response?.data || error.message,
      isRecipientError 
    };
  }
}

async function generateAIResponse(phoneNumber, userMessage, leadInfo = null) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Get conversation history from database
    const history = await getConversationHistory(phoneNumber, 10);
    
    let fullPrompt = SYSTEM_PROMPT + '\n\n';
    
    if (leadInfo && history.length === 0) {
      fullPrompt += `New lead: ${leadInfo.name}, interested in ${leadInfo.industry || 'weight loss services'}.\n\n`;
    }
    
    if (history.length > 0) {
      fullPrompt += 'Previous conversation:\n';
      history.forEach(msg => {
        fullPrompt += `User: ${msg.user_message}\n`;
        fullPrompt += `You: ${msg.ai_response}\n`;
      });
      fullPrompt += '\n';
    }
    
    fullPrompt += `User: ${userMessage}\n\nYour response:`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
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
    
    console.log('✅ Lead processed:', leadInfo.name);

    if (!leadInfo.phone) {
      return res.status(400).json({ success: false, error: 'Phone required' });
    }

    // Save to database first
    const savedLead = await saveLead(leadInfo);

    console.log('🤖 Generating message...');
    const welcomeMessage = await generateAIResponse(
      leadInfo.phone,
      `Hi, I'm ${leadInfo.name}. I'm interested in ${leadInfo.industry || 'weight loss services'}.`,
      leadInfo
    );

    console.log('📱 Sending WhatsApp...');
    const whatsappResult = await sendWhatsAppMessage(leadInfo.phone, welcomeMessage);

    if (!whatsappResult.success) {
      if (whatsappResult.isRecipientError) {
        console.log('⚠️  WhatsApp Test Mode: Phone not in test recipients');
        console.log('⚠️  Lead saved but message not sent (test mode restriction)');
        
        // Mark this lead as "test mode blocked" in database
        await supabase
          .from('leads')
          .update({ 
            lead_source: `${leadInfo.leadSource} (Test Mode - Not Sent)`,
            industry: `${leadInfo.industry} - WhatsApp Blocked`
          })
          .eq('phone', leadInfo.phone);
        
        return res.json({ 
          success: true, 
          message: 'Lead saved but WhatsApp blocked (test mode)',
          warning: 'Phone not in Meta test recipients'
        });
      } else {
        // Other WhatsApp error
        console.error('❌ WhatsApp send failed:', whatsappResult.error);
        
        // Save conversation with failed status
        await saveConversation(
          leadInfo.phone,
          `Hi, I'm ${leadInfo.name}. I'm interested in ${leadInfo.industry || 'weight loss services'}.`,
          welcomeMessage,
          'ai',
          null,
          null,
          'failed'
        );
        
        return res.status(500).json({ 
          success: false, 
          error: 'WhatsApp send failed',
          details: whatsappResult.error
        });
      }
    }

    // Save conversation with message ID
    await saveConversation(
      leadInfo.phone,
      `Hi, I'm ${leadInfo.name}. I'm interested in ${leadInfo.industry || 'weight loss services'}.`,
      welcomeMessage,
      'ai',
      null,
      whatsappResult.messageId,
      'sent'
    );

    res.json({ success: true, message: 'Lead processed and message sent' });

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
          
          // Handle message status updates (delivered, read)
          if (change.field === 'messages' && change.value.statuses) {
            for (const status of change.value.statuses) {
              const messageId = status.id;
              const statusType = status.status; // 'sent', 'delivered', 'read', 'failed'
              
              console.log(`📊 Status update: ${messageId} → ${statusType}`);
              
              // Update message status in database
              const { error } = await supabase
                .from('conversations')
                .update({ message_status: statusType })
                .eq('whatsapp_message_id', messageId);
              
              if (error) {
                console.error('❌ Error updating status:', error.message);
              } else {
                console.log(`✅ Status updated: ${statusType}`);
              }
            }
          }
          
          // Handle incoming messages
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              const from = normalizePhone(message.from);
              const mode = await getConversationMode(from);
              
              console.log(`From: ${from}`);
              console.log(`Type: ${message.type}`);
              console.log(`Mode: ${mode.mode}, Agent: ${mode.agent_name || 'None'}`);
              
              let userMessage = '';
              let mediaData = null;
              
              // Handle different message types
              if (message.type === 'text' && message.text?.body) {
                // Text message
                userMessage = message.text.body;
                console.log(`Message: ${userMessage}`);
                
              } else if (message.type === 'image' && message.image) {
                // Image message
                userMessage = message.image.caption || '[Image]';
                const mediaUrl = await getMediaUrl(message.image.id);
                
                mediaData = {
                  type: 'image',
                  url: mediaUrl,
                  id: message.image.id,
                  mimeType: message.image.mime_type,
                  filename: message.image.filename || 'image.jpg',
                  size: message.image.file_size || 0,
                  caption: message.image.caption || null
                };
                
                console.log(`📸 Image received: ${mediaData.filename} (${Math.round(mediaData.size/1024)}KB)`);
                
              } else if (message.type === 'video' && message.video) {
                // Video message
                userMessage = message.video.caption || '[Video]';
                const mediaUrl = await getMediaUrl(message.video.id);
                
                mediaData = {
                  type: 'video',
                  url: mediaUrl,
                  id: message.video.id,
                  mimeType: message.video.mime_type,
                  filename: message.video.filename || 'video.mp4',
                  size: message.video.file_size || 0,
                  caption: message.video.caption || null
                };
                
                console.log(`🎥 Video received: ${mediaData.filename} (${Math.round(mediaData.size/1024)}KB)`);
                
              } else if (message.type === 'document' && message.document) {
                // Document message
                userMessage = message.document.caption || `[Document: ${message.document.filename}]`;
                const mediaUrl = await getMediaUrl(message.document.id);
                
                mediaData = {
                  type: 'document',
                  url: mediaUrl,
                  id: message.document.id,
                  mimeType: message.document.mime_type,
                  filename: message.document.filename || 'document.pdf',
                  size: message.document.file_size || 0,
                  caption: message.document.caption || null
                };
                
                console.log(`📄 Document received: ${mediaData.filename} (${Math.round(mediaData.size/1024)}KB)`);
                
              } else if (message.type === 'audio' && message.audio) {
                // Audio message
                userMessage = '[Audio]';
                const mediaUrl = await getMediaUrl(message.audio.id);
                
                mediaData = {
                  type: 'audio',
                  url: mediaUrl,
                  id: message.audio.id,
                  mimeType: message.audio.mime_type,
                  filename: 'audio.ogg',
                  size: message.audio.file_size || 0,
                  caption: null
                };
                
                console.log(`🎵 Audio received (${Math.round(mediaData.size/1024)}KB)`);
                
              } else if (message.type === 'voice' && message.voice) {
                // Voice message
                userMessage = '[Voice Message]';
                const mediaUrl = await getMediaUrl(message.voice.id);
                
                mediaData = {
                  type: 'voice',
                  url: mediaUrl,
                  id: message.voice.id,
                  mimeType: message.voice.mime_type,
                  filename: 'voice.ogg',
                  size: message.voice.file_size || 0,
                  caption: null
                };
                
                console.log(`🎤 Voice message received (${Math.round(mediaData.size/1024)}KB)`);
                
              } else if (message.type === 'sticker' && message.sticker) {
                // Sticker
                userMessage = '[Sticker]';
                const mediaUrl = await getMediaUrl(message.sticker.id);
                
                mediaData = {
                  type: 'sticker',
                  url: mediaUrl,
                  id: message.sticker.id,
                  mimeType: message.sticker.mime_type,
                  filename: 'sticker.webp',
                  size: message.sticker.file_size || 0,
                  caption: null
                };
                
                console.log(`😊 Sticker received`);
                
              } else {
                // Unsupported message type
                console.log(`⚠️  Unsupported message type: ${message.type}`);
                continue;
              }
              
              // Handle based on conversation mode
              if (mode.mode === 'agent') {
                // Agent mode - just save message, don't respond
                console.log(`⚠️  Agent mode - message saved for agent ${mode.agent_name}`);
                await saveConversation(from, userMessage, '', 'user', null, null, null, mediaData);
                
              } else {
                // AI mode - generate and send response
                console.log('🤖 AI mode - generating response');
                
                // Check if lead exists, if not create one
                const { data: existingLead } = await supabase
                  .from('leads')
                  .select('*')
                  .eq('phone', from)
                  .single();
                
                if (!existingLead) {
                  // Create new lead for incoming message with phone as name
                  await supabase
                    .from('leads')
                    .insert([{
                      name: from, // Use phone number as name
                      phone: from,
                      email: '',
                      industry: 'Incoming Message',
                      lead_source: 'WhatsApp Direct',
                      received_at: new Date().toISOString()
                    }]);
                  
                  console.log(`✅ New lead created from incoming message: ${from}`);
                }
                
                // For media messages, acknowledge receipt
                let aiResponse;
                if (mediaData) {
                  if (mediaData.type === 'image') {
                    aiResponse = `Thank you for sharing that photo! I've received it. How can I help you with your weight loss journey?`;
                  } else if (mediaData.type === 'video') {
                    aiResponse = `Thank you for sharing that video! I've received it. How can I assist you today?`;
                  } else if (mediaData.type === 'document') {
                    aiResponse = `Thank you for sharing that document! I've received it. How can I help you?`;
                  } else {
                    aiResponse = `Thank you for your message! How can I assist you with your weight loss goals?`;
                  }
                } else {
                  aiResponse = await generateAIResponse(from, userMessage);
                }
                
                // Send WhatsApp message
                const whatsappResult = await sendWhatsAppMessage(from, aiResponse);
                
                // Save conversation with message ID and media data
                if (whatsappResult.success) {
                  await saveConversation(
                    from, 
                    userMessage, 
                    aiResponse, 
                    'ai', 
                    null, 
                    whatsappResult.messageId,
                    'sent',
                    mediaData
                  );
                } else {
                  await saveConversation(
                    from, 
                    userMessage, 
                    aiResponse, 
                    'ai', 
                    null, 
                    null,
                    'failed',
                    mediaData
                  );
                }
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

// ============================================
// AGENT DASHBOARD API ENDPOINTS
// ============================================

// Agent login
app.post('/api/agent/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const agent = await authenticateAgent(username, password);
    
    if (agent) {
      res.json({ success: true, agent });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all agents (for assignment dropdown)
app.get('/api/agents', async (req, res) => {
  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select('id, username, name, email')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) throw error;
    res.json({ success: true, agents });
  } catch (error) {
    console.error('Get agents error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all conversations
app.get('/api/conversations', async (req, res) => {
  try {
    const conversations = await getAllConversationsForDashboard();
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get messages for a conversation
app.get('/api/conversations/:phone/messages', async (req, res) => {
  try {
    const phone = normalizePhone(decodeURIComponent(req.params.phone));
    const { data: messages, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('phone_number', phone)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Get lead info
    const { data: lead } = await supabase
      .from('leads')
      .select('name')
      .eq('phone', phone)
      .single();

    const formattedMessages = [];
    
    messages.forEach(msg => {
      // Add user message if exists and not empty
      if (msg.user_message && msg.user_message.trim() !== '' && msg.user_message !== 'EMPTY') {
        formattedMessages.push({
          type: 'user',
          text: msg.user_message,
          timestamp: msg.created_at,
          name: lead?.name || 'Customer',
          agentName: null,
          status: null, // User messages don't have status
          // Media data - use proxy URL for authenticated access
          mediaType: msg.media_type,
          mediaUrl: msg.media_id ? `/api/media/${msg.media_id}` : null,
          mediaId: msg.media_id,
          mediaMimeType: msg.media_mime_type,
          mediaFilename: msg.media_filename,
          mediaSize: msg.media_size,
          mediaCaption: msg.media_caption
        });
      }
      
      // Add AI/agent response if exists and not empty
      if (msg.ai_response && msg.ai_response.trim() !== '' && msg.ai_response !== 'EMPTY') {
        formattedMessages.push({
          type: msg.sent_by || 'ai',
          text: msg.ai_response,
          timestamp: msg.created_at,
          name: lead?.name || 'Customer',
          agentName: msg.agent_name || null,
          status: msg.message_status || 'sent', // Include status for outgoing messages
          // Media data (usually null for AI/agent responses)
          mediaType: null,
          mediaUrl: null,
          mediaId: null,
          mediaMimeType: null,
          mediaFilename: null,
          mediaSize: null,
          mediaCaption: null
        });
      }
    });

    res.json({ success: true, messages: formattedMessages });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Take over conversation
app.post('/api/conversations/:phone/takeover', async (req, res) => {
  try {
    const phone = normalizePhone(decodeURIComponent(req.params.phone));
    const { agentId, agentName } = req.body;
    
    console.log(`🔄 Takeover request: ${phone} by ${agentName}`);
    const success = await setConversationMode(phone, 'agent', agentId, agentName);
    
    if (success) {
      console.log(`✅ Takeover successful for ${phone}`);
    } else {
      console.log(`❌ Takeover failed for ${phone}`);
    }
    
    res.json({ success });
  } catch (error) {
    console.error('Takeover error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Release conversation to AI
app.post('/api/conversations/:phone/release', async (req, res) => {
  try {
    const phone = normalizePhone(decodeURIComponent(req.params.phone));
    
    console.log(`🔄 Release request: ${phone} back to AI`);
    const success = await setConversationMode(phone, 'ai', null, null);
    
    if (success) {
      console.log(`✅ Released ${phone} to AI`);
    } else {
      console.log(`❌ Release failed for ${phone}`);
    }
    
    res.json({ success });
  } catch (error) {
    console.error('Release error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Assign conversation to another agent
app.post('/api/conversations/:phone/assign', async (req, res) => {
  try {
    const phone = normalizePhone(decodeURIComponent(req.params.phone));
    const { targetAgentId, targetAgentName, fromAgentName } = req.body;
    
    console.log(`🔄 Assign request: ${phone} from ${fromAgentName} to ${targetAgentName}`);
    
    // Update conversation mode to new agent
    const success = await setConversationMode(phone, 'agent', targetAgentId, targetAgentName);
    
    if (success) {
      // Add a system message to conversation history
      await supabase
        .from('conversations')
        .insert([{
          phone_number: phone,
          user_message: '',
          ai_response: `[Conversation assigned from ${fromAgentName} to ${targetAgentName}]`,
          sent_by: 'system',
          agent_name: null,
          message_status: null,
          created_at: new Date().toISOString()
        }]);
      
      console.log(`✅ Assigned ${phone} to ${targetAgentName}`);
      res.json({ success: true });
    } else {
      console.log(`❌ Assignment failed for ${phone}`);
      res.json({ success: false, message: 'Failed to assign conversation' });
    }
  } catch (error) {
    console.error('Assign error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Send message as agent
app.post('/api/conversations/:phone/send', async (req, res) => {
  try {
    const phone = normalizePhone(decodeURIComponent(req.params.phone));
    const { message, agentId, agentName } = req.body;
    
    console.log(`📤 Agent ${agentName} sending message to ${phone}`);
    
    // Send WhatsApp message
    const whatsappResult = await sendWhatsAppMessage(phone, message);
    
    if (whatsappResult.success) {
      // Save to database with message ID and agent name
      await saveConversation(
        phone, 
        '', 
        message, 
        'agent', 
        agentName, 
        whatsappResult.messageId,
        'sent'
      );
      
      console.log(`✅ Message sent successfully`);
      res.json({ success: true });
    } else {
      // Save with failed status
      await saveConversation(
        phone, 
        '', 
        message, 
        'agent', 
        agentName, 
        null,
        'failed'
      );
      
      console.log(`❌ Message failed to send`);
      res.json({ success: false, message: 'Failed to send WhatsApp message' });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start manual conversation
app.post('/api/conversations/start', async (req, res) => {
  try {
    const { phone, name, message, agentId, agentName } = req.body;
    
    if (!phone || !message || !agentId || !agentName) {
      return res.status(400).json({ 
        success: false, 
        message: 'Phone, message, agentId, and agentName are required' 
      });
    }
    
    const normalizedPhone = normalizePhone(phone);
    
    console.log(`📤 Manual chat started by ${agentName} to ${normalizedPhone}`);
    
    // Check if lead exists, if not create one
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('phone', normalizedPhone)
      .single();
    
    if (!existingLead) {
      // Create new lead
      await supabase
        .from('leads')
        .insert([{
          name: name || normalizedPhone, // Use phone number if no name provided
          phone: normalizedPhone,
          email: '',
          industry: 'Manual Chat',
          lead_source: 'Manual Outreach',
          received_at: new Date().toISOString()
        }]);
      
      console.log(`✅ New lead created: ${name || normalizedPhone}`);
    }
    
    // Send WhatsApp message
    const whatsappResult = await sendWhatsAppMessage(normalizedPhone, message);
    
    if (whatsappResult.success) {
      // Save conversation with agent mode
      await saveConversation(
        normalizedPhone,
        '',
        message,
        'agent',
        agentName,
        whatsappResult.messageId,
        'sent'
      );
      
      // Set conversation mode to agent
      await setConversationMode(normalizedPhone, 'agent', agentId, agentName);
      
      console.log(`✅ Manual chat message sent successfully`);
      res.json({ success: true, message: 'Message sent successfully' });
    } else {
      // Save with failed status
      await saveConversation(
        normalizedPhone,
        '',
        message,
        'agent',
        agentName,
        null,
        'failed'
      );
      
      console.log(`❌ Manual chat message failed to send`);
      res.json({ 
        success: false, 
        message: 'Failed to send WhatsApp message',
        error: whatsappResult.error
      });
    }
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Proxy media endpoint (to handle WhatsApp authentication)
app.get('/api/media/:mediaId', async (req, res) => {
  try {
    const mediaId = req.params.mediaId;
    
    // Get media URL from WhatsApp
    const mediaUrl = await getMediaUrl(mediaId);
    
    if (!mediaUrl) {
      return res.status(404).send('Media not found');
    }
    
    // Fetch media with authentication
    const response = await axios.get(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.META_ACCESS_TOKEN}`
      },
      responseType: 'arraybuffer'
    });
    
    // Forward the media to client
    res.set('Content-Type', response.headers['content-type']);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    res.send(response.data);
    
  } catch (error) {
    console.error('Media proxy error:', error.message);
    res.status(500).send('Failed to load media');
  }
});

// Serve React app in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'client/dist')));
}

// Serve agent dashboard (HTML fallback for development)
app.get('/agent-dashboard', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(__dirname, 'client/dist/index.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public', 'agent-dashboard.html'));
  }
});

// Dashboard
app.get('/', async (req, res) => {
  const leads = await getAllLeads(50);
  const stats = await getStats();
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>AI Chatbot Dashboard - Supabase</title>
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
        .badge-db {
            display: inline-block;
            background: #10b981;
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            margin-left: 10px;
        }
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
            <h1>🤖 AI Chatbot Dashboard <span class="badge-db">🗄️ Supabase</span></h1>
            <p style="color: #6b7280; margin-top: 5px;">Gemini AI + WhatsApp + Zoho CRM + Supabase Database</p>
            
            <div class="stats">
                <div class="stat-box">
                    <div class="stat-number">${stats.totalLeads}</div>
                    <div class="stat-label">Total Leads (Database)</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${stats.activeConversations}</div>
                    <div class="stat-label">Active Conversations</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">✅</div>
                    <div class="stat-label">System Online</div>
                </div>
            </div>
        </div>

        ${leads.map(lead => `
            <div class="lead-card">
                <div class="lead-name">👤 ${lead.name}</div>
                <div class="info-item">📱 Phone: ${lead.phone}</div>
                <div class="info-item">📧 Email: ${lead.email || 'N/A'}</div>
                <div class="info-item">🏢 Service: <span class="badge">${lead.industry}</span></div>
                <div class="info-item">📍 Source: ${lead.lead_source}</div>
                <div class="info-item">⏰ ${new Date(lead.received_at).toLocaleString()}</div>
            </div>
        `).join('')}
    </div>
</body>
</html>
  `;
  res.send(html);
});

app.get('/health', async (req, res) => {
  const stats = await getStats();
  res.json({
    status: 'healthy',
    database: 'supabase',
    ...stats
  });
});

// Test database connection on startup
async function testDatabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('✅ Supabase connected successfully');
  } catch (error) {
    console.error('❌ Supabase connection error:', error.message);
    console.log('⚠️  Server will continue but database features may not work');
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 AI Chatbot Server running on port ${PORT}`);
  console.log(`📍 Dashboard: http://localhost:${PORT}`);
  console.log(`👤 Agent Dashboard: http://localhost:${PORT}/agent-dashboard`);
  console.log(`🗄️  Database: Supabase`);
  console.log(`⚛️  Frontend: ${process.env.NODE_ENV === 'production' ? 'React (Production)' : 'HTML (Development)'}`);
  await testDatabaseConnection();
});
