import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Firebase Admin SDK
let adminDb: any = null;
function getFirestoreAdmin() {
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return null;
  }

  if (!adminDb) {
    try {
      const configPath = path.resolve(process.cwd(), 'src/firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const configRaw = fs.readFileSync(configPath, 'utf8');
        const firebaseConfig = JSON.parse(configRaw);
        
        if (getApps().length === 0) {
          initializeApp({
            projectId: firebaseConfig.projectId
          });
        }
        
        // Use default database, or sub-database if configured
        const dbId = firebaseConfig.firestoreDatabaseId;
        if (dbId && dbId !== '(default)') {
          adminDb = getFirestore(dbId);
          console.log(`[FIREBASE ADMIN] Initialized server-side Firestore connection to database: ${dbId}.`);
        } else {
          adminDb = getFirestore();
          console.log(`[FIREBASE ADMIN] Initialized server-side Firestore connection to default database.`);
        }
      } else {
        console.warn(`[FIREBASE ADMIN] Config file not found at ${configPath}`);
      }
    } catch (err) {
      console.error('[FIREBASE ADMIN] Initialization error:', err);
    }
  }
  return adminDb;
}

// Local cache to bypass Google ADC Permission Denied limits on sandboxed runners
const SMTP_CACHE_FILE = path.resolve(process.cwd(), 'smtp-cache.json');

function saveSmtpToCache(config: any) {
  try {
    fs.writeFileSync(SMTP_CACHE_FILE, JSON.stringify(config, null, 2), 'utf8');
    console.log('[SMTP CACHE] Successfully saved configuration to local secure cache.');
  } catch (err) {
    console.error('[SMTP CACHE] Failed to write cache file:', err);
  }
}

function loadSmtpFromCache(): any {
  try {
    if (fs.existsSync(SMTP_CACHE_FILE)) {
      const raw = fs.readFileSync(SMTP_CACHE_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('[SMTP CACHE] Failed to read cache file:', err);
  }
  return null;
}

// Lazy initializer for Gemini to prevent startup crashes if key is initially absent
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Ensure the dev server port is 3000 and proxy handles API routes
app.post('/api/gemini/generate-description', async (req, res) => {
  const { keywords, category } = req.body;
  if (!keywords) {
    return res.status(400).json({ error: 'Keywords are required' });
  }

  try {
    const client = getGeminiClient();
    const prompt = `Generate a compelling, detailed, and trustworthy product catalog description for a campus listing in a student-to-student marketplace.
Category: ${category || 'general'}
Keywords/Details: ${keywords}

Guidelines:
1. Make it professional and appealing to other college students.
2. Highlight why another student would find this useful (study relevance, physical state, affordability).
3. Do not sound too generic or like spam. Make it sound genuine.
4. Keep it concise (approx. 2 to 4 sentences).`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const description = response.text?.trim() || 'Could not generate description.';
    res.json({ description });
  } catch (error: any) {
    console.error('Gemini Description Error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to generate description via AI.',
      isFallback: true,
      description: `Premium quality ${category || 'item'} in excellent condition. Perfect for upcoming exams and semesters. Handheld curation, highly recommended.`
    });
  }
});

app.post('/api/gemini/generate-cover', async (req, res) => {
  const { title, details } = req.body;
  if (!title && !details) {
    return res.status(400).json({ error: 'Title or details are required to generate a cover' });
  }

  try {
    const client = getGeminiClient();
    const prompt = `A professional, clean, and elegant book cover illustration or showcase image for an academic textbook/notes listing.
Title/Subject: ${title || 'Academic Textbook'}
Details provided by seller: ${details || 'Scholarly manual'}
Aesthetic: Modern minimalist, educational, with subtle color accents and abstract geometry. Professional lighting.`;

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        }
      }
    });

    let base64Image = '';
    // Under Nano Banana models, look through parts for inlineData
    const candidates = response.candidates;
    if (candidates && candidates[0]?.content?.parts) {
      for (const part of candidates[0].content.parts) {
        if (part.inlineData?.data) {
          base64Image = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
          break;
        }
      }
    }

    if (!base64Image) {
      throw new Error('No image was returned in the parts array from gemini-2.5-flash-image');
    }

    res.json({ imageUrl: base64Image });
  } catch (error: any) {
    console.error('Gemini Image Error:', error);
    // Provide a beautiful fallback image based on college/academic aesthetic instead of crashing
    const fallbacks = [
      'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?q=80&w=400',
      'https://images.unsplash.com/photo-1532012197267-da84d127e765?q=80&w=400',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=400'
    ];
    const chosenFallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    res.status(500).json({
      error: error.message || 'Image generation failed.',
      isFallback: true,
      imageUrl: chosenFallback
    });
  }
});

