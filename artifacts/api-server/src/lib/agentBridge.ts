import { exec } from 'child_process';
import path from 'path';

export interface AgentPayload {
  target: string;
  action: string;
  amount_wei: string;
  amount_out_min: string;
  max_slippage_allowed_pct: number;
  suggested_gas_price: number;
}

export interface AgentState {
  market_signals: {
    mETH_price_eth: number;
    vault_balance: number;
    gas_price_wei: number;
    price_trend_delta: number; // Новое поле памяти
  };
  risk_scores: {
    depeg_risk: number;
    high_gas_risk: number;
    consecutive_high_gas_ticks: number; // Новое поле памяти
  };
  next_action: string;
  execution_payload: AgentPayload[];
  errors: string[];
}

export function runTalosAgent(): Promise<AgentState> {
  return new Promise((resolve, reject) => {
    const rootDir = path.resolve(__dirname, '../../../../');
    
    exec('python src/main.py', { cwd: rootDir }, (error, stdout, stderr) => {
      if (error) {
        return reject(new Error(`Failed to execute agent: ${error.message}`));
      }
      
      const lines = stdout.split('\n');
      const jsonLine = lines.find(line => line.startsWith('__FINAL_JSON_OUTPUT__:'));

      if (!jsonLine) {
        return reject(new Error('Agent executed but returned no processable JSON output.'));
      }

      try {
        const rawJson = jsonLine.replace('__FINAL_JSON_OUTPUT__:', '').trim();
        const state = JSON.parse(rawJson) as AgentState;
        resolve(state);
      } catch (parseError) {
        reject(new Error(`Failed to parse agent response: ${parseError}`));
      }
    });
  });
}
