FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/

RUN set -x \
    && groupadd -g 1000 couchbase \
    && useradd -m -u 1000 -g couchbase couchbase

RUN set -x \
    && mkdir /app \
    && chown -R couchbase:couchbase /app

COPY entrypoint.sh /entrypoint.sh

USER couchbase
WORKDIR /app

CMD ["/entrypoint.sh"]