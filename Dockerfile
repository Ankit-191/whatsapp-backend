# Multi-stage Docker build for Combined Rust Backend + WhatsApp QR Bridge
FROM rust:bookworm as builder

WORKDIR /usr/src/app
COPY whatsapp-backend/Cargo.toml whatsapp-backend/Cargo.lock ./
# Prebuild dependencies cache
RUN mkdir src && echo "fn main() {}" > src/main.rs && cargo build --release && rm -rf src

# Copy real sources
COPY whatsapp-backend/src ./src
COPY whatsapp-backend/knowledge ./knowledge
COPY whatsapp-backend/migrations ./migrations
RUN touch src/main.rs && cargo build --release

# Final runtime image using Debian Bookworm
FROM debian:bookworm-slim

# Copy official Node.js 20+ runtime directly from official Node image
COPY --from=node:20-bookworm-slim /usr/local /usr/local

# Install ca-certificates and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Copy compiled Rust backend & resources
COPY --from=builder /usr/src/app/target/release/whatsapp-backend /app/whatsapp-backend
COPY --from=builder /usr/src/app/knowledge /app/knowledge
COPY --from=builder /usr/src/app/migrations /app/migrations

# 2. Copy and setup WhatsApp Bridge with Node 20
COPY whatsapp-bridge /app/whatsapp-bridge
RUN cd /app/whatsapp-bridge && npm install --omit=dev

# 3. Setup startup script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

ENV PORT=8080
ENV KNOWLEDGE_DIR=/app/knowledge
EXPOSE 8080 3001

CMD ["/app/start.sh"]
