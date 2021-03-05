import { TimeSlot } from './timeSlotModel.js';
import { getExceptions } from './availabilityController.js';
import { getBookings } from './bookingController.js';
import { generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { UUID } from './types.js'

async function getSlots(listingId, start, end) {
    var slots = [];

    for(var d = start; d < end; d.setDate(d.getDate() + 1))
    {
        var t = new TimeSlot;

        t.id = new UUID(generateGuid());
        t.attributes.start = new Date(d.getTime());
        t.attributes.end = new Date(d.getTime());
        t.attributes.end.setDate(t.attributes.end.getDate() + 1)

        // Check exceptions
        const exceptions = await getExceptions(listingId, t.attributes.start, t.attributes.end);

        // Check bookings
        const bookings = await getBookings(listingId, t.attributes.start, t.attributes.end, ['pending', 'accepted'] )

        if(exceptions.length === 0 && bookings.length === 0) {
            slots.push(t.toObject());
        }
    };

    return slots;
}

// Handle timeslot querys
function query(req, res) { 
    const start = new Date(req.query.start);
    const end = new Date(req.query.end);
    const listingId = req.query.listingId; 
    
    getSlots(listingId, start, end).then(slots => {
        var meta = {
            totalItems: slots.length,
            totalPages: 1,
            page: 1,
            perPage: 100
        }

        sendTransit(req, res, { data: slots, meta: meta })
    }) 
};

export default { query };