#!/usr/bin/env python
"""Read side of the differential harness for its second oracle, LinuxForHealth x12.

Two subcommands, each writing one JSON object to stdout:

  describe <icvn>  the installed distribution's name, version and declared
                   licence, the interpreter it runs under, every distribution
                   its runtime requirements pull in with the version actually
                   installed, and every transaction model the distribution
                   carries under its `v5010` package whose implementation guide
                   belongs to that interchange control version.
  read             one X12 document, read from stdin and put through the
                   transaction model for the implementation guide the document
                   declares, then returned as the segment stream that model
                   consumed.

Nothing here interprets an X12 rule and nothing here names a model: the models
are enumerated from the installed package, and the model a document goes
through is the one the oracle's own `X12ModelReader` selects from the
document's own GS-08 (falling back to ST-03). A document that model refuses is
reported as a refusal carrying the exception kind, and never as a reading,
because comparing a document the guide model rejected on a guide-agnostic split
would be comparing against a reader that did not read it as the guide.
"""

from __future__ import annotations

import importlib
import importlib.metadata
import inspect
import json
import platform
import pkgutil
import re
import sys
from typing import Any, Iterator

PACKAGE = "linuxforhealth-x12"
MODEL_PACKAGE = "linuxforhealth.x12.v5010"
MODEL_MODULE = re.compile(r"^x12_([0-9A-Z]{3})_([0-9]{6}X[0-9A-Z]+)$")
REQUIREMENT_NAME = re.compile(r"^\s*([A-Za-z0-9][A-Za-z0-9._-]*)")


def _normalise(name: str) -> str:
    """The distribution name as PEP 503 compares it."""
    return re.sub(r"[-_.]+", "-", name).lower()


def _licence() -> dict[str, str | None]:
    """The licence the installed distribution declares about itself."""
    metadata = importlib.metadata.metadata(PACKAGE)
    classifiers = [c for c in (metadata.get_all("Classifier") or []) if c.startswith("License ::")]
    return {
        "declared": metadata.get("License"),
        "expression": metadata.get("License-Expression"),
        "classifier": classifiers[0] if classifiers else None,
    }


def _companions() -> list[dict[str, str | None]]:
    """Every distribution the oracle's runtime requirements pull in, as installed.

    The walk starts at the oracle's own `Requires-Dist` and follows each
    requirement that is not behind an `extra` marker. A requirement behind any
    other marker is followed when its distribution is installed, so the list
    can only grow past what the resolver needed, never shrink below it. A
    requirement that names a distribution that is not installed is listed with
    no version, which the harness refuses.
    """
    seen: dict[str, str | None] = {}
    pending = [PACKAGE]
    while pending:
        current = pending.pop()
        try:
            requirements = importlib.metadata.requires(current) or []
        except importlib.metadata.PackageNotFoundError:
            continue
        for requirement in requirements:
            head, _, marker = requirement.partition(";")
            if "extra" in marker:
                continue
            match = REQUIREMENT_NAME.match(head)
            if match is None:
                continue
            name = _normalise(match.group(1))
            if name in seen:
                continue
            try:
                version: str | None = importlib.metadata.version(name)
            except importlib.metadata.PackageNotFoundError:
                if marker.strip():
                    continue
                version = None
            seen[name] = version
            if version is not None:
                pending.append(name)
    return [{"package": name, "version": seen[name]} for name in sorted(seen)]


def _bindings(icvn: str) -> list[dict[str, str | None]]:
    """The transaction models the installed distribution carries for one ICVN."""
    from linuxforhealth.x12 import parsing

    package = importlib.import_module(MODEL_PACKAGE)
    bindings = []
    for module in sorted(pkgutil.iter_modules(package.__path__), key=lambda m: m.name):
        match = MODEL_MODULE.match(module.name)
        if not module.ispkg or match is None:
            continue
        transaction_set, guide = match.group(1), match.group(2)
        if not guide.startswith(icvn):
            continue
        # The oracle's own resolution from (transaction set, guide) to the
        # transaction model class, so the model named here is the one `read`
        # puts a document through.
        model = parsing._load_transaction_model(transaction_set, guide)
        doc = inspect.getdoc(model) if model is not None else None
        bindings.append(
            {
                "icvn": icvn,
                "vriic": guide,
                "transactionSet": transaction_set,
                "fic": None,
                "tspc": None,
                "model": f"{MODEL_PACKAGE}.{module.name}",
                "modelId": model.__name__ if model is not None else None,
                "modelTitle": doc.splitlines()[0].strip() if doc else None,
            }
        )
    return bindings


def describe(icvn: str) -> dict[str, Any]:
    return {
        "package": PACKAGE,
        "version": importlib.metadata.version(PACKAGE),
        "licence": _licence(),
        "python": platform.python_version(),
        "companions": _companions(),
        "bindingSource": MODEL_PACKAGE,
        "interchangeControlVersion": icvn,
        "bindings": _bindings(icvn),
    }


def read(text: str) -> dict[str, Any]:
    from linuxforhealth.x12.io import X12ModelReader

    consumed: list[list[str]] = []
    try:
        with X12ModelReader(text) as reader:
            segment_reader = reader._x12_segment_reader
            framed = segment_reader.segments

            def recording() -> Iterator[tuple[str, list[str]]]:
                # Record every segment exactly as the oracle framed it, on its
                # way into the transaction model, so the stream returned is the
                # one the model read and not a second, independent split.
                for name, fields in framed():
                    consumed.append(list(fields))
                    yield name, fields

            segment_reader.segments = recording
            delimiters = segment_reader.delimiters
            for _model in reader.models():
                pass
    except Exception as err:  # noqa: BLE001 - every refusal is reported with its kind
        return {"ok": False, "refusal": {"kind": type(err).__name__, "detail": str(err)}}
    return {
        "ok": True,
        "delimiters": {
            "element": delimiters.element_separator,
            "component": delimiters.component_separator,
            "repetition": delimiters.repetition_separator,
            "segment": delimiters.segment_terminator,
        },
        "segments": [{"id": fields[0], "elements": fields[1:]} for fields in consumed],
    }


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[0] == "describe":
        json.dump(describe(argv[1]), sys.stdout)
        return 0
    if len(argv) >= 1 and argv[0] == "read":
        json.dump(read(sys.stdin.read()), sys.stdout)
        return 0
    sys.stderr.write(
        "usage: linuxforhealth_oracle.py describe <icvn> | linuxforhealth_oracle.py read < document\n"
    )
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
