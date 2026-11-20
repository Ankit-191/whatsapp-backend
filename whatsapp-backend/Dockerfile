# Multi-stage Docker build for Rust backend
FROM rust:bookworm as builder

WORKDIR /usr/src/app
COPY Cargo.toml Cargo.lock ./
# Prebuild dependencies cache
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src
 
# Copy real sources
COPY src ./src
COPY knowledge ./knowledge
COPY migrations ./migrations
RUN touch src/main.rs && cargo build --release

# Final runtime image using Debian Bookworm (active stable release)
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/app/target/release/whatsapp-backend /app/whatsapp-backend
COPY --from=builder /usr/src/app/knowledge /app/knowledge
COPY --from=builder /usr/src/app/migrations /app/migrations

ENV PORT=8080
ENV KNOWLEDGE_DIR=/app/knowledge
EXPOSE 8080

CMD ["/app/whatsapp-backend"]
