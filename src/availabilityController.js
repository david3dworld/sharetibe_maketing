import { Availability } from './availabilityModel.js';
import { sendTransit } from './sdk.js';
import { generateGuid } from './util.js';
import { UUID } from './types.js';

export async function getExceptions(listingId, start, end) {
    var sel = {};

    sel['relationships.listing.data.id.uuid'] = listingId;
    sel['attributes.start'] = { $gte: start };
    sel['attributes.end'] = { $lte: end }

    return Availability.find(sel).lean();
}

async function createException(listingId, start, end, seats) {
    var exception = new Availability;

    exception.id = new UUID(generateGuid());
    exception.relationships.listing.data.id.uuid = listingId.uuid;
    exception.attributes.start = new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth(),start.getUTCDate(),start.getUTCHours(),start.getUTCMinutes(),0));
    exception.attributes.end = new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth(),end.getUTCDate(),end.getUTCHours(),end.getUTCMinutes(),0));
    exception.attributes.seats = seats;

    return exception.save();
}

async function removeException(id) {
    const sel = {};

    sel['id.uuid'] = id.uuid;

    return Availability.deleteOne(sel);
}

// Handle availability exceptions querys
function query(req, res) {
    const start = req.query['start'];
    const end = req.query['end'];
    const id = req.query['listingId'];
    
    getExceptions(id, start, end).then(exceptions => {
        var meta = {
            totalItems: exceptions.length,
            totalPages: 1,
            page: 1,
            perPage: 100
        }

        for(var exc of exceptions) {
            delete exc.relationships;
        }

        sendTransit(req, res, { data: exceptions, meta: meta })
    })  
};

// Handle availability exception create
function create(req, res) {
    const start = req.body['start'];
    const end = req.body['end'];
    const id = req.body['listingId'];
    const seats = req.body['seats'];

    createException(id, start, end, seats).then(exception => {
        const { relationships, id, type, attributes } = exception.toObject();
        const newException = { id: id, type: type, attributes: attributes};

        sendTransit(req, res, { data: newException })
    })
};

// Handle availability exception delete
function remove(req, res) {
    const id = req.body['id'];

    removeException(id).then(exception => {
        if(exception.n === 1 && exception.ok === 1) {
            const retVal = {
                id: id,
                type: 'availabilityException'
            };

            sendTransit(req, res, { data: retVal })
        }
        else {
            sendTransit(req, res, { data: {} })
        }
        
    })
};

export default { query, create, remove };