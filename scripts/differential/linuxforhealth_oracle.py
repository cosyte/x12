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
                   declares, then returned as the segment stream the oracle
                   framed and handed that model, and only when the model kept
                   every segment of every transaction set it was handed.

Nothing here interprets an X12 rule and nothing here names a model: the models
are enumerated from the installed package, and the model a document goes
through is the one the oracle's own `X12ModelReader` selects from the
document's own GS-08 (falling back to ST-03). A document that model refuses is
reported as a refusal carrying the exception kind, and never as a reading,
because comparing a document the guide model rejected on a guide-agnostic split
would be comparing against a reader that did not read it as the guide.

A model can also accept a document and set one of its segments aside: a segment
arriving where the model has no place for it is dropped without an exception.
Comparing that segment would count, as the oracle's agreement, a position the
model never read. So after the model is built, the segments it kept are counted
with the oracle's own `count_segments` (the count its SE-01 check uses), and a
transaction set whose model kept fewer segments than the oracle framed for it,
ST through SE, is reported as a refusal of kind `SegmentsDiscarded`, as is a
document yielding fewer models than it carries transaction sets.
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


SEGMENTS_DISCARDED = "SegmentsDiscarded"


def _discarded(framed: list[int], kept: list[int]) -> str | None:
    """Why the models kept less than the oracle framed, or None when they kept it all.

    `framed` holds, per transaction set in document order, the number of
    segments ST through SE the oracle's segment reader framed; `kept` holds, per
    model yielded, the number of segments that model holds.
    """
    for index, (handed, held) in enumerate(zip(framed, kept), start=1):
        if held != handed:
            return (
                f"transaction set {index}: the model kept {held} of the {handed} segments, ST "
                f"through SE, the oracle framed for it"
            )
    if len(kept) != len(framed):
        return f"the document carries {len(framed)} transaction sets and the models built {len(kept)}"
    return None


def read(text: str) -> dict[str, Any]:
    from linuxforhealth.x12.io import X12ModelReader
    from linuxforhealth.x12.validators import count_segments

    consumed: list[list[str]] = []
    framed_counts: list[int] = []
    kept_counts: list[int] = []
    try:
        with X12ModelReader(text) as reader:
            segment_reader = reader._x12_segment_reader
            framed = segment_reader.segments

            def recording() -> Iterator[tuple[str, list[str]]]:
                # Record every segment exactly as the oracle framed it, on its
                # way into the transaction model, so the stream returned is the
                # one the model read and not a second, independent split. The
                # segments ST through SE are counted per transaction set, for
                # the check against what each model kept.
                open_count: int | None = None
                for name, fields in framed():
                    consumed.append(list(fields))
                    if name == "ST":
                        open_count = 0
                    if open_count is not None:
                        open_count += 1
                    if name == "SE" and open_count is not None:
                        framed_counts.append(open_count)
                        open_count = None
                    yield name, fields

            segment_reader.segments = recording
            delimiters = segment_reader.delimiters
            for model in reader.models():
                kept_counts.append(count_segments(model.dict()))
    except Exception as err:  # noqa: BLE001 - every refusal is reported with its kind
        return {"ok": False, "refusal": {"kind": type(err).__name__, "detail": str(err)}}
    discarded = _discarded(framed_counts, kept_counts)
    if discarded is not None:
        return {"ok": False, "refusal": {"kind": SEGMENTS_DISCARDED, "detail": discarded}}
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
