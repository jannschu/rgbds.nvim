import re
from pathlib import Path
from urllib.request import urlopen

URL = "https://github.com/gbdev/hardware.inc/raw/refs/heads/master/hardware.inc"
URL_COMPAT = "https://raw.githubusercontent.com/gbdev/hardware.inc/refs/heads/master/hardware_compat.inc"

VAR = re.compile(r"^\s*def\s+([a-z\d_]+)\s", re.MULTILINE | re.IGNORECASE)
VALID = re.compile(r"^r?[A-Z_][A-Za-z\d_]*$")
LINE_LIMIT = 255


def download_hardware_inc(url: str) -> str:
    with urlopen(url) as response:
        return response.read().decode("utf-8")


def parse_vars(hardware_inc: str) -> list[str]:
    vars = [v for v in VAR.findall(hardware_inc) if VALID.match(v)]
    vars.sort()
    return vars


def format(vars: list[str], indent: str | None = None, max_len: int = LINE_LIMIT) -> str:
    out = ""
    lines = []
    prefix = "" if indent is None else indent
    for var in vars:
        line = f'"{var}"'
        if sum(len(l) for l in lines) + len(lines) + len(line) + len(prefix) > LINE_LIMIT:
            out += prefix + " ".join(lines) + "\n"
            lines = [line]
        else:
            lines.append(line)
    if lines:
        out += prefix + " ".join(lines) + "\n"
    return out


RE_BOUNDARY = re.compile(
    r"^(\s*)(; WARN: script.generated content[^\n]*\n)(?:.|\n)*?(; END WARN\n)",
    re.MULTILINE | re.IGNORECASE,
)


def inject_vars(hardware_inc: str, vars: list[str]) -> str:
    def repl(match: re.Match) -> str:
        indent, start_tag, end_tag = match.groups()
        formatted = format(vars, indent=indent)
        return f"{indent}{start_tag}{formatted}{indent}{end_tag}"

    return RE_BOUNDARY.sub(repl, hardware_inc)


if __name__ == "__main__":
    path = Path(__file__).parent.parent / "tree-sitter-rgbasm" / "identifier" / "queries" / "highlights.scm"
    assert path.exists(), "path does not exist"

    hardware_inc = download_hardware_inc(URL)
    vars = parse_vars(hardware_inc)

    compat = download_hardware_inc(URL_COMPAT)
    vars_compat = parse_vars(compat)

    vars = list(sorted(set(vars) | set(vars_compat)))

    print(f"Found {len(vars)} variables.")
    content = inject_vars(path.read_text(encoding="utf-8"), vars)
    assert all(v in content for v in vars), "not all vars were injected"
    path.write_text(content, encoding="utf-8")
