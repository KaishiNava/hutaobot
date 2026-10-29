# Hutao Bot Web — K-Frame Hybrid Chat (v1.1)

Premium dark chat UI with custom bot cards, animated typing, colorful buttons, Node.js command plugins, and browser-local chat session persistence.

## Requirements
- Node.js 18+
- npm

## Run locally
```bash
npm install
npm start
```
Open `http://localhost:3000`.

## Included features
- Custom response cards with image thumbnail and marquee
- Interactive command buttons
- Typing indicator and smooth scroll
- Command plugin architecture
- Chat history saved in IndexedDB (persists after refresh/browser restart on this device)
- Settings panel: export chat JSON, clear conversation, clear local data/cache
- Responsive mobile and desktop layout

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

## Deploy
Deploy the Node app to Railway (set start command to `npm start`). Railway provides the `PORT` environment variable. Express serves the frontend from `public/`, so this can be deployed as one service.

## Storage / privacy
Chat history is stored in IndexedDB in the current browser profile and is not synced across devices. Clearing local data removes the browser's stored chat and available Cache Storage entries. Export chat downloads a JSON file. This starter does not yet include login/authentication or cloud-synced history.

## Important
This is a starter/demo rather than a production-ready multi-user platform. Add authentication, server-side rate limits, authorization, and database storage before making it public. Downloader/tools are UI placeholders until provider integrations are added.
