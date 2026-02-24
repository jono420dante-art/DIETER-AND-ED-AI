# DIETER AND ED AI - Multi-stage Docker Build
# Merging AI Music Hub (Manus.space) + DIETER PRO (Arena.site)

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Image
FROM node:20-alpine AS production
WORKDIR /app

# Install production dependencies only
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy built backend
COPY --from=backend-builder /app/backend/dist ./backend/dist
COPY --from=backend-builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY backend/prisma ./backend/prisma

# Copy built frontend to serve as static files
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create log directory
RUN mkdir -p /app/backend/logs

# Security: Run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Environment
ENV NODE_ENV=production
ENV PORT=5000

# Start command
CMD ["node", "backend/dist/server.js"]
