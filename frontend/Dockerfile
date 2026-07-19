FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Public env vars are inlined into the client bundle at build time.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_MAPBOX_TOKEN
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_MAPBOX_TOKEN=$NEXT_PUBLIC_MAPBOX_TOKEN

RUN npm run build

FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
# Next.js standalone reads HOSTNAME; Docker sets it to the container ID, which
# Railway can't route to. Force bind on all interfaces.
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["node", "server.js"]
