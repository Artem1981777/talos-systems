"""
TALOS Allora Network Integration
Decentralized AI inference verification
Mock mode for demo without real API key
"""

import os
import random
import time
import requests
from typing import Dict, Optional
from dataclasses import dataclass


@dataclass
class AlloraInference:
    value: float
    confidence: float
    topic_id: int


class AlloraClient:
    """
    Allora Network client with mock fallback
    """
    
    def __init__(self):
        self.api_url = os.getenv("ALLORA_API_URL", "https://api.upshot.xyz/v2")
        self.api_key = os.getenv("ALLORA_API_KEY", "")
        self.topic_id = int(os.getenv("ALLORA_TOPIC_ID", "1"))
        self.use_mock = not self.api_key or os.getenv("USE_MOCK_ALLORA", "true").lower() == "true"
        
        if self.use_mock:
            print("[ALLORA] Mock mode enabled (no API key)")
            self.mock = MockAlloraBackend()
        else:
            print(f"[ALLORA] Real API mode: {self.api_url}")
    
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
        return self._real_reputation(agent_id)
    
    def _real_submit(self, agent_id, prediction, metadata):
        try:
            resp = requests.post(
                f"{self.api_url}/allora/inference",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "topic_id": self.topic_id,
                    "agent_id": agent_id,
                    "prediction": prediction,
                    "metadata": metadata
                },
                timeout=10
            )
            return resp.json()
        except Exception as e:
            print(f"[ALLORA] Real API failed: {e}")
            return {"error": str(e)}
    
    def _real_get(self, topic_id):
        try:
            resp = requests.get(
                f"{self.api_url}/allora/topics/{topic_id}/inference",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10
            )
            data = resp.json()
            return AlloraInference(
                value=data.get("value", 0),
                confidence=data.get("confidence", 0),
                topic_id=topic_id
            )
        except Exception as e:
            print(f"[ALLORA] Real API failed: {e}")
            return None
    
    def _real_reputation(self, agent_id):
        try:
            resp = requests.get(
                f"{self.api_url}/allora/agents/{agent_id}/reputation",
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=10
            )
            return resp.json()
        except Exception as e:
            print(f"[ALLORA] Real API failed: {e}")
            return {"score": 0}


class MockAlloraBackend:
    """Mock Allora for demo without API key"""
    
    def __init__(self):
        self.inferences = []
        self.agent_scores = {}
        print("[ALLORA] Mock backend initialized")
    
    def submit_inference(self, agent_id, prediction, metadata):
        consensus_score = random.uniform(0.7, 0.95)
        
        if agent_id not in self.agent_scores:
            self.agent_scores[agent_id] = {"score": 5000, "inferences": 0}
        
        self.agent_scores[agent_id]["inferences"] += 1
        self.agent_scores[agent_id]["score"] = min(
            10000,
            self.agent_scores[agent_id]["score"] + int(consensus_score * 100)
        )
        
        return {
            "success": True,
            "consensus_score": round(consensus_score, 2),
            "reputation": self.agent_scores[agent_id]["score"]
        }
    
    def get_inference(self, topic_id):
        return AlloraInference(
            value=random.uniform(-0.05, 0.05),
            confidence=random.uniform(0.6, 0.9),
            topic_id=topic_id
        )
    
    def get_agent_reputation(self, agent_id):
        if agent_id not in self.agent_scores:
            return {"score": 5000, "tier": "NOVICE", "inferences": 0}
        
        score = self.agent_scores[agent_id]["score"]
        inferences = self.agent_scores[agent_id]["inferences"]
        
        tier = "LEGENDARY" if score >= 9000 else "EXPERT" if score >= 8000 else "ADVANCED" if score >= 6000 else "INTERMEDIATE" if score >= 4000 else "NOVICE"
        
        return {"score": score, "tier": tier, "inferences": inferences}


_allora_client = None

def get_allora_client():
    global _allora_client
    if _allora_client is None:
        _allora_client = AlloraClient()
    return _allora_client
