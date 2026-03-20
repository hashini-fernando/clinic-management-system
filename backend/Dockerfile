# ── Stage 1: Build ───────────────────────────────
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files first (better layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build binary
RUN CGO_ENABLED=0 GOOS=linux go build -o clinic-backend .

# ── Stage 2: Run ─────────────────────────────────
FROM alpine:latest

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/clinic-backend .

EXPOSE 8000

CMD ["./clinic-backend"]
