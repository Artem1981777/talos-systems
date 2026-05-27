"""
TALOS Agent Memory System
Short-term: diskcache (SQLite-based, fast)
Long-term: JSON file with importance scoring
No external dependencies beyond diskcache
"""

import os
import json
import time
import hashlib
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime
from diskcache import Cache


@dataclass
class MemoryEntry:
    id: str
    timestamp: float
    type: str  # 'decision', 'observation', 'reflection', 'market_data'
    content: str
    metadata: Dict[str, Any]
    importance: float  # 0.0 - 1.0
    
    def to_dict(self) -> Dict:
        return asdict(self)
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'MemoryEntry':
        return cls(**data)


class AgentMemory:
    """
    Two-tier memory system:
    - Short-term: diskcache (last 24h, fast access)
    - Long-term: JSON file (important memories > 0.7 importance)
    """
    
    def __init__(self, cache_dir: str = ".talos_cache"):
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
        
        # Short-term memory (diskcache)
        self.short_term = Cache(os.path.join(cache_dir, "short_term"))
        
        # Long-term memory (JSON file)
        self.long_term_path = os.path.join(cache_dir, "long_term.json")
        self.long_term = self._load_long_term()
        
        # Memory consolidation settings
        self.consolidation_threshold = 50  # entries before consolidation
        self.importance_threshold = 0.7  # threshold for long-term storage
        self.ttl_short_term = 7 * 24 * 3600  # 7 days TTL
    
    def _load_long_term(self) -> List[Dict]:
        """Load long-term memories from JSON file"""
        if os.path.exists(self.long_term_path):
            try:
                with open(self.long_term_path, 'r') as f:
                    return json.load(f)
            except:
                return []
        return []
    
    def _save_long_term(self):
        """Save long-term memories to JSON file"""
        with open(self.long_term_path, 'w') as f:
            json.dump(self.long_term, f, indent=2)
    
    def store(self, entry: MemoryEntry):
        """
        Store memory entry in both short-term and long-term if important enough.
        """
        # Store in short-term cache
        self.short_term.set(
            f"memory:{entry.id}",
            entry.to_dict(),
            expire=self.ttl_short_term
        )
        
        # Store in long-term if important enough
        if entry.importance >= self.importance_threshold:
            self.long_term.append({
                **entry.to_dict(),
                "stored_at": time.time()
            })
            self._save_long_term()
            print(f"[MEMORY] Stored important memory to long-term: {entry.type} (importance: {entry.importance:.2f})")
    
    def get_recent(self, limit: int = 10, memory_type: Optional[str] = None) -> List[MemoryEntry]:
        """
        Get recent memories from short-term cache (last 24h by default).
        """
        entries = []
        cutoff = time.time() - 24 * 3600  # 24 hours
        
        # Iterate through all keys in cache
        for key in self.short_term.iterkeys():
            if not key.startswith("memory:"):
                continue
            
            data = self.short_term.get(key)
            if not data:
                continue
            
            if data["timestamp"] < cutoff:
                continue
            
            if memory_type and data["type"] != memory_type:
                continue
            
            entries.append(MemoryEntry.from_dict(data))
        
        # Sort by timestamp (newest first) and limit
        entries.sort(key=lambda x: x.timestamp, reverse=True)
        return entries[:limit]
    
    def query_similar(self, query: str, limit: int = 5) -> List[Dict]:
        """
        Simple keyword-based similarity search for long-term memories.
        In production, this would use vector embeddings.
        """
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        scored = []
        for mem in self.long_term:
            content_lower = mem["content"].lower()
            content_words = set(content_lower.split())
            
            # Simple Jaccard similarity
            intersection = query_words & content_words
            union = query_words | content_words
            similarity = len(intersection) / len(union) if union else 0
            
            if similarity > 0.1:  # Minimum threshold
                scored.append({
                    **mem,
                    "similarity": similarity
                })
        
        # Sort by similarity and return top results
        scored.sort(key=lambda x: x["similarity"], reverse=True)
        return scored[:limit]
    
    def get_context_for_decision(self, current_state: Dict) -> str:
        """
        Build context string for LLM decision-making from recent memories.
        """
        # Get recent decisions
        recent_decisions = self.get_recent(limit=5, memory_type="decision")
        
        # Get relevant historical insights
        query = f"vault health {current_state.get('health_factor', 1.0)} market volatility"
        relevant = self.query_similar(query, limit=3)
        
        context_parts = []
        
        if recent_decisions:
            context_parts.append("## Recent Decisions (last 24h):")
            for d in recent_decisions:
                ts = datetime.fromtimestamp(d.timestamp).strftime("%H:%M:%S")
                context_parts.append(f"- [{ts}] {d.type.upper()}: {d.content[:200]}...")
        
        if relevant:
            context_parts.append("\n## Relevant Historical Insights:")
            for r in relevant:
                context_parts.append(f"- (similarity: {r['similarity']:.2f}) {r['content'][:200]}...")
        
        return "\n".join(context_parts) if context_parts else "No prior context available."
    
    def consolidate(self):
        """
        Consolidate old short-term memories into long-term summaries.
        Triggered when short-term cache grows too large.
        """
        # Count entries in short-term
        count = sum(1 for _ in self.short_term.iterkeys() if _.startswith("memory:"))
        
        if count < self.consolidation_threshold:
            return
        
        print(f"[MEMORY] Consolidating {count} short-term memories...")
        
        # Get all old entries (older than 7 days)
        cutoff = time.time() - 7 * 24 * 3600
        old_entries = []
        
        for key in list(self.short_term.iterkeys()):
            if not key.startswith("memory:"):
                continue
            
            data = self.short_term.get(key)
            if data and data["timestamp"] < cutoff:
                old_entries.append(data)
                self.short_term.delete(key)
        
        if old_entries:
            # Create summary entry
            summary = MemoryEntry(
                id=f"summary_{int(time.time())}",
                timestamp=time.time(),
                type="reflection",
                content=f"Consolidated {len(old_entries)} historical decisions. "
                        f"Key patterns: {self._extract_patterns(old_entries)}",
                metadata={"consolidated": True, "count": len(old_entries)},
                importance=0.9
            )
            
            self.store(summary)
            print(f"[MEMORY] Consolidation complete. Created summary: {summary.id}")
    
    def _extract_patterns(self, entries: List[Dict]) -> str:
        """Extract simple patterns from old entries for summary"""
        actions = {}
        for e in entries:
            action = e.get("metadata", {}).get("action", "unknown")
            actions[action] = actions.get(action, 0) + 1
        
        if not actions:
            return "No clear patterns detected."
        
        most_common = max(actions, key=actions.get)
        return f"Most common action: {most_common} ({actions[most_common]} times)"
    
    def get_stats(self) -> Dict:
        """Get memory system statistics"""
        short_count = sum(1 for _ in self.short_term.iterkeys() if _.startswith("memory:"))
        
        return {
            "short_term_entries": short_count,
            "long_term_entries": len(self.long_term),
            "cache_dir": self.cache_dir,
            "consolidation_threshold": self.consolidation_threshold,
            "importance_threshold": self.importance_threshold
        }


# Singleton instance
_memory_instance = None

def get_memory() -> AgentMemory:
    global _memory_instance
    if _memory_instance is None:
        _memory_instance = AgentMemory()
    return _memory_instance
