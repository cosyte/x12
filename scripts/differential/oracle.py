#!/usr/bin/env python
"""Read side of the differential harness: drives pyx12, the external oracle.

Two subcommands, each writing one JSON object to stdout:

  describe        the oracle's package name, version and declared licence, plus
                  every binding its own map index holds for one interchange
                  control version number.
  read            one X12 document, read from stdin and decoded by the oracle
                  into a segment stream.

Nothing here interprets an X12 rule. The oracle detects its own delimiters,
frames its own segments and splits its own elements; this file only serialises
what it produced so the Node half can hold the two readings side by side. A
document the oracle refuses is reported as a refusal rather than as an empty
read, because an empty read is indistinguishable from agreement.
"""

from __future__ import annotations

import importlib.metadata
import io
import json
import os
import sys
import xml.etree.ElementTree as ElementTree
from typing import Any

import pyx12
import pyx12.errors
import pyx12.map_index
import pyx12.x12file

PACKAGE = "pyx12"


def _licence() -> dict[str, str | None]:
    """The licence the installed distribution declares about itself."""
    metadata = importlib.metadata.metadata(PACKAGE)
    classifiers = [c for c in (metadata.get_all("Classifier") or []) if c.startswith("License ::")]
    return {
        "declared": metadata.get("License"),
        "expression": metadata.get("License-Expression"),
        "classifier": classifiers[0] if classifiers else None,
    }


def _map_declaration(map_dir: str, map_file: str) -> dict[str, str | None]:
    """The identifier and title the oracle's own map file declares for itself."""
    path = os.path.join(map_dir, map_file)
    if not os.path.isfile(path):
        return {"transactionId": None, "title": None}
    root = ElementTree.parse(path).getroot()
    title = root.findtext("name")
    return {
        "transactionId": root.get("xid"),
        "title": title.strip() if title is not None else None,
    }


def describe(icvn: str) -> dict[str, Any]:
    index = pyx12.map_index.map_index()
    map_dir = os.path.join(os.path.dirname(pyx12.__file__), "map")
    bindings = []
    for binding in index.maps:
        if binding["icvn"] != icvn:
            continue
        map_file = binding["map_file"]
        declaration = _map_declaration(map_dir, map_file)
        bindings.append(
            {
                "icvn": binding["icvn"],
                "vriic": binding["vriic"],
                "fic": binding["fic"],
                "tspc": binding["tspc"],
                "mapFile": map_file,
                "mapTransactionId": declaration["transactionId"],
                "mapTitle": declaration["title"],
            }
        )
    return {
        "package": PACKAGE,
        "version": importlib.metadata.version(PACKAGE),
        "licence": _licence(),
        "mapIndex": "pyx12/map/maps.xml",
        "interchangeControlVersion": icvn,
        "bindings": bindings,
    }


def read(text: str) -> dict[str, Any]:
    try:
        reader = pyx12.x12file.X12Reader(io.StringIO(text))
        segments = []
        for segment in reader:
            # `Segment.elements` holds everything after the segment id, each a
            # composite whose sub-elements rejoin to the element's own text.
            texts = [
                reader.subele_term.join(part.get_value() for part in composite.elements)
                for composite in segment.elements
            ]
            segments.append({"id": segment.get_seg_id(), "elements": texts})
        reader.close()
    except pyx12.errors.X12Error as err:
        return {"ok": False, "refusal": {"kind": type(err).__name__, "detail": str(err)}}
    except (OSError, UnicodeDecodeError, ValueError, IndexError) as err:
        return {"ok": False, "refusal": {"kind": type(err).__name__, "detail": str(err)}}
    return {
        "ok": True,
        "delimiters": {
            "element": reader.ele_term,
            "component": reader.subele_term,
            "repetition": reader.repetition_term,
            "segment": reader.seg_term,
        },
        "segments": segments,
    }


def main(argv: list[str]) -> int:
    if len(argv) >= 2 and argv[0] == "describe":
        json.dump(describe(argv[1]), sys.stdout)
        return 0
    if len(argv) >= 1 and argv[0] == "read":
        json.dump(read(sys.stdin.read()), sys.stdout)
        return 0
    sys.stderr.write("usage: oracle.py describe <icvn> | oracle.py read < document\n")
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
