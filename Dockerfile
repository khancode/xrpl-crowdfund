FROM node:16.17.0

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

EXPOSE 3001

CMD npm run app:setup && npm run start
