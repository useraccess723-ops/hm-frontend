# StayFlow – Hotel Admin Dashboard (React)

## Run it
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in /dist
```

## Structure
- `src/context/StoreContext.jsx` – bookings, rooms, channels, toast, modal (swap for API calls later)
- `src/data/mock.js` – sample data (replace with your Django API)
- `src/components/` – Sidebar, Header, DataTable, StatCard, Badge, Modal, Toast and more
- `src/pages/<feature>/` – one folder per module
- `src/routes/AppRoutes.jsx` – all routes

All data is sample data. Channel connections (MMT, Agoda, etc.) are illustrative.
Real sync must run through your backend using partner APIs or a channel-manager provider.