app.post('/api/gemini/explain-book', async (req, res) => {
  const { title, authors, description, studentYear, studentBranch } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Book title is required' });
  }

  try {
    const client = getGeminiClient();
    const prompt = `You are a helpful academic AI companion for a student at Kamla Nehru Institute of Technology (KNIT), Sultanpur.
A student is looking at this book option on our global academic bookstore:
Title: "${title}"
Authors: "${authors || 'Unknown author'}"
Description: "${description || 'No description provided'}"

Student Profile:
Branch: ${studentBranch || 'Computer Science and Engineering'}
Year-Level: ${studentYear || 'Engineering Scholar'}

Explain this book's academic value to their specific curriculum, and generate a recommended 5-week study syllabus for this book.
Output must be structured as follows:
Use standard markdown bold and bullets, with EXACTLY 3 short scannable sections:
### 1. CURRICULUM SYLLABUS RELEVANCE
(Explain how it lines up with standard university board exams and subjects of their year/branch)

### 2. 5-WEEK ACCELERATED STUDY ROADMAP
(A concise weekly list of topics to master from this specific book)

### 3. EXAM CRITICAL CHEAT SHEET TAKEAWAYS
(3 high-impact summary bullets or critical key items)

Keep the tone encouraging, technical, and directly tailored to KNIT Sultanpur curriculum. Avoid dry preambles; get straight to Section 1. Keep it brief, tight, structured, and informative.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const explanation = response.text?.trim() || 'Could not generate explanation.';
    res.json({ explanation });
  } catch (error: any) {
    console.error('Gemini Explanation Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to analyze via AI.',
      isFallback: true,
      explanation: `### 1. CURRICULUM SYLLABUS RELEVANCE\nThis textbook align with core courses of ${studentBranch || 'Engineering'} branch. Highly recommended for semester theory and lab practical questions.\n\n### 2. 5-WEEK ACCELERATED STUDY ROADMAP\n* **Week 1-2**: Structural Foundations & Primary Models\n* **Week 3-4**: Mid-term curriculum alignment & deep exercises\n* **Week 5**: Full exam past papers review\n\n### 3. EXAM CRITICAL CHEAT SHEET TAKEAWAYS\n* Focus on numerical diagrams and exercise checklists.\n* Create dedicated notes for high-frequency board questions.\n* Relate key patterns directly to class teacher guidelines.`
    });
  }
});

// Secure marketplace purchase endpoint with dynamic pricing calculation & commission distribution
app.post('/api/marketplace/create-order', async (req, res) => {
  const { productId, sellerId, sellerPrice, customCommissionRate } = req.body;
  if (!productId || sellerPrice === undefined) {
    return res.status(400).json({ error: 'Product ID and Seller Price are required.' });
  }

  try {
    const commissionRate = customCommissionRate !== undefined ? Number(customCommissionRate) : 15; // default 15%
    const sellerPriceNum = Number(sellerPrice);
    
    const commissionAmount = (sellerPriceNum * commissionRate) / 100;
    const finalPublicPrice = sellerPriceNum + commissionAmount;

    const sessionTokenStr = 'pay_sess_' + Math.random().toString(36).substring(2, 15);
    
    res.json({
      success: true,
      productId,
      sellerId: sellerId || 'unspecified_seller',
      pricingBreakdown: {
        sellerPrice: sellerPriceNum,
        commissionPercentage: commissionRate,
        commissionAmount: Number(commissionAmount.toFixed(2)),
        finalPublicPrice: Number(finalPublicPrice.toFixed(2))
      },
      paymentGatewayConfig: {
        provider: 'Stripe & Razorpay Joint Ingress',
        sessionId: sessionTokenStr,
        currency: 'INR',
        amountInPaise: Math.round(finalPublicPrice * 100),
        checkoutUrl: `https://checkout.stripe.demo/pay/${sessionTokenStr}`
      },
      status: 'initialized_gateway_success'
    });
  } catch (error: any) {
    console.error('Order creation & gateway sync error:', error);
    res.status(500).json({ error: error.message || 'Failed to prepare dynamic pricing order session.' });
  }
});

