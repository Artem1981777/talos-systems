"""
TALOS Telegram Alert System
"""

import json
import urllib.request
import os
from datetime import datetime, timezone


class TelegramAlertBot:
    def __init__(self, bot_token=None, chat_id=None):
        self.bot_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.chat_id = chat_id or os.getenv("TELEGRAM_CHAT_ID", "")
        self.base_url = "https://api.telegram.org/bot" + self.bot_token
        self.enabled = bool(self.bot_token and self.chat_id)
        if not self.enabled:
            print("[TELEGRAM] Alerts disabled")

    def send_message(self, text):
        if not self.enabled:
            return {"ok": False}
        url = self.base_url + "/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True
        }
        try:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print("[TELEGRAM] Error: " + str(e))
            return {"ok": False}

    def send_health_alert(self, health_factor, vault):
        if health_factor >= 1.5:
            return {"ok": True, "skipped": "HF OK"}
        level = "EMERGENCY" if health_factor < 1.2 else "CRITICAL"
        emoji = "🔥" if level == "EMERGENCY" else "🚨"
        text = emoji + " <b>TALOS " + level + "</b>\n"
        text += "━" * 15 + "\n"
        text += "<b>LIQUIDATION RISK</b>\n\n"
        text += "Health Factor: <code>" + str(round(health_factor, 3)) + "</code>\n"
        text += "Threshold: <code>1.5</code>\n"
        text += "mETH: " + str(vault.get("meth_balance", 0)) + "\n"
        text += "USDC: " + str(vault.get("usdc_balance", 0)) + "\n"
        text += "\n━" * 15 + "\n"
        text += "⏱ " + datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        return self.send_message(text)

    def send_consensus_alert(self, consensus_result, vault):
        decision = consensus_result.get("final_decision", "HOLD")
        if decision == "HOLD":
            return {"ok": True, "skipped": "HOLD"}
        level = "EMERGENCY" if decision == "EMERGENCY_EXIT" else "CRITICAL"
        emoji = "🔥" if level == "EMERGENCY" else "🚨"
        text = emoji + " <b>TALOS CONSENSUS " + level + "</b>\n"
        text += "━" * 15 + "\n"
        text += "Decision: <b>" + decision + "</b>\n"
        text += "Confidence: " + str(round(consensus_result.get("consensus_confidence", 0), 2)) + "\n"
        text += "Votes: " + str(consensus_result.get("agent_votes", {})) + "\n"
        text += "\n━" * 15 + "\n"
        text += "⏱ " + datetime.now(timezone.utc).strftime("%H:%M:%S UTC")
        return self.send_message(text)


def check_and_alert(health_factor, vault, bot_token=None, chat_id=None, consensus_result=None):
    bot = TelegramAlertBot(bot_token, chat_id)
    results = []
    results.append(bot.send_health_alert(health_factor, vault))
    if consensus_result:
        results.append(bot.send_consensus_alert(consensus_result, vault))
    return results


if __name__ == "__main__":
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat = os.getenv("TELEGRAM_CHAT_ID", "")
    if not token:
        print("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID")
        exit(1)
    print("Testing Telegram alerts...")
    bot = TelegramAlertBot()
    bot.send_message("ℹ️ <b>TALOS Test</b>\nBot is working!")
    print("Test message sent. Check Telegram.")
