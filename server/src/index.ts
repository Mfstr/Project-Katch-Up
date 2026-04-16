import { request } from "node:http";
import { syncCalendar } from "./icalParser";
import express, { response } from 'express';


const app = express();
app.use(express.json());

app.post('api/sync', async (request, response) =>
{
    const { calendarUrl } = request.body;

    try 
    {
        await syncCalendar(calendarUrl);
        response.status(200).json({ message: "Sync success."});

    }
    catch (error)
    {
        response.status(500).json({ error: "Sync failed."})
    }
});

app.listen(5000, () => console.log("Host online on port 5000."));


const test_url = 'https://ics.calendarlabs.com/76/16fc2839/US_Holidays.ics';

console.log (" startup... ");

syncCalendar(test_url)
.catch((err) => console.error('Sync Failed:', err));