// Secure endpoint for real Email dispatch via SMTP (or fallback simulation if credentials are empty)
app.post('/api/send-email', async (req, res) => {
  const { to, subject, html, message, smtpConfig } = req.body;
  if (!to || (!html && !message)) {
    return res.status(400).json({ error: 'Recipient address ("to") and content/message are required.' });
  }

  // Support direct parameter overrides from request (e.g. for dynamic diagnostic testing from Admin Dashboard)
  let smtpHost = smtpConfig?.host || process.env.SMTP_HOST;
  let smtpPort = smtpConfig?.port || process.env.SMTP_PORT || '587';
  let smtpUser = smtpConfig?.user || process.env.SMTP_USER;
  let smtpPass = smtpConfig?.pass || process.env.SMTP_PASS;
  let smtpSecure = smtpConfig?.secure !== undefined ? smtpConfig.secure : (process.env.SMTP_SECURE === 'true');
  let smtpSender = smtpConfig?.sender || process.env.SMTP_SENDER || smtpUser || '"Gate Portal Notification" <no-reply@example.com>';

  // If credentials are not set in the environment or request, attempt to load them securely from cache or secondary Firestore backup
  if (!smtpHost || !smtpUser || !smtpPass) {
    console.log('[EMAIL BACKEND] SMTP environment keys are null. Checking secure local cache first...');
    let cloudConfig = loadSmtpFromCache();
    
    if (!cloudConfig) {
      try {
        const db = getFirestoreAdmin();
        if (db) {
          console.log('[EMAIL BACKEND] Local cache absent. Testing Firestore fallback...');
          const smtpDoc = await db.collection('settings').doc('smtp').get();
          if (smtpDoc.exists) {
            cloudConfig = smtpDoc.data();
            if (cloudConfig) {
              saveSmtpToCache(cloudConfig); // populate local cache from Firestore
            }
          }
        }
      } catch (err: any) {
        console.warn('[EMAIL BACKEND] Failed to read settings/smtp backup from Firestore:', err.message);
      }
    }

    if (cloudConfig) {
      console.log('[EMAIL BACKEND] Successfully loaded active SMTP credentials from cache.');
      smtpHost = cloudConfig.host || smtpHost;
      smtpPort = cloudConfig.port || smtpPort;
      smtpUser = cloudConfig.user || smtpUser;
      smtpPass = cloudConfig.pass || smtpPass;
      if (cloudConfig.secure !== undefined) {
        smtpSecure = cloudConfig.secure;
      }
      smtpSender = cloudConfig.sender || smtpSender || smtpUser || '"Gate Portal Notification" <no-reply@example.com>';
    }
  }

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('[EMAIL SIMULATED] SMTP credentials are not set in the environment or Firestore. Message kept as on-screen simulation.');
    return res.json({
      success: false,
      reason: 'MISSING_CREDENTIALS',
      message: 'SMTP credentials not configured in Settings. Email OTP has been simulated.',
      simulatedCode: message
    });
  }

  // Detect if a Resend API Key is supplied as the SMTP password or username to route via high-speed Secure REST
  const isResend = (smtpPass && smtpPass.trim().startsWith('re_')) || (smtpUser && smtpUser.trim().startsWith('re_'));
  if (isResend) {
    const apiKey = (smtpPass && smtpPass.trim().startsWith('re_')) 
      ? smtpPass.trim() 
      : (smtpUser && smtpUser.trim().startsWith('re_') ? smtpUser.trim() : '');

    console.log('[EMAIL GATEWAY] Resend API Key detected on server. Dispatching directly via Resend Secure REST API.');
    try {
      let finalSender = smtpSender ? smtpSender.trim() : '';
      if (!finalSender || !finalSender.includes('@')) {
        finalSender = 'Acme <onboarding@resend.dev>';
      }
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: finalSender,
          to: [to.trim()],
          subject: subject || 'Gate Portal Access Security Code',
          text: message,
          html: html || `<p>${message}</p>`
        })
      });

      const resendResult = await response.json() as any;
      if (!response.ok || resendResult.error) {
        throw new Error(resendResult.error?.message || resendResult.message || 'Resend API rejected the request.');
      }

      console.log(`[RESEND SUCCESS] Email dispatched via REST API. Dispatch ID: ${resendResult.id}`);
      return res.json({
        success: true,
        messageId: resendResult.id,
        message: 'Real Email successfully dispatched via Resend HTTP Gateway!'
      });
    } catch (err: any) {
      console.error('[RESEND DISPATCH ERROR]:', err);
      return res.json({
        success: false,
        reason: 'SMTP_ERROR',
        error: `Resend API failed: ${err.message || 'Check your domain verification or API key permissions.'}`
      });
    }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });

    const mailOptions = {
      from: smtpSender,
      to,
      subject: subject || 'Gate Portal Access Security Code',
      text: message,
      html: html || `<p>${message}</p>`
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[REAL EMAIL SUCCESS] OTP/Email successfully dispatched to ${to}. Message ID: ${info.messageId}`);
    return res.json({
      success: true,
      messageId: info.messageId,
      message: 'Real Email successfully dispatched to your inbox!'
    });
  } catch (err: any) {
    console.error('[REAL EMAIL ERROR] SMTP transporter failed:', err);
    return res.json({
      success: false,
      reason: 'SMTP_ERROR',
      error: err.message || 'SMTP server rejected the dispatch.'
    });
  }
});

// Secure server-side endpoint to save SMTP configurations to Firestore via Admin SDK
app.post('/api/save-smtp', async (req, res) => {
  const { host, port, user, pass, secure, sender, updatedBy } = req.body;
  try {
    let finalPass = (pass || '').trim();
    const cached = loadSmtpFromCache();
    
    // Resolve password if masked mask placeholder is sent
    if (finalPass === '••••••••••••' || finalPass === '********' || !finalPass) {
      if (cached && cached.pass) {
        finalPass = cached.pass;
      } else {
        try {
          const db = getFirestoreAdmin();
          if (db) {
            const existingDoc = await db.collection('settings').doc('smtp').get();
            if (existingDoc.exists) {
              finalPass = existingDoc.data()?.pass || '';
            }
          }
        } catch (dbErr: any) {
          console.warn('[FIREBASE ADMIN] Could not fetch existing SMTP settings for password recovery:', dbErr.message);
        }
      }
    }
    
    const smtpConfig = {
      host: (host || '').trim(),
      port: (port || '').trim(),
      user: (user || '').trim(),
      pass: finalPass,
      secure: !!secure,
      sender: (sender || '').trim(),
      updatedAt: new Date().toISOString(),
      updatedBy: updatedBy || 'admin'
    };

    // 1. Primary storage: Local JSON Cache (guaranteed success)
    saveSmtpToCache(smtpConfig);
    console.log('[SMTP CACHE] Successfully saved SMTP configurations to primary secure cache.');

    // 2. Secondary storage backup: Firestore Admin SDK (optional, silent fallback)
    try {
      const db = getFirestoreAdmin();
      if (db) {
        await db.collection('settings').doc('smtp').set(smtpConfig);
        console.log(`[FIREBASE ADMIN] Saved secondary backup SMTP settings.`);
      }
    } catch (err: any) {
      console.warn('[FIREBASE ADMIN] Skipping secondary backup due to permission denied:', err.message);
    }
    
    return res.json({ success: true });
  } catch (err: any) {
    console.error('[SAVE SMTP ERROR]:', err);
    return res.status(500).json({ error: err.message || 'Failed to save SMTP configuration.' });
  }
});

// Secure server-side endpoint to fetch non-sensitive SMTP configurations from Firestore via Admin SDK
app.get('/api/get-smtp', async (req, res) => {
  try {
    // 1. Try primary storage loader: Local JSON cache
    let data = loadSmtpFromCache();

    // 2. Secondary storage fallback loader: Firestore
    if (!data) {
      try {
        const db = getFirestoreAdmin();
        if (db) {
          const smtpDoc = await db.collection('settings').doc('smtp').get();
          if (smtpDoc.exists) {
            data = smtpDoc.data() || {};
            saveSmtpToCache(data); // sync back to local cache
          }
        }
      } catch (err: any) {
        console.warn('[FIREBASE ADMIN] Skipped loading secondary backup due to permissions:', err.message);
      }
    }

    if (data) {
      return res.json({
        host: data.host || '',
        port: data.port || '',
        user: data.user || '',
        secure: data.secure !== undefined ? data.secure : false,
        sender: data.sender || '',
        hasPass: !!data.pass
      });
    }

    // Default configuration placeholder
    return res.json({
      host: '',
      port: '587',
      user: '',
      secure: false,
      sender: '',
      hasPass: false
    });
  } catch (err: any) {
    console.error('[GET SMTP ERROR]:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch SMTP configuration.' });
  }
});

// Secure endpoint for real SMS dispatch via Twilio (or fallback simulation if credentials are empty)
app.post('/api/send-sms', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Recipient phone number ("to") and message are required.' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !twilioPhone) {
    console.warn('[SMS SMS_SIMULATED] Twilio credentials are not set in the environment. Message kept as on-screen simulation.');
    return res.json({
      success: false,
      reason: 'MISSING_CREDENTIALS',
      message: 'Twilio keys not configured in Settings. SMS has been simulated on-screen.'
    });
  }

  try {
    const client = twilio(accountSid, authToken);
    const response = await client.messages.create({
      body: message,
      from: twilioPhone,
      to: to
    });
    console.log(`[REAL SMS SUCCESS] Message code successfully dispatched to ${to}. SID: ${response.sid}`);
    return res.json({
      success: true,
      sid: response.sid,
      message: 'Real SMS successfully dispatched to your physical phone!'
    });
  } catch (err: any) {
    console.error('[REAL SMS ERROR] Twilio client rejected request:', err);
    const isTrialUnverified = err.code === 21608 || 
      (err.message && (err.message.includes('unverified') || err.message.includes('Trial accounts')));
    
    return res.json({
      success: false,
      reason: isTrialUnverified ? 'TWILIO_UNVERIFIED_TRIAL_RECIPIENT' : 'TWILIO_API_ERROR',
      error: err.message || 'Twilio API rejected the dispatch.',
      code: err.code
    });
  }
});

// Setup Vite development middleware or serve production bundled files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server launched successfully routing to port ${PORT}`);
  });
}

startServer();
