"""
TALOS Multi-Provider LLM Manager
Pure Python, HTTP-based, no Rust dependencies
Supports: OpenAI -> Anthropic -> Groq fallback with circuit breaker
"""

import os
import json
import time
import requests
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum


class ProviderStatus(Enum):
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    DOWN = "down"


@dataclass
class CircuitBreaker:
    """Circuit breaker pattern for LLM providers"""
    failure_threshold: int = 3
    recovery_timeout: int = 30  # seconds
    half_open_max_calls: int = 2
    
    failures: int = field(default=0, repr=False)
    last_failure_time: float = field(default=0.0, repr=False)
    half_open_calls: int = field(default=0, repr=False)
    state: str = field(default="CLOSED", repr=False)  # CLOSED, OPEN, HALF_OPEN
    
    def can_execute(self) -> bool:
        if self.state == "CLOSED":
            return True
        if self.state == "OPEN":
            if time.time() - self.last_failure_time > self.recovery_timeout:
                self.state = "HALF_OPEN"
                self.half_open_calls = 0
                return True
            return False
        if self.state == "HALF_OPEN":
            if self.half_open_calls < self.half_open_max_calls:
                self.half_open_calls += 1
                return True
            return False
        return False
    
    def record_success(self):
        self.failures = 0
        self.state = "CLOSED"
    
    def record_failure(self):
        self.failures += 1
        self.last_failure_time = time.time()
        if self.failures >= self.failure_threshold:
            self.state = "OPEN"


@dataclass
class LLMResponse:
    content: str
    provider: str
    model: str
    usage: Dict[str, int]
    latency_ms: float
    tool_calls: Optional[List[Dict]] = None


class LLMManager:
    """
    Multi-provider LLM manager with circuit breaker and automatic fallback.
    Priority: OpenAI (GPT-4o) -> Anthropic (Claude 3.5) -> Groq (Llama 3.3)
    """
    
    PROVIDERS = {
        "openai": {
            "url": "https://api.openai.com/v1/chat/completions",
            "model": "gpt-4o",
            "priority": 1,
        },
        "anthropic": {
            "url": "https://api.anthropic.com/v1/messages",
            "model": "claude-3-5-sonnet-20241022",
            "priority": 2,
        },
        "groq": {
            "url": "https://api.groq.com/openai/v1/chat/completions",
            "model": "llama-3.3-70b-versatile",
            "priority": 3,
        }
    }
    
    def __init__(self):
        self.api_keys = {
            "openai": os.getenv("OPENAI_API_KEY"),
            "anthropic": os.getenv("ANTHROPIC_API_KEY"),
            "groq": os.getenv("GROQ_API_KEY"),
        }
        self.circuit_breakers = {
            name: CircuitBreaker() for name in self.PROVIDERS
        }
        self.timeout = 30  # seconds
    
    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.1,
        max_tokens: int = 4096,
        tools: Optional[List[Dict]] = None,
        require_json: bool = False
    ) -> LLMResponse:
        """
        Generate response with automatic fallback across providers.
        """
        # Sort providers by priority
        sorted_providers = sorted(
            self.PROVIDERS.items(),
            key=lambda x: x[1]["priority"]
        )
        
        last_error = None
        
        for provider_name, config in sorted_providers:
            cb = self.circuit_breakers[provider_name]
            
            if not cb.can_execute():
                print(f"[LLM] Circuit breaker OPEN for {provider_name}, skipping...")
                continue
            
            api_key = self.api_keys.get(provider_name)
            if not api_key:
                print(f"[LLM] No API key for {provider_name}, skipping...")
                continue
            
            try:
                start_time = time.time()
                
                if provider_name == "openai":
                    response = self._call_openai(
                        api_key, config["model"], system_prompt, user_prompt,
                        temperature, max_tokens, tools, require_json
                    )
                elif provider_name == "anthropic":
                    response = self._call_anthropic(
                        api_key, config["model"], system_prompt, user_prompt,
                        temperature, max_tokens, tools
                    )
                elif provider_name == "groq":
                    response = self._call_groq(
                        api_key, config["model"], system_prompt, user_prompt,
                        temperature, max_tokens, tools, require_json
                    )
                else:
                    continue
                
                latency = (time.time() - start_time) * 1000
                cb.record_success()
                
                print(f"[LLM] Success via {provider_name} ({latency:.0f}ms)")
                return LLMResponse(
                    content=response["content"],
                    provider=provider_name,
                    model=config["model"],
                    usage=response.get("usage", {}),
                    latency_ms=latency,
                    tool_calls=response.get("tool_calls")
                )
                
            except Exception as e:
                cb.record_failure()
                last_error = e
                print(f"[LLM] {provider_name} failed: {str(e)[:100]}")
                continue
        
        # All providers failed
        raise Exception(f"All LLM providers failed. Last error: {last_error}")
    
    def _call_openai(
        self, api_key: str, model: str, system: str, user: str,
        temperature: float, max_tokens: int, tools: Optional[List[Dict]], json_mode: bool
    ) -> Dict:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        
        resp = requests.post(
            self.PROVIDERS["openai"]["url"],
            headers=headers,
            json=payload,
            timeout=self.timeout
        )
        resp.raise_for_status()
        data = resp.json()
        
        choice = data["choices"][0]
        message = choice["message"]
        
        result = {
            "content": message.get("content", ""),
            "usage": data.get("usage", {}),
        }
        
        if message.get("tool_calls"):
            result["tool_calls"] = message["tool_calls"]
        
        return result
    
    def _call_anthropic(
        self, api_key: str, model: str, system: str, user: str,
        temperature: float, max_tokens: int, tools: Optional[List[Dict]]
    ) -> Dict:
        headers = {
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": model,
            "max_tokens": max_tokens,
            "system": system,
            "messages": [{"role": "user", "content": user}],
            "temperature": temperature
        }
        
        if tools:
            payload["tools"] = tools
        
        resp = requests.post(
            self.PROVIDERS["anthropic"]["url"],
            headers=headers,
            json=payload,
            timeout=self.timeout
        )
        resp.raise_for_status()
        data = resp.json()
        
        content = data["content"][0]
        
        result = {
            "content": content["text"] if content["type"] == "text" else "",
            "usage": data.get("usage", {}),
        }
        
        tool_uses = [c for c in data["content"] if c["type"] == "tool_use"]
        if tool_uses:
            result["tool_calls"] = tool_uses
        
        return result
    
    def _call_groq(
        self, api_key: str, model: str, system: str, user: str,
        temperature: float, max_tokens: int, tools: Optional[List[Dict]], json_mode: bool
    ) -> Dict:
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        messages = [
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
        
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"
        
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        
        resp = requests.post(
            self.PROVIDERS["groq"]["url"],
            headers=headers,
            json=payload,
            timeout=self.timeout
        )
        resp.raise_for_status()
        data = resp.json()
        
        choice = data["choices"][0]
        message = choice["message"]
        
        result = {
            "content": message.get("content", ""),
            "usage": data.get("usage", {}),
        }
        
        if message.get("tool_calls"):
            result["tool_calls"] = message["tool_calls"]
        
        return result
    
    def get_provider_status(self) -> Dict[str, Dict]:
        """Get health status of all providers"""
        return {
            name: {
                "state": cb.state,
                "failures": cb.failures,
                "can_execute": cb.can_execute()
            }
            for name, cb in self.circuit_breakers.items()
        }


# Singleton instance
_llm_manager = None

def get_llm_manager() -> LLMManager:
    global _llm_manager
    if _llm_manager is None:
        _llm_manager = LLMManager()
    return _llm_manager
