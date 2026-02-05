"""HWPX 템플릿 렌더링 엔진.

지원 문법:
- Placeholder: {{project_name}}, {{item.name}}
- Inline loop: {{#scope_items}}{{index}}) {{item}}{{separator}}{{/scope_items}}
- Block loop(문단 단위): 문단 하나가 {{#workers}}, {{/workers}} 로만 구성된 경우
"""

from __future__ import annotations

import re
import tempfile
import zipfile
from collections import defaultdict
from copy import deepcopy
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping
import xml.etree.ElementTree as ET


HWP_NAMESPACES = {
    "ha": "http://www.hancom.co.kr/hwpml/2011/app",
    "hp": "http://www.hancom.co.kr/hwpml/2011/paragraph",
    "hp10": "http://www.hancom.co.kr/hwpml/2016/paragraph",
    "hs": "http://www.hancom.co.kr/hwpml/2011/section",
    "hc": "http://www.hancom.co.kr/hwpml/2011/core",
    "hh": "http://www.hancom.co.kr/hwpml/2011/head",
    "hhs": "http://www.hancom.co.kr/hwpml/2011/history",
    "hm": "http://www.hancom.co.kr/hwpml/2011/master-page",
    "hpf": "http://www.hancom.co.kr/schema/2011/hpf",
    "dc": "http://purl.org/dc/elements/1.1/",
    "opf": "http://www.idpf.org/2007/opf",
    "ooxmlchart": "http://www.hancom.co.kr/hwpml/2016/ooxmlchart",
    "hwpunitchar": "http://www.hancom.co.kr/hwpml/2016/HwpUnitChar",
    "epub": "http://www.idpf.org/2007/ops",
    "config": "urn:oasis:names:tc:opendocument:xmlns:config:1.0",
}

for prefix, uri in HWP_NAMESPACES.items():
    ET.register_namespace(prefix, uri)

HP_NS = HWP_NAMESPACES["hp"]
P_TAG = f"{{{HP_NS}}}p"
T_TAG = f"{{{HP_NS}}}t"

TOKEN_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}")
INLINE_LOOP_RE = re.compile(
    r"\{\{\#([a-zA-Z0-9_.-]+)\}\}(.*?)\{\{/\1\}\}",
    flags=re.DOTALL,
)
BLOCK_START_RE = re.compile(r"^\s*\{\{\#([a-zA-Z0-9_.-]+)\}\}\s*$")
BLOCK_END_RE = re.compile(r"^\s*\{\{\/([a-zA-Z0-9_.-]+)\}\}\s*$")

_MISSING = object()


@dataclass
class HwpxRenderStats:
    sections_processed: int = 0
    placeholders_replaced: int = 0
    inline_loops_rendered: int = 0
    block_loops_rendered: int = 0
    missing_placeholders: dict[str, int] = field(
        default_factory=lambda: defaultdict(int)
    )
    missing_loops: dict[str, int] = field(
        default_factory=lambda: defaultdict(int)
    )

    def has_missing(self) -> bool:
        return bool(self.missing_placeholders or self.missing_loops)


