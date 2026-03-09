# -*- coding: utf-8 -*-
"""Rate limiting для auth, webhook и других чувствительных эндпоинтов."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
