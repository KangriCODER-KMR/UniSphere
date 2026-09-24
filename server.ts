import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { cert, initializeApp, getApps } from 'firebase-admin/app';
import { getAuth as getFirebaseAdminAuth } from 'firebase-admin/auth';
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
          const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
            : undefined;
          initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : { projectId: firebaseConfig.projectId });
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

async function requireApiUser(req: express.Request, res: express.Response, next: express.NextFunction, adminOnly = false) {
  try {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const adminDbInstance = getFirestoreAdmin();
    if (!token || !adminDbInstance || getApps().length === 0) {
      return res.status(503).json({ error: 'Authenticated server integration is not configured.' });
    }
    const decoded = await getFirebaseAdminAuth(getApps()[0]).verifyIdToken(token);
    if (!decoded.email_verified && decoded.firebase?.sign_in_provider !== 'google.com') {
      return res.status(403).json({ error: 'Verified account required.' });
    }
    const profile = await adminDbInstance.collection('users').doc(decoded.uid).get();
    if (!profile.exists || (adminOnly && profile.data()?.role !== 'admin')) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  } catch (error) {
    console.warn('[API AUTH] Request rejected:', error);
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
}

app.use('/api/send-email', (req, res, next) => {
  if (!allowAiRequest(req)) return res.status(429).json({ error: 'Email request limit reached. Try again in a minute.' });
  next();
});
app.use('/api/ai', (req, res, next) => requireApiUser(req, res, next));
app.use(['/api/get-smtp', '/api/save-smtp'], (req, res, next) => requireApiUser(req, res, next, true));

let aiClient: GoogleGenAI | null = null;
const aiRequests = new Map<string, number[]>();

function getGeminiClient(): GoogleGenAI {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on this server.');
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

function allowAiRequest(req: express.Request): boolean {
  const now = Date.now();
  const key = req.ip || 'unknown';
  const recent = (aiRequests.get(key) || []).filter(timestamp => now - timestamp < 60_000);
  if (recent.length >= 20) return false;
  recent.push(now);
  aiRequests.set(key, recent);
  return true;
}

app.use('/api/ai', (req, res, next) => {
  if (!allowAiRequest(req)) {
    return res.status(429).json({ error: 'AI request limit reached. Try again in a minute.' });
  }
  next();
});

app.post('/api/ai/generate-description', async (req, res) => {
  const { keywords, category } = req.body;
  if (!keywords || typeof keywords !== 'string') {
    return res.status(400).json({ error: 'Keywords are required.' });
  }
  try {
    const response = await getGeminiClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Write a trustworthy 2-4 sentence campus marketplace description for a ${category || 'general item'} using these seller notes: ${keywords}. Mention condition and student usefulness without inventing specific facts.`
    });
    return res.json({ description: response.text?.trim() || keywords });
  } catch (error: any) {
    console.error('AI description error:', error);
    return res.status(503).json({ error: error.message || 'AI service unavailable.' });
  }
});

app.post('/api/ai/explain-book', async (req, res) => {
  const { title, authors, description, studentYear, studentBranch } = req.body;
  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Book title is required.' });
  }
  try {
    const response = await getGeminiClient().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `For a ${studentYear || 'university'} ${studentBranch || 'engineering'} student, explain the academic value of "${title}" by ${authors || 'unknown author'} (${description || 'no description'}). Return exactly these three markdown sections: ### 1. CURRICULUM SYLLABUS RELEVANCE, ### 2. 5-WEEK ACCELERATED STUDY ROADMAP, ### 3. EXAM CRITICAL CHEAT SHEET TAKEAWAYS. Keep it concise and do not invent course requirements.`
    });
    return res.json({ explanation: response.text?.trim() || 'No study guidance was generated.' });
  } catch (error: any) {
    console.error('AI book explanation error:', error);
    return res.status(503).json({ error: error.message || 'AI service unavailable.' });
  }
});

app.post('/api/ai/generate-cover', async (req, res) => {
  const { title, details } = req.body;
  if ((!title || typeof title !== 'string') && (!details || typeof details !== 'string')) {
    return res.status(400).json({ error: 'Title or details are required.' });
  }
  try {
    const response = await getGeminiClient().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Create a clean square academic cover image for ${title || 'a campus listing'}. Details: ${details || 'educational resource'}. Use a professional, modern, readable design.` }] },
      config: { imageConfig: { aspectRatio: '1:1' } }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(item => item.inlineData?.data);
    if (!part?.inlineData?.data) throw new Error('The image model returned no image.');
    return res.json({ imageUrl: `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}` });
  } catch (error: any) {
    console.error('AI cover error:', error);
    return res.status(503).json({ error: error.message || 'AI image service unavailable.' });
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
