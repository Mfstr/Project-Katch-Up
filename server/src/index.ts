import { syncCalendar } from "./parser";

const test_url = 'https://ics.calendarlabs.com/76/16fc2839/US_Holidays.ics';

console.log (" startup... ");

syncCalendar(test_url)
.catch((err) => console.error('Sync Failed:', err));