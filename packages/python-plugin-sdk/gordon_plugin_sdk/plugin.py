import sys
import json
from typing import Dict, Any, Callable
from .types import PluginExecutionContext, ToolResult

def plugin_tool(name: str, description: str = ""):
    def decorator(fn: Callable):
        fn.__gordon_tool_name__ = name
        fn.__gordon_tool_desc__ = description
        return fn
    return decorator

class GordonPlugin:
    def __init__(self, plugin_id: str, name: str, version: str = "1.0.0"):
        self.plugin_id = plugin_id
        self.name = name
        self.version = version
        self._tools: Dict[str, Callable] = {}
        self._discover_tools()

    def _discover_tools(self):
        for attr_name in dir(self):
            attr = getattr(self, attr_name)
            if callable(attr) and hasattr(attr, "__gordon_tool_name__"):
                self._tools[attr.__gordon_tool_name__] = attr

    def execute_tool(self, tool_name: str, params: Dict[str, Any], context: PluginExecutionContext) -> Any:
        if tool_name not in self._tools:
            raise ValueError(f"Tool '{tool_name}' not found in plugin '{self.name}'")
        fn = self._tools[tool_name]
        return fn(params, context)

    def run_stdio_rpc(self):
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            req_id = None
            try:
                msg = json.loads(line)
                req_id = msg.get("id")
                method = msg.get("method")
                params = msg.get("params", {})

                context = PluginExecutionContext(
                    plugin_id=self.plugin_id,
                    query_fn=lambda sql: {"rows": [], "rowCount": 0},
                    log_fn=lambda m: sys.stderr.write(f"{m}\n")
                )

                result = self.execute_tool(method, params, context)
                resp = {"jsonrpc": "2.0", "id": req_id, "result": result}
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()
            except Exception as e:
                err_resp = {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32000, "message": str(e)}}
                sys.stdout.write(json.dumps(err_resp) + "\n")
                sys.stdout.flush()
