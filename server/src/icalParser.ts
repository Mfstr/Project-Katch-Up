import ical from 'node-ical';

export const syncCalendar = async (url: string) =>
{
    try
    {
        // Fetch data
        const response = await fetch(url);

        if(!response.ok)
        {
            throw new Error(`Failed to fetch data: ${response.status}`);
        }

        // Parse data
        const data = await response.text();

        const webEvents = ical.sync.parseICS(data);

        const events = Object.values(webEvents).filter((ev): ev is ical.VEvent => ev !== undefined && ev.type === 'VEVENT');

        if (events.length == 0)
        {
            console.log("It's cooked, no events womp womp");
            return;
        }

        events.forEach(event => {
            if (!event) return;
            const eventDate = new Date(event.start.toString());
            if(event.type === `VEVENT` && eventDate.getTime() >= Date.now())
            {
                console.log(`Event: ${event?.summary} | Date: ${event?.start}`);
            }
        });
    }
    catch (error: any)
    {
        console.error(`Error: ${error.message}`);
    }
}