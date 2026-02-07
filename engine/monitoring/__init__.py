"""
Monitoring and state management modules for Monix.

This package contains modules responsible for monitoring orchestration and state:
- engine: Main monitoring engine that coordinates collection and analysis
- state: Thread-safe global state manager for real-time data
"""

from engine.monitoring.engine import start_monitor
from engine.monitoring.state import state, GlobalState

__all__ = ['start_monitor', 'state', 'GlobalState']
