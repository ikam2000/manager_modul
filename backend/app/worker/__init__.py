# -*- coding: utf-8 -*-
"""Фоновый воркер: очередь задач в Redis, обработчики."""

from app.worker.queue import enqueue, dequeue

__all__ = ["enqueue", "dequeue"]
