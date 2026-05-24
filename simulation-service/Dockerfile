FROM node:18-alpine

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY . .

RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 3001

CMD ["node", "server.js"]
