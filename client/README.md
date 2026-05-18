# Agent Dashboard - React Frontend

Modern React application for the Nords Weight Loss Clinic agent dashboard.

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool & dev server
- **Axios** - HTTP client
- **Context API** - State management
- **CSS Modules** - Component styling

## Project Structure

```
src/
├── components/       # React components
├── context/          # Global state (AgentContext)
├── hooks/            # Custom hooks (useConversations, useMessages)
├── services/         # API calls (api.js)
├── utils/            # Helper functions
├── App.jsx           # Main app component
└── main.jsx          # Entry point
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (with backend proxy)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Features

- Agent authentication
- Real-time conversation list
- Message display with media support
- Context menu (right-click)
- Agent takeover/release
- Conversation assignment
- Manual chat initiation
- Message status tracking
- Starred messages
- Auto-refresh

## API Integration

All API calls proxy to backend at `http://localhost:3000` during development.

See `src/services/api.js` for available endpoints.

## Adding New Features

1. Create component in `src/components/`
2. Add styles as `.css` file
3. Use `useAgent()` hook for global state
4. Import and use in parent component

## Environment

Development: `npm run dev` (port 5173)
Production: Served by Express from `/dist`
