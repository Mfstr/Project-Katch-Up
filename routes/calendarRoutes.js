import express from 'express';
const router = express.Router();
import { syncCalendar } from '../backend/dist/icalParser.js';

// API Endpoint for syncing the calendar
router.post('/sync', async (req, res) => {
  try {
    const { url } = req.body;

    // Checks to see if a URL was given
    if (!url) {
      return res.status(400).json({
        success: false,
        message: 'Calendar URL is required',
      });
    }

    // Runs the iCal parser
    const events = await syncCalendar(url);

    // Returns events to the frontend
    res.status(200).json({
      success: true,
      events: events,
    });

    //If an unforseen error occurs, make sure your notified.
  } catch (error) {
    console.error('Calendar sync failed:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to sync calendar',
    });
  }
});

export default router;
