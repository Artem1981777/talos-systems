"""
TALOS Telegram Alert System v2.2
"""

import os
import subprocess
import json
from datetime import datetime, timezone


class TelegramAlertBot:
    def __init__(self, bot_token=None, chat_id=None):
        self.bot_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.chat_id = chat_id or os.getenv("TELEGRAM_CHAT_ID", "")
        self.enabled = bool(self.bot_token and self.chat_id 
                           and "твой" not in self.bot_token
                           and "твой" not in self.chat_id)
        if not self.enabled:
            print("[TELEGRAM] Alerts disabled")

    def _curl_send(self, text):
        if not self.enabled:
            return {"ok": False}
        url = "https://api.telegram.org/bot" + self.bot_token + "/sendMessage"
        payload = {"chat_id": self.chat_id, "text": text, "disable_web_page_preview": True}
        try:
            cmd = ["curl", "-s", "-X", "POST", url, "-H", "Content-Type: application/json", "-d", json.dumps(payload)]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            response = json.loads(result.stdout)
            if response.get("ok"):
                print("[TELEGRAM] Message sent")
                return {"ok": True}
            else:
                print("[TELEGRAM] API error: " + str(response.get("description", "unknown")))
                return {"ok": False}
        except Exception as e:
            print("[TELEGRAM] Error: " + str(e))
            return {"ok": False}

    def send_message(self, text):
        return self._curl_send(text)

    def send_cycle_report(self, cycle_num, health_factor, decision, consensus=None, risk_level="UNKNOWN"):
        emoji = "OK" if decision == "HOLD" else "WARN" if decision == "REBALANCE" else "ALERT"
        text = "[" + emoji + "] TALOS Cycle #" + str(cycle_num) + "\n"
        text += "=" * 25 + "\n"
        text += "Health Factor: " + str(round(health_factor, 3)) + "\n"
        text += "Decision: " + decision + "\n"
        text += "Risk Level: " + risk_level + "\n"
        if consensus:
            text += "Consensus: " + str(round(consensus.get("consensus_confidence", 0) * 100, 1)) + "%\n"
            text += "Votes: " + str(consensus.get("agent_votes", {})) + "\n"
        text += "=" * 25 + "\n"
        text += "Time: " + datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        return self.send_message(text)

    def send_health_alert(self, health_factor, vault):
        if health_factor >= 1.5:
            return {"ok": True, "skipped": "HF OK"}
        level = "EMRG" if health_factor < 1.2 else "CRIT"
        text = "[" + level + "] TALOS ALERT\n"
        text += "=" * 20 + "\n"
        text += "LIQUIDATION RISK!\n\n"
        text += "HF: " + str(round(health_factor, 3)) + " (threshold: 1.5)\n"
        text += "mETH: " + str(vault.get("meth_balance", 0)) + "\n"
        text += "USDC: " + str(vault.get("usdc_balance", 0)) + "\n"
        text += "=" * 20 + "\n"
        text += "Time: " + datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        return self.send_message(text)

    def send_consensus_alert(self, consensus_result, vault):
        decision = consensus_result.get("final_decision", "HOLD")
        if decision == "HOLD":
            return {"ok": True, "skipped": "HOLD"}
        level = "EMRG" if decision == "EMERGENCY_EXIT" else "CRIT"
        text = "[" + level + "] TALOS CONSENSUS\n"
        text += "=" * 20 + "\n"
        text += "Decision: " + decision + "\n"
        text += "Confidence: " + str(round(consensus_result.get("consensus_confidence", 0), 2)) + "\n"
        text += "Votes: " + str(consensus_result.get("agent_votes", {})) + "\n"
        text += "=" * 20 + "\n"
        text += "Time: " + datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        return self.send_message(text)


def check_and_alert(health_factor, vault, bot_token=None, chat_id=None, consensus_result=None, cycle_num=0):
    bot = TelegramAlertBot(bot_token, chat_id)
    results = []
    if cycle_num > 0:
        decision = consensus_result.get("final_decision", "HOLD") if consensus_result else "UNKNOWN"
        risk_level = consensus_result.get("risk_level", "UNKNOWN") if consensus_result else "UNKNOWN"
        results.append(bot.send_cycle_report(cycle_num, health_factor, decision, consensus_result, risk_level))
    results.append(bot.send_health_alert(health_factor, vault))
    if consensus_result:
        results.append(bot.send_consensus_alert(consensus_result, vault))
    return results
