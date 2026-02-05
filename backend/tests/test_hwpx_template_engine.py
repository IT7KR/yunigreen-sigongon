"""HWPX 템플릿 엔진 테스트."""

from __future__ import annotations

import zipfile
from pathlib import Path

import pytest

from app.services.hwpx_template_engine import HwpxTemplateEngine


def _write_minimal_hwpx(template_path: Path, section_xml: str) -> None:
    template_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(template_path, "w") as zf:
        zf.writestr("mimetype", "application/hwp+zip", compress_type=zipfile.ZIP_STORED)
        zf.writestr("version.xml", '<?xml version="1.0" encoding="UTF-8"?><version/>')
        zf.writestr("Contents/content.hpf", "<hpf/>")
        zf.writestr("Contents/section0.xml", section_xml)


def _read_section_text(hwpx_path: Path) -> str:
    with zipfile.ZipFile(hwpx_path, "r") as zf:
        return zf.read("Contents/section0.xml").decode("utf-8")


def test_render_placeholder_and_inline_loop(tmp_path: Path) -> None:
    template = tmp_path / "template.hwpx"
    output = tmp_path / "output.hwpx"

    section_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">
  <hp:p><hp:run><hp:t>{{project_name}}</hp:t></hp:run></hp:p>
  <hp:p><hp:run><hp:t>{{#scope_items}}{{index}}) {{item}}{{separator}}{{/scope_items}}</hp:t></hp:run></hp:p>
</hs:sec>"""
    _write_minimal_hwpx(template, section_xml)

    engine = HwpxTemplateEngine(strict=True)
    stats = engine.render(
        template_path=template,
        output_path=output,
        context={
            "project_name": "테스트 공사",
            "scope_items": ["균열 보수", "우레탄도막방수"],
        },
    )

    rendered = _read_section_text(output)
    assert "테스트 공사" in rendered
    assert "1) 균열 보수 / 2) 우레탄도막방수" in rendered
    assert stats.inline_loops_rendered == 2
    assert stats.placeholders_replaced >= 3


def test_render_block_loop(tmp_path: Path) -> None:
    template = tmp_path / "template_block.hwpx"
    output = tmp_path / "output_block.hwpx"

    section_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">
  <hp:p><hp:run><hp:t>{{#workers}}</hp:t></hp:run></hp:p>
  <hp:p><hp:run><hp:t>근로자: {{name}}</hp:t></hp:run></hp:p>
  <hp:p><hp:run><hp:t>{{/workers}}</hp:t></hp:run></hp:p>
</hs:sec>"""
    _write_minimal_hwpx(template, section_xml)

    engine = HwpxTemplateEngine(strict=True)
    stats = engine.render(
        template_path=template,
        output_path=output,
        context={"workers": [{"name": "김철수"}, {"name": "이영희"}]},
    )

    rendered = _read_section_text(output)
    assert "{{#workers}}" not in rendered
    assert "{{/workers}}" not in rendered
    assert "근로자: 김철수" in rendered
    assert "근로자: 이영희" in rendered
    assert stats.block_loops_rendered == 2


def test_strict_mode_raises_on_missing_token(tmp_path: Path) -> None:
    template = tmp_path / "template_missing.hwpx"
    output = tmp_path / "output_missing.hwpx"

    section_xml = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<hs:sec xmlns:hp="http://www.hancom.co.kr/hwpml/2011/paragraph" xmlns:hs="http://www.hancom.co.kr/hwpml/2011/section">
  <hp:p><hp:run><hp:t>{{required_field}}</hp:t></hp:run></hp:p>
</hs:sec>"""
    _write_minimal_hwpx(template, section_xml)

    engine = HwpxTemplateEngine(strict=True)
    with pytest.raises(ValueError):
        engine.render(template_path=template, output_path=output, context={})
