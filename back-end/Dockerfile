# Backend Dockerfile - Express.js
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 expressjs
RUN chown -R expressjs:nodejs /app
USER expressjs

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "src/app.js"]
