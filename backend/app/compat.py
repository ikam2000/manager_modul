# -*- coding: utf-8 -*-
"""
Совместимость с Python 3.14.
В 3.14 typing.Union.__getitem__ изменился — SQLAlchemy падает при Mapped[Optional[X]].
Патчим make_union_type для использования оператора |.
"""

import sys

if sys.version_info >= (3, 14):
    from functools import reduce
    from operator import or_
    import sqlalchemy.util.typing as sa_typing

    _orig_make_union_type = sa_typing.make_union_type

    def _make_union_type_py314(*types):
        if len(types) == 1:
            return types[0]
        return reduce(or_, types)

    sa_typing.make_union_type = _make_union_type_py314
