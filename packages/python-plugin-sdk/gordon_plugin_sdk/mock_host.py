from typing import Dict, Any, List
from .plugin import GordonPlugin
from .types import PluginExecutionContext

class MockPluginHost:
    def __init__(self, mock_tables: Dict[str, List[Dict[str, Any]]] = None):
        self.mock_tables = mock_tables or {}
        self.logs: List[str] = []

    def create_context(self, plugin_id: str) -> PluginExecutionContext:
        def query(sql: str) -> Dict[str, Any]:
            self.logs.append(f"[QUERY]: {sql}")
            for table_name, rows in self.mock_tables.items():
                if table_name.lower() in sql.lower():
                    return {"rows": rows, "rowCount": len(rows)}
            return {"rows": [], "rowCount": 0}

        def log(msg: str):
            self.logs.append(f"[LOG]: {msg}")

        return PluginExecutionContext(plugin_id, query, log)

    def run_tool(self, plugin: GordonPlugin, tool_name: str, params: Dict[str, Any]) -> Any:
        ctx = self.create_context(plugin.plugin_id)
        return plugin.execute_tool(tool_name, params, ctx)
