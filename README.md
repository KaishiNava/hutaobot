# Hutao Bot Web — K-Frame Hybrid Chat

A starter web chatbot with a premium dark interface, animated typing indicator, custom bot response cards, colorful interactive buttons, and a Node.js command plugin system.

## Requirements
- Node.js 18+
- npm

## Run locally
```bash
npm install
npm start
```
Open `http://localhost:3000`.

## Add a command
Create a `.js` file inside `commands/` and export a `name` (or `names`) plus an async `execute()` returning a response object.

```js
module.exports = {
  name: "hello",
  async execute({ user, args }) {
    return {
      type: "card",
      title: "Hello!",
      text: `Hi ${user}`,
      accent: "cyan",
      buttons: [{ label: "Main menu", command: ".menu", icon: "✦" }]
    };
  }
};
```

Supported response fields: `title`, `text`, `thumbnail`, `marquee`, `user`, `stats`, `buttons`, `accent`.
Button commands are sent back through the same chat API.

## Deploy
Deploy the Node app to Railway (set start command to `npm start`). Railway will provide `PORT`.
The frontend is served by Express from `public/`, so the simplest deployment is one service. You can also place it behind a domain/proxy.

## Notes
This is a functional starter/demo, not a production multi-user service. It has no account system, persistent chat history, database, rate limiting, or authentication yet. Add those before opening it publicly. The downloader/tools commands are UI placeholders and need actual provider integrations.