class HwpxTemplateEngine:
    """토큰 기반 HWPX 템플릿 렌더러."""

    def __init__(self, strict: bool = True):
        self.strict = strict

    def render(
        self,
        template_path: str | Path,
        output_path: str | Path,
        context: Mapping[str, Any],
    ) -> HwpxRenderStats:
        template = Path(template_path)
        output = Path(output_path)

        if not template.exists():
            raise FileNotFoundError(f"HWPX 템플릿이 없습니다: {template}")

        stats = HwpxRenderStats()

        with tempfile.TemporaryDirectory() as temp_dir:
            workdir = Path(temp_dir)

            with zipfile.ZipFile(template, "r") as zip_in:
                zip_in.extractall(workdir)

            section_files = sorted((workdir / "Contents").glob("section*.xml"))
            if not section_files:
                raise ValueError("HWPX 내 Contents/section*.xml 파일을 찾지 못했습니다.")

            for section_file in section_files:
                self._render_section_file(section_file, context, stats)
                stats.sections_processed += 1

            output.parent.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(output, "w") as zip_out:
                for file_path in sorted(workdir.rglob("*")):
                    if file_path.is_dir():
                        continue
                    arcname = file_path.relative_to(workdir).as_posix()
                    compress_type = (
                        zipfile.ZIP_STORED
                        if arcname == "mimetype"
                        else zipfile.ZIP_DEFLATED
                    )
                    zip_out.write(file_path, arcname, compress_type=compress_type)

        if self.strict and stats.has_missing():
            missing_tokens = ", ".join(sorted(stats.missing_placeholders.keys()))
            missing_loops = ", ".join(sorted(stats.missing_loops.keys()))
            raise ValueError(
                "템플릿 렌더링 중 미해결 토큰/루프가 있습니다. "
                f"missing_placeholders=[{missing_tokens}] "
                f"missing_loops=[{missing_loops}]"
            )

        return stats

    def _render_section_file(
        self,
        section_path: Path,
        context: Mapping[str, Any],
        stats: HwpxRenderStats,
    ) -> None:
        tree = ET.parse(section_path)
        root = tree.getroot()

        self._expand_block_loops(root, context, stats)
        self._render_placeholders_in_element(root, context, stats)

        tree.write(section_path, encoding="utf-8", xml_declaration=True)

    def _expand_block_loops(
        self,
        element: ET.Element,
        context: Mapping[str, Any],
        stats: HwpxRenderStats,
    ) -> None:
        while self._expand_block_loops_once(element, context, stats):
            pass

        for child in list(element):
            self._expand_block_loops(child, context, stats)

    def _expand_block_loops_once(
        self,
        parent: ET.Element,
        context: Mapping[str, Any],
        stats: HwpxRenderStats,
    ) -> bool:
        children = list(parent)
        i = 0
        while i < len(children):
            start_el = children[i]
            if start_el.tag != P_TAG:
                i += 1
                continue

            loop_name = self._extract_block_start_name(start_el)
            if loop_name is None:
                i += 1
                continue

            end_index = self._find_block_end_index(children, i + 1, loop_name)
            if end_index is None:
                raise ValueError(
                    f"루프 시작({loop_name})에 대응하는 종료 태그를 찾지 못했습니다."
                )

            loop_items = self._resolve_value(loop_name, context)
            if loop_items is _MISSING:
                stats.missing_loops[loop_name] += 1
                loop_items = []
            if loop_items is None:
                loop_items = []
            if not isinstance(loop_items, list):
                raise TypeError(
                    f"루프 '{loop_name}'는 list여야 합니다. 현재 타입: {type(loop_items)}"
                )

            block_nodes = children[i + 1 : end_index]
            remove_nodes = children[i : end_index + 1]
            for node in remove_nodes:
                parent.remove(node)

            insert_pos = i
            for idx, item in enumerate(loop_items):
                loop_context = self._build_loop_context(
                    base_context=context,
                    loop_name=loop_name,
                    item=item,
                    index=idx,
                    total=len(loop_items),
                )

                for block in block_nodes:
                    clone = deepcopy(block)
                    self._expand_block_loops(clone, loop_context, stats)
                    self._render_placeholders_in_element(clone, loop_context, stats)
                    parent.insert(insert_pos, clone)
                    insert_pos += 1

                stats.block_loops_rendered += 1

            return True

        return False

    def _render_placeholders_in_element(
        self,
        element: ET.Element,
        context: Mapping[str, Any],
        stats: HwpxRenderStats,
    ) -> None:
        for text_node in element.iter(T_TAG):
            if text_node.text:
                text_node.text = self._render_text(text_node.text, context, stats)
            for child in text_node.iter():
                if child is text_node:
                    continue
                if child.text:
                    child.text = self._render_text(child.text, context, stats)
                if child.tail:
                    child.tail = self._render_text(child.tail, context, stats)

    def _render_text(
        self,
        text: str,
        context: Mapping[str, Any],
        stats: HwpxRenderStats,
    ) -> str:
        def inline_loop_replacer(match: re.Match[str]) -> str:
            loop_name = match.group(1)
            body = match.group(2)

            loop_items = self._resolve_value(loop_name, context)
            if loop_items is _MISSING:
                stats.missing_loops[loop_name] += 1
                return ""
            if loop_items is None:
                return ""
            if not isinstance(loop_items, list):
                raise TypeError(
                    f"인라인 루프 '{loop_name}'는 list여야 합니다. 현재 타입: {type(loop_items)}"
                )

            rendered_parts: list[str] = []
            for idx, item in enumerate(loop_items):
                loop_context = self._build_loop_context(
                    base_context=context,
                    loop_name=loop_name,
                    item=item,
                    index=idx,
                    total=len(loop_items),
                )
                rendered = self._render_text(body, loop_context, stats)
                rendered_parts.append(rendered)
                stats.inline_loops_rendered += 1

            return "".join(rendered_parts)

        text = INLINE_LOOP_RE.sub(inline_loop_replacer, text)

        def token_replacer(match: re.Match[str]) -> str:
            token_name = match.group(1)
            value = self._resolve_value(token_name, context)
            if value is _MISSING:
                stats.missing_placeholders[token_name] += 1
                return ""
            stats.placeholders_replaced += 1
            return self._stringify(value)

        return TOKEN_RE.sub(token_replacer, text)

    def _extract_block_start_name(self, paragraph: ET.Element) -> str | None:
        text = self._extract_paragraph_text(paragraph)
        matched = BLOCK_START_RE.fullmatch(text)
        if not matched:
            return None
        return matched.group(1)

    def _extract_block_end_name(self, paragraph: ET.Element) -> str | None:
        text = self._extract_paragraph_text(paragraph)
        matched = BLOCK_END_RE.fullmatch(text)
        if not matched:
            return None
        return matched.group(1)

    def _find_block_end_index(
        self,
        nodes: list[ET.Element],
        start_index: int,
        loop_name: str,
    ) -> int | None:
        depth = 1
        for idx in range(start_index, len(nodes)):
            node = nodes[idx]
            if node.tag != P_TAG:
                continue
            if self._extract_block_start_name(node) == loop_name:
                depth += 1
                continue
            if self._extract_block_end_name(node) == loop_name:
                depth -= 1
                if depth == 0:
                    return idx
        return None

    def _extract_paragraph_text(self, paragraph: ET.Element) -> str:
        return "".join(paragraph.itertext())

    def _resolve_value(self, token_name: str, context: Mapping[str, Any]) -> Any:
        current: Any = context
        for part in token_name.split("."):
            if isinstance(current, Mapping):
                if part not in current:
                    return _MISSING
                current = current[part]
                continue

            if hasattr(current, part):
                current = getattr(current, part)
                continue

            return _MISSING

        return current

    def _build_loop_context(
        self,
        base_context: Mapping[str, Any],
        loop_name: str,
        item: Any,
        index: int,
        total: int,
    ) -> dict[str, Any]:
        loop_context = dict(base_context)
        loop_context["item"] = item
        loop_context["index"] = index + 1
        loop_context["is_first"] = index == 0
        loop_context["is_last"] = index == total - 1
        loop_context["separator"] = "" if index == total - 1 else " / "

        singular = (
            loop_name[:-1] if loop_name.endswith("s") and len(loop_name) > 1 else f"{loop_name}_item"
        )
        loop_context[singular] = item

        if isinstance(item, Mapping):
            for key, value in item.items():
                if key not in loop_context:
                    loop_context[key] = value

        return loop_context

    def _stringify(self, value: Any) -> str:
        if value is None:
            return ""
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, (list, tuple)):
            return ", ".join(str(v) for v in value)
        return str(value)
