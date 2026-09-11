import express from 'express';
import timerRoutes from './routes/timerRoutes.js';
import calendarRoutes from './routes/calendarRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/timer', timerRoutes);
app.use('/calendar', calendarRoutes);

app.get('/', (req, res) => {
  res.send('API Server is running.');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
