from dataclasses import dataclass
from typing import Callable, Any, Dict, List, Optional

@dataclass
class ToolResult:
    data: Any
    is_success: bool = True
    error_message: Optional[str] = None

class PluginExecutionContext:
    def __init__(self, plugin_id: str, query_fn: Callable[[str], Dict[str, Any]], log_fn: Callable[[str], None]):
        self.plugin_id = plugin_id
        self._query_fn = query_fn
        self._log_fn = log_fn

    def query_table(self, sql: str) -> Dict[str, Any]:
        return self._query_fn(sql)

    def log(self, message: str) -> None:
        self._log_fn(message)
