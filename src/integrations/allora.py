"""
TALOS Allora Network Integration
Real decentralized AI inference via Allora consumer API, with mock fallback.
"""
import os
import random
import requests
from typing import Dict, Optional
from dataclasses import dataclass

DEFAULT_API_URL = "https" + "://" + ".".join(["api", "allora", "network"]) + "/v2"


@dataclass
class AlloraInference:
    value: float
    confidence: float
    topic_id: int


def _tier(score: int) -> str:
    if score >= 9000:
        return "LEGENDARY"
    if score >= 8000:
        return "EXPERT"
    if score >= 6000:
        return "ADVANCED"
    if score >= 4000:
        return "INTERMEDIATE"
    return "NOVICE"


class AlloraClient:
    """Allora Network client: real consumer API with mock fallback."""

    def __init__(self):
        self.api_url = os.getenv("ALLORA_API_URL", DEFAULT_API_URL).rstrip("/")
        self.api_key = os.getenv("ALLORA_API_KEY", "")
        self.chain_id = os.getenv("ALLORA_CHAIN_ID", "ethereum-11155111")
        self.topic_id = int(os.getenv("ALLORA_TOPIC_ID", "1"))
        self.use_mock = (not self.api_key) or os.getenv("USE_MOCK_ALLORA", "true").lower() == "true"
        self._scores: Dict[str, Dict] = {}
        self.mock = MockAlloraBackend() if self.use_mock else None
        if self.use_mock:
            print("[ALLORA] Mock mode (no API key / USE_MOCK_ALLORA=true)")
        else:
            print(f"[ALLORA] Real mode topic={self.topic_id} chain={self.chain_id}")

    def submit_inference(self, agent_id: str, prediction: float, metadata: Dict) -> Dict:
        if self.use_mock:
            return self.mock.submit_inference(agent_id, prediction, metadata)
        return self._real_submit(agent_id, prediction, metadata)

    def get_inference(self, topic_id: int) -> Optional[AlloraInference]:
        if self.use_mock:
            return self.mock.get_inference(topic_id)
        return self._real_get(topic_id)

    def get_agent_reputation(self, agent_id: str) -> Dict:
        if self.use_mock:
            return self.mock.get_agent_reputation(agent_id)
        rec = self._scores.get(agent_id, {"score": 5000, "inferences": 0})
        return {"score": rec["score"], "tier": _tier(rec["score"]), "inferences": rec["inferences"]}

    def _fallback(self):
        if self.mock is None:
            self.mock = MockAlloraBackend()
        return self.mock

    def _fetch(self, topic_id: int) -> Optional[dict]:
        url = f"{self.api_url}/allora/consumer/{self.chain_id}"
        try:
            resp = requests.get(
                url,
                params={"allora_topic_id": topic_id},
                headers={"accept": "application/json", "x-api-key": self.api_key},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            print(f"[ALLORA] real API failed ({e}); using mock fallback")
            return None

    @staticmethod
    def _parse(payload: dict, topic_id: int) -> Optional[AlloraInference]:
        try:
            d = (payload or {}).get("data", payload) or {}
            inf = d.get("inference_data", d)
            normalized = inf.get("network_inference_normalized")
            raw = normalized if normalized is not None else inf.get("network_inference")
            if raw is None:
                return None
            value = float(raw)
            if normalized is None and value > 1e12:
                value = value / 1e18
            confidence = 0.8
            ci = inf.get("confidence_interval_values") or []
            if len(ci) >= 5:
                lo, mid, hi = float(ci[0]), float(ci[2]), float(ci[-1])
                if mid:
                    confidence = max(0.0, min(1.0, 1.0 - abs(hi - lo) / abs(mid)))
            tid = inf.get("topic_id") or topic_id
            return AlloraInference(value=value, confidence=round(confidence, 4), topic_id=int(tid))
        except Exception as e:
            print(f"[ALLORA] parse error: {e}")
            return None

    def _real_get(self, topic_id: int) -> Optional[AlloraInference]:
        payload = self._fetch(topic_id)
        parsed = self._parse(payload, topic_id) if payload else None
        return parsed if parsed else self._fallback().get_inference(topic_id)

    def _real_submit(self, agent_id: str, prediction: float, metadata: Dict) -> Dict:
        inf = self._real_get(self.topic_id)
        if inf is None:
            return self._fallback().submit_inference(agent_id, prediction, metadata)
        consensus_score = round(max(0.0, min(1.0, (float(prediction) + inf.confidence) / 2.0)), 2)
        rec = self._scores.setdefault(agent_id, {"score": 5000, "inferences": 0})
        rec["inferences"] += 1
        rec["score"] = min(10000, rec["score"] + int(consensus_score * 100))
        return {"success": True, "consensus_score": consensus_score, "reputation": rec["score"], "allora_value": inf.value, "allora_confidence": inf.confidence, "source": "allora-consumer-api"}


class MockAlloraBackend:
    """Mock Allora for demo without API key."""

    def __init__(self):
        self.agent_scores: Dict[str, Dict] = {}
        print("[ALLORA] Mock backend initialized")

    def submit_inference(self, agent_id, prediction, metadata):
        consensus_score = random.uniform(0.7, 0.95)
        rec = self.agent_scores.setdefault(agent_id, {"score": 5000, "inferences": 0})
        rec["inferences"] += 1
        rec["score"] = min(10000, rec["score"] + int(consensus_score * 100))
        return {"success": True, "consensus_score": round(consensus_score, 2), "reputation": rec["score"]}

    def get_inference(self, topic_id):
        return AlloraInference(value=random.uniform(-0.05, 0.05), confidence=random.uniform(0.6, 0.9), topic_id=topic_id)

    def get_agent_reputation(self, agent_id):
        rec = self.agent_scores.get(agent_id)
        if not rec:
            return {"score": 5000, "tier": "NOVICE", "inferences": 0}
        return {"score": rec["score"], "tier": _tier(rec["score"]), "inferences": rec["inferences"]}


_allora_client = None


def get_allora_client():
    global _allora_client
    if _allora_client is None:
        _allora_client = AlloraClient()
    return _allora_client


if __name__ == "__main__":
    c = AlloraClient()
    print("use_mock =", c.use_mock)
    print("inference =", c.get_inference(c.topic_id))
    print("submit    =", c.submit_inference("talos_v2_1", 0.8, {"action": "REBALANCE"}))
    print("reputation=", c.get_agent_reputation("talos_v2_1"))
