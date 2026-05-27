import express from 'express';
import cors from 'cors';
import { runTalosAgent, AgentState } from './lib/agentBridge';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Глобальный кэш для хранения последнего состояния ИИ-агента
let latestAgentState: AgentState | null = null;
let isRunning = false;

/**
 * Функция фонового мониторинга чейна
 */
async function tickAgent() {
  if (isRunning) return; // Защита от наложения задач, если RPC лагает
  isRunning = true;
  
  console.log(`\n⏰ [CRON] [${new Date().toLocaleTimeString()}] Triggering autonomous agent execution...`);
  try {
    const state = await runTalosAgent();
    latestAgentState = state;
    console.log(`✅ [CRON] Agent tick complete. Strategy: ${state.next_action}. Gas: ${state.market_signals.gas_price_wei / 10**9} Gwei`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ [CRON ERROR] Failed to tick agent:`, message);
  } finally {
    isRunning = false;
  }
}

// Запускаем автоматический фоновый опрос каждые 30 секунд
const TICK_INTERVAL = 30 * 1000;
setInterval(tickAgent, TICK_INTERVAL);

// Запускаем первый прогон сразу при старте сервера, чтобы кэш не был пустым
setTimeout(tickAgent, 1000);

/**
 * Эндпоинт для фронтенда — теперь отдает данные МГНОВЕННО из памяти
 */
app.get('/api/agent/run', (req, res) => {
  if (!latestAgentState) {
    return res.status(503).json({
      success: false,
      message: "Agent is initializing and gathering first metrics. Please retry in a few seconds."
    });
  }

  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    data: latestAgentState
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀 Talos Autonomous API-Server running on http://localhost:${PORT}`);
  console.log(`📡 Background worker active. Ticking every 30 seconds.`);
});
