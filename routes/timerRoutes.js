const express = require("express");
const router = express.Router();


// Start endpoint
router.post("/start", (req, res) => {
    const { taskId, durationSeconds } = req.body;

    res.json({
        message: "Timer Started",
        taskId,
        durationSeconds
    });
});

// Pause endpoint
router.post("/pause", (req, res) => {
    // Wasn't sure what needed to be sent back yet
    res.json({
        message: "Timer Paused"
    });
});

// Stop endpoint
router.post("/stop", (req, res) => {
    // Wasn't sure what needed to be sent back yet
    res.json({
        message: "Timer Stopped"
    });
});

// Reset endpoint
router.post("/reset", (req, res) => {
    // Wasn't sure what needed be sent back yet
    res.json({
        message: "Timer Reset"
    });
});

module.exports = router;