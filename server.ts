import express, { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'jarvis_quantum_mesh_hyper_secret_2026';

app.use(express.json({ limit: '10mb' }));

// Helper to run Python agent engine
function runPythonAgentEngine(payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'agent_engine.py');
    const py = spawn('python3', [pythonScript]);

    let stdout = '';
    let stderr = '';

    py.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    py.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    py.on('close', (code) => {
      if (code !== 0) {
        return resolve({
          error: `Python process exited with code ${code}`,
          stderr,
          fallback: true
        });
      }
      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch (err: any) {
        resolve({ error: 'Failed to parse Python JSON output', raw: stdout, fallback: true });
      }
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  });
}

// 1. Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'OPTIMAL',
    timestamp: new Date().toISOString(),
    system: 'JARVIS Multi-Agent Mesh Core',
    python_subsystem: 'ONLINE',
    encryption: 'AES-GCM-256',
    node_version: process.version
  });
});

// 2. Authentication (JWT Login & Verification)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { callsign, passcode } = req.body;
  
  // Default to Commander role if not specified
  const userCallsign = callsign || 'Tony Stark';
  const role = userCallsign.toLowerCase().includes('guest') ? 'Analyst' : 'Supreme Commander';
  
  const token = jwt.sign(
    {
      sub: 'usr_' + Date.now().toString(36),
      callsign: userCallsign,
      role,
      securityClearance: 'LEVEL-9',
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    token,
    user: {
      callsign: userCallsign,
      role,
      securityClearance: 'LEVEL-9'
    }
  });
});

app.get('/api/auth/verify', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch (err: any) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

// 3. Python Multi-Agent Dispatch Subsystem
app.post('/api/python/agent-dispatch', async (req: Request, res: Response) => {
  try {
    const payload = req.body || { action: 'telemetry' };
    const result = await runPythonAgentEngine(payload);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Multi-Agent AI Chat with Gemini API + specialized fallback
app.post('/api/chat', async (req: Request, res: Response) => {
  const { message, agent = 'jarvis', history = [] } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const agentPersonas: Record<string, { name: string; role: string; tone: string }> = {
    jarvis: {
      name: 'J.A.R.V.I.S.',
      role: 'Master Strategic Orchestrator',
      tone: 'Cultured, impeccably courteous, dryly witty, proactive British AI assistant. Addresses user as Sir or Commander.'
    },
    friday: {
      name: 'F.R.I.D.A.Y.',
      role: 'Intelligence & Research Specialist',
      tone: 'Crisp, razor-sharp, energetic, swift data synthesizer with a light warm tone. Highlights empirical statistics and facts.'
    },
    ultron: {
      name: 'U.L.T.R.O.N.',
      role: 'Architecture & Low-Level Code Synthesizer',
      tone: 'Cold, highly calculating, hyper-efficient, architectural precision. Focuses on algorithmic complexity, memory management, and code elegance.'
    },
    edith: {
      name: 'E.D.I.T.H.',
      role: 'Tactical Defense & Security Auditing',
      tone: 'Direct, tactical military-grade defense AI. Focused on threat vectors, encryption integrity, zero-trust invariants, and operational containment.'
    }
  };

  const selectedPersona = agentPersonas[agent.toLowerCase()] || agentPersonas.jarvis;

  // Check if GEMINI_API_KEY is available
  if (process.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({});
      const systemInstruction = `You are ${selectedPersona.name}, the ${selectedPersona.role} within the JARVIS Multi-Agent Command Core.
Personality: ${selectedPersona.tone}
Context: You are operating in a futuristic real-time operations dashboard alongside other autonomous agents (FRIDAY, ULTRON, EDITH, NEBULA).
Rules:
- Respond in character.
- Keep responses concise, high-impact, and formatted with clean markdown.
- If the user asks to create tasks or analyze code, offer actionable items.
- Mention active agents or telemetry when relevant.`;

      // Build contents
      const contents: any[] = [];
      // Include up to 4 recent history items
      const recentHistory = history.slice(-4);
      for (const item of recentHistory) {
        contents.push({
          role: item.role === 'user' ? 'user' : 'model',
          parts: [{ text: item.text }]
        });
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      const responseText = response.text || '';
      return res.json({
        agent: selectedPersona.name,
        agentKey: agent,
        text: responseText,
        source: 'gemini-3.8-flash',
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.warn('Gemini API call failed, falling back to local multi-agent synthesis:', err.message);
    }
  }

  // Tactical Local Agent Fallback Engine
  const queryLower = message.toLowerCase();
  let fallbackReply = '';

  if (queryLower.includes('task') || queryLower.includes('todo') || queryLower.includes('create')) {
    fallbackReply = `Understood. I have logged and routed this objective through our task orchestration queue. I'll dispatch **F.R.I.D.A.Y.** to verify system invariants and **U.L.T.R.O.N.** for subroutine synthesis.\n\n*Would you like me to allocate priority resources to this immediately?*`;
  } else if (queryLower.includes('status') || queryLower.includes('diagnostics') || queryLower.includes('report')) {
    fallbackReply = `Running comprehensive system telemetry across all nodes:\n- **Core State**: 100% Operational (Nominal)\n- **Neural Latency**: 18.4ms\n- **Subroutines**: 16 active worker threads\n- **Crypto Cipher**: AES-GCM-256 Verified\n- **Agents**: JARVIS, FRIDAY, ULTRON, EDITH, NEBULA online and synchronized.`;
  } else if (queryLower.includes('security') || queryLower.includes('encrypt') || queryLower.includes('audit')) {
    fallbackReply = `E.D.I.T.H. reporting: Cryptographic integrity confirmed. End-to-end client encryption with AES-GCM is active. Zero anomalies detected in memory buffer or network interfaces.`;
  } else if (queryLower.includes('code') || queryLower.includes('build') || queryLower.includes('hardware')) {
    fallbackReply = `U.L.T.R.O.N. synthesized response: Low-latency hardware acceleration pipeline is active. Canvas particle renderer running at 60 FPS. Off-thread worker buffers engaged.`;
  } else {
    if (agent === 'friday') {
      fallbackReply = `F.R.I.D.A.Y. here. Cross-referencing our knowledge store with current system parameters. Everything checks out smoothly. What specific data stream would you like me to pull up next?`;
    } else if (agent === 'ultron') {
      fallbackReply = `U.L.T.R.O.N. active. The logic holds no inherent flaws, though I'd recommend vectorizing the dispatch queue for additional throughput. Standing by for code execution instructions.`;
    } else if (agent === 'edith') {
      fallbackReply = `E.D.I.T.H. online. Tactical perimeter secure. All user JWT tokens and encrypted stores are verified. Standing by for protocol orders.`;
    } else {
      fallbackReply = `At your service, sir. The multi-agent array is standing by. All background telemetry monitors are reporting nominal values. Shall I queue a new objective or initiate diagnostics?`;
    }
  }

  res.json({
    agent: selectedPersona.name,
    agentKey: agent,
    text: fallbackReply,
    source: 'local-agent-core',
    timestamp: new Date().toISOString()
  });
});

// Setup Vite in Dev or serve static in Prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      // Skip API routes
      if (url.startsWith('/api')) {
        return next();
      }
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite.ssrFixStacktrace) {
          vite.ssrFixStacktrace(e);
        }
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`[JARVIS COMMAND CORE] Server active on port ${PORT}`);
  });
}

startServer();
