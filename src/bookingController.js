import { Booking } from './bookingModel.js';
import { getTransactionById } from './transactionController.js';
import { generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { UUID } from './types.js';

export async function createBooking(req, transact) {
    var booking = new Booking;

    // Create booking
    booking.id = new UUID(generateGuid());
    booking.attributes.start = req.body.params.bookingStart;
    booking.attributes.end = req.body.params.bookingEnd;
    booking.attributes.seats = req.body.params.seats != undefined ? req.body.params.seats : 1;
    booking.attributes.displayStart = req.body.params.bookingStart;
    booking.attributes.displayEnd = req.body.params.bookingEnd,
    booking.attributes.state = 'pending';
    booking.relationships./*transaction.*/data.id.uuid =  transact.id.uuid;

    // Save
    var res = await booking.save();

    return booking;
}

export async function acceptBooking(req, transact) {
    var booking = await Booking.findOne({ 'id.uuid': transact.relationships.booking.data.id.uuid });

    booking.attributes.state = 'accepted';
    var res  = await booking.save()
    
    return booking;
}

export async function declineBooking(req, transact) {
    var booking = await Booking.findOne({ 'id.uuid': transact.relationships.booking.data.id.uuid });

    booking.attributes.state = 'declined';
    var res  = await booking.save()
    
    return booking;
}

export async function getBookings(listingId, start, end, states) {
    const bookings = await Booking.find({ $or: [
                { $and: [
                    {'attributes.start': { $gte: start }}, 
                    {'attributes.end': { $lte: end }}
                ]	},
                { $and: [
                    {'attributes.start': { $lte: start }}, 
                    {'attributes.end': { $gte: start }}
                ]	},
                { $and: [
                    {'attributes.start': { $lte: end }}, 
                    {'attributes.end': { $gte: end }}
                ]	}
	        ]
        }).lean();
    var retBookings = []

    for(const booking of bookings) {
        var tran = await getTransactionById(booking.relationships.data.id.uuid);

        if(tran.relationships.listing.data.id.uuid === listingId && states.includes(booking.attributes.state)) {
            retBookings.push(booking);
        }
    }

    return retBookings;
}

export async function getBookingById(id) {
    return await Booking.findOne({ 'id.uuid': id }).lean(); 
}

// Handle bookings querys
function query(req, res) {
    const start = req.query['start'];
    const end = req.query['end'];
    const listingId = req.query['listingId'];
    const states = req.query['state'] != undefined ? req.query['state'].split(',') : [];

    getBookings(listingId, start, end, states).then(bookings => {
        var ret = {};

        ret['data'] = bookings;
        ret['meta'] = {
            totalItems: bookings.length,
            totalPages: 0,
            page: 1,
            perPage: 100 };

        sendTransit(req, res, ret)
    })
};

export default { query };