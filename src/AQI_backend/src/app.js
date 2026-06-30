const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const quickScanRoutes = require('./routes/quickScanRoutes');
const roomComparisonRoutes = require('./routes/roomComparisonRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const corsOrigins = (process.env.CORS_ORIGIN || 'http://127.0.0.1:5500,http://localhost:5500')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(helmet());
app.use(
  cors({
    origin: corsOrigins.includes('*') ? '*' : corsOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ success: true, status: 'ok', service: 'AirPredict (AQII) backend' });
});

// Feature routes -- map 1:1 to the two frontend modes
app.use('/api/quick-scan', quickScanRoutes);
app.use('/api/rooms', roomComparisonRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
