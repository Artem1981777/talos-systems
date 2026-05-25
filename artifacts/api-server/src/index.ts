import express from 'express';
import cors from 'cors';
import { runTalosAgent } from './lib/agentBridge';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Эндпоинт для ручного или триггерного запуска ИИ-агента
app.get('/api/agent/run', async (req, res) => {
  console.log(`[API] Received request to trigger TalosGraph Agent...`);
  
  try {
    const agentState = await runTalosAgent();
    
    // Возвращаем фронтенду полный отчет о симуляции и сформированные транзакции
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: agentState
    });
  } catch (error: any) {
    console.error(`[API ERROR] Agent execution failed:`, error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Talos API-Server successfully running on http://localhost:${PORT}`);
  console.log(`📡 Active endpoint: http://localhost:${PORT}/api/agent/run`);
});
