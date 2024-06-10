FROM node:14

RUN useradd -ms /bin/bash ovos

WORKDIR /usr/src/app

RUN chown -R ovos:ovos /usr/src/app

USER ovos

COPY package*.json ./

RUN npm install

COPY . .

CMD [ "node", "app.js" ]
