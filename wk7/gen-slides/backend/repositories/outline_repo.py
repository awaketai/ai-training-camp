import asyncio
from pathlib import Path
from typing import Optional
import yaml


class OutlineRepository:
    """Repository for managing outline.yml files."""

    def __init__(self, base_dir: str = "./slides"):
        self.base_dir = Path(base_dir)
        self._locks: dict[str, asyncio.Lock] = {}

    def _get_lock(self, sid: str) -> asyncio.Lock:
        """Get or create a lock for the given project."""
        if sid not in self._locks:
            self._locks[sid] = asyncio.Lock()
        return self._locks[sid]

    def _get_outline_path(self, sid: str) -> Path:
        """Get the path to the outline.yml file for a project."""
        return self.base_dir / sid / "outline.yml"

    async def get_outline(self, sid: str) -> dict:
        """Read the outline.yml file for a project."""
        outline_path = self._get_outline_path(sid)

        if not outline_path.exists():
            raise FileNotFoundError(f"Project {sid} not found")

        async with self._get_lock(sid):
            content = await asyncio.to_thread(outline_path.read_text, encoding="utf-8")
            data = await asyncio.to_thread(yaml.safe_load, content)
            return data

    async def save_outline(self, sid: str, data: dict) -> None:
        """Write the outline.yml file for a project."""
        outline_path = self._get_outline_path(sid)

        async with self._get_lock(sid):
            content = await asyncio.to_thread(yaml.dump, data, allow_unicode=True, sort_keys=False)
            await asyncio.to_thread(outline_path.write_text, content, encoding="utf-8")

    async def exists(self, sid: str) -> bool:
        """Check if a project exists."""
        outline_path = self._get_outline_path(sid)
        return await asyncio.to_thread(outline_path.exists)

    async def create_project(self, sid: str) -> None:
        """Create a new project with an empty outline."""
        project_dir = self.base_dir / sid
        await asyncio.to_thread(project_dir.mkdir, parents=True, exist_ok=True)

        outline_data = {
            "style_image": None,
            "slides": []
        }
        await self.save_outline(sid, outline_data)
