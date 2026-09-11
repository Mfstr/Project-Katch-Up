# Project-Katch-Up

timer for toamtoes

## Testing Endpoints Locally

Start the server using:

```bash
node index.js
```

The server will run on port `3000` by default.

### Timer Routes

**Start Timer**

```bash
curl -X POST http://localhost:3000/timer/start \
  -H "Content-Type: application/json" \
  -d '{"taskId": "123", "durationSeconds": 1500}'
```

**Pause Timer**

```bash
curl -X POST http://localhost:3000/timer/pause
```

**Stop Timer**

```bash
curl -X POST http://localhost:3000/timer/stop
```

**Reset Timer**

```bash
curl -X POST http://localhost:3000/timer/reset
```

### Calendar Routes

**Sync Calendar**

```bash
curl -X POST http://localhost:3000/calendar/sync \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/calendar.ics"}'
```
