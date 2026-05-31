FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4173

COPY package.json ./
COPY platform ./platform
COPY paper ./paper
COPY README.md ./

RUN mkdir -p /app/platform/runs

EXPOSE 4173

CMD ["npm", "start"]
