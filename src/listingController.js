import { Listing } from './listingModel.js';
import { getUserById } from './userController.js'
import { getImage } from './imageController.js';
import { getStripeAccount, getStripeCustomer, getStripePaymentMethod } from './stripeController.js';
import { sendNewListingNotification } from './notificationController.js'
import { getPaging, generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { UUID } from './types.js';

function getUpdates(req, listing) {
    var updates = {};

    if(req.body.publicData != undefined) 
        updates['attributes.publicData'] = Object.assign(listing.attributes.publicData, req.body.publicData);
    if(req.body.privateData != undefined) 
        updates['attributes.privateData'] = Object.assign(listing.attributes.privateData, req.body.privateData);
    if(req.body.protectedData != undefined) 
        updates['attributes.protectedData'] = Object.assign(listing.attributes.protectedData, req.body.protectedData);
    if(req.body.metadata != undefined) 
        updates['attributes.metadata'] = Object.assign(listing.attributes.metadata, req.body.metadata);
    if(req.body.title != undefined)
        updates['attributes.title'] = req.body.title;
    if(req.body.description != undefined)
        updates['attributes.description'] = req.body.description;
    if(req.body.geolocation != undefined) {
        updates['attributes.geolocation'] = Object.assign(listing.attributes.geolocation, req.body.geolocation);
        updates['location.coordinates'] = [ req.body.geolocation.lng, req.body.geolocation.lat ];
    }
    if(req.body.price != undefined)
        updates['attributes.price'] = Object.assign(listing.attributes.price, req.body.price);
    if(req.body.availabilityPlan != undefined)
        updates['attributes.availabilityPlan'] = Object.assign(listing.attributes.availabilityPlan, req.body.availabilityPlan);
    if(req.body.images != undefined) {
        var images = [];

        for(const image of req.body.images) 
            images.push({ id: image, type: 'image' });
        updates['relationships.images.data'] = images;
    }
    // These are not in the Sharetribe spec
    if(req.body.deleted != undefined)
        updates['attributes.deleted'] = req.body.deleted;
    if(req.body.state != undefined)
        updates['attributes.state'] = req.body.state;

    return updates;
}

async function getIncludes(req, listings) {
    var included = [];

    for(const listing of listings) {
        if(listing.relationships.author != undefined &&
                included.filter(obj => listing.relationships.author.data.id.uuid == obj.id.uuid).length == 0) {
            const user = await getUserById(listing.relationships.author.data.id.uuid);
            
            if(user.relationships != undefined && user.relationships.profileImage != undefined && 
                    user.relationships.profileImage.data != null) {
                var newquery = [];
                
                newquery['fields.image'] = req.query['fields.image'] + ',variants.square-small,variants.square-small2x';
                included.push(await getImage(newquery, user.relationships.profileImage.data.id.uuid));
            }

            // FTW bulks without!
            if(user.relationships != undefined && user.relationships.stripeAccount != undefined) { 
                included.push(await getStripeAccount(user.relationships.stripeAccount.data.id));
            }

            // FTW bulks without!
            if(user.relationships != undefined && user.relationships.stripeCustomer != undefined) { 
                let cust = await getStripeCustomer(user.relationships.stripeCustomer.data.id);

                if(cust.relationships.defaultPaymentMethod != undefined) {
                    included.push(await getStripePaymentMethod(cust.relationships.defaultPaymentMethod.data.id));
                }
                
                included.push(cust);
            }

            included.push(user)
        }

        if(listing.relationships.images != undefined && listing.relationships.images.data != undefined) {
            for(const image of listing.relationships.images.data) {
                included.push(await getImage(req.query, image.id.uuid));
            }
        }
    }

    return included;
}

function getListingSelection(query) {
    var sel = {};
    var bounds = {
        type: 'Polygon',
        coordinates: [[
          [2.002627, 58.442019],
          [2.002627, 49.906251],
          [-6.296976, 49.906251],
          [-6.296976, 58.442019],
          [2.002627, 58.442019]
        ]]
    };

    // Handle bounds selection
    if(query['bounds'] != undefined) {
        var points = query['bounds'].split(',');

        bounds.coordinates[0][0][0] = points[1];
        bounds.coordinates[0][0][1] = points[0];
        bounds.coordinates[0][1][0] = points[1];
        bounds.coordinates[0][1][1] = points[2];
        bounds.coordinates[0][2][0] = points[3];
        bounds.coordinates[0][2][1] = points[2];
        bounds.coordinates[0][3][0] = points[3];
        bounds.coordinates[0][3][1] = points[0];
        bounds.coordinates[0][4][0] = points[1];
        bounds.coordinates[0][4][1] = points[0];

        sel['location'] = { $geoWithin: { $geometry: bounds } };
    };

    // Handle make selection (OldenCars specific!!!!)
    if(query['pub_make'] != undefined) {
        var make = query['pub_make'].split(',');

        sel['attributes.publicData.make'] = make[0];
    };

    // Handle year selection (OldenCars specific!!!!)
    if(query['pub_year'] != undefined) {
        var year = query['pub_year'].split(',');

        sel['attributes.publicData.year'] = { $gt: year[0], $lt: year[1] };;
    };

    // Handle price selection
    if(query['price'] != undefined) {
        var price = query['price'].split(',');

        sel['attributes.price.amount'] = { $gt: price[0], $lt: price[1] };
    };

    // Handle keyword search
    if(query['keywords'] != undefined) {
        sel['$text'] = { $search: query['keywords'] };
    };

    // Handle author id search
    if(query['author_id'] != undefined) {
        sel['relationships.author.data.id.uuid'] = query['author_id'];
    };

    // Handle state requirement
    if(query['state'] != undefined) {
        const states = query['state'].split(',');

        sel['attributes.state'] = { $in: states };
    }
    else {
        sel['attributes.state'] = 'published';
    }

    // Handle deleted requirement (this isn't in the Sharetribe spec)
    if(query['deleted'] != undefined) {
        const states = query['deleted'].split(',');

        sel['attributes.deleted'] = { $in: states };
    }
    else {
        sel['attributes.deleted'] = false;
    }

    return sel;
}

function getListingProjection(query)
{
    var projection = {};

    if(query['fields.listing'] != undefined) {
        var fields = query['fields.listing'].split(',');

        for(const field of fields) {
            projection['attributes.' + field] = 1;
        }
    }

    // Add the include projection including limits
    if (query['include'] != undefined) {
        var includes = query['include'].split(',');

        for(const inc of includes) {
            if(query['limit.' + inc] != undefined) {
                projection['relationships.' + inc + '.data'] = { $slice: Number(query['limit.' + inc]) };
            }
            else {
                projection['relationships.' + inc] = 1;
            }
        }
    }
    
    // If any projection has been specified, FTW also wants id and type
    if (Object.keys(query).length != 0) {
        projection['id'] = 1;
        projection['type'] = 1;
        projection['attributes'] = 1;
    }

    return projection;
}

export async function getListingById(id) {
    return Listing.findOne({ 'id.uuid': id }).lean();  
}

async function getQuery(query) {
    var sel = getListingSelection(query);
    var projection = getListingProjection(query);
    var paging = getPaging(query);
    var count = await Listing.countDocuments(sel);

    // Listing must be open
    var listings = await Listing.find(sel, projection, paging).lean();

    return { listings, count };
}

// Handle index actions
function show(req, res) {
    getListingById(req.query.id).then(listing => {
        var ret = { data: listing };

        if(listing != null && req.query['include'] != undefined) {
            var listings = [ listing ];
            
            getIncludes(req, listings).then(included => {
                ret['included'] = included;
                sendTransit(req, res, ret);
            });
        }
        else {
            sendTransit(req, res, ret);
        }
    });
};

// Handle query listings 
function query(req, res) {
    getQuery(req.query).then(result => {
        var ret = {};
        var perPage = req.query['per_page'] == undefined ? 1000 : Number(req.query['per_page']);  

        ret['data'] = result.listings;
        ret['meta'] = {
            totalItems: result.count,
            totalPages: Math.ceil(result.count / perPage),
            page: req.query['page'] == undefined ? 1 : Number(req.query['page']),
            perPage: perPage };

        if(req.query['include'] != undefined) {
            getIncludes(req, result.listings).then(included => {
                ret['included'] = included;

                sendTransit(req, res, ret);
             })
        }
        else
            sendTransit(req, res, ret);
    })
};

// Handle own_listings show 
function ownShow(req, res) {
    Listing.findOne({ 'id.uuid': req.query.id }).lean().then(listing => {
        var ret = { data: listing };

        // Set the listing type correctly
        listing.type = 'ownListing';
        
        // Set the user relationships type to currentUser
        if(listing.relationships != undefined && listing.relationships.author != undefined && listing.relationships.author.data != undefined) 
            listing.relationships.author.data.type = 'currentUser';
        
        if(req.query['include'] != undefined) {
            var listings = [ listing ];

            getIncludes(req, listings).then(included => {
                // Set the included users to currentUser
                for(const include of included) {
                    if(include.type == 'user')
                        include.type = 'currentUser' 
                }
                ret['included'] = included;

                sendTransit(req, res, ret);
            });
        }
        else {
            sendTransit(req, res, ret);
        }
    });
}

// Handle own_listings query 
function ownQuery(req, res) {
    var newquery = Object.assign({}, req.query);

    newquery['author_id'] = req.user;
    newquery['state'] = 'published,draft,pendingApproval,closed';
    newquery['fields.listing'] = 'title,geolocation,price,state,createdAt,privateData,publicData,metadata,availabilityPlan,descriptioni,deleted'
    getQuery(newquery).then(result => {
        var ret = {};
        var perPage = newquery['per_page'] == undefined ? 1000 : Number(newquery['per_page']);  

        for(const listing of result.listings) {
            listing.type = 'ownListing';

            if(listing.relationships != undefined)
                listing.relationships.author.data.type = 'currentUser'
        }

        ret['data'] = result.listings;
        ret['meta'] = {
            totalItems: result.count,
            totalPages: Math.ceil(result.count / perPage),
            page: newquery['page'] == undefined ? 1 : Number(newquery['page']),
            perPage: perPage };

        if(newquery['include'] != undefined) {
            getIncludes(req, result.listings).then(included => {
                for(const include of included) {
                    if(include.type == 'user')
                        include.type = 'currentUser' 
                }
                ret['included'] = included;

                sendTransit(req, res, ret);
            });
        }
        else
            sendTransit(req, res, ret);
    });
}

// Handle create listing
function createDraft(req, res) {
    var listing = new Listing;

    listing.id = new UUID(generateGuid());
    listing.type = 'listing';
    listing.attributes.title = req.body.title;
    listing.attributes.description = req.body.description;
    listing.attributes.geolocation = req.body.geolocation;
    if(req.body.geolocation !== undefined) {
        listing.location.coordinates = [ req.body.geolocation.lng, req.body.geolocation.lat ];
    }
    listing.attributes.price = req.body.price;
    if(req.body.availabilityPlan !== undefined) {
        listing.attributes.availabilityPlan = req.body.availabilityPlan;
    }
    listing.attributes.state = 'draft';
    listing.attributes.deleted = false;
    listing.attributes.publicData = req.body.publicData;
    listing.attributes.privateData = req.body.privateData;
    listing.relationships.author.data = { id: new UUID(req.user), type: 'user' };
    listing.relationships.images.data = req.body.images;

    listing.save().then(result => {
        var listings = [ listing ];

        listing.type = 'ownListing';
        console.log('listing created: (', listing.attributes.title, '): ', result);

        getIncludes(req, listings).then(included => {
            var userEmail = null;

            // Set the user relationships type to currentUser
            listing.relationships.author.data.type = 'currentUser';

            // Set the included users to currentUser (and note email!)
            for(const include of included) {
                if(include.type == 'user') {
                    include.type = 'currentUser';
                    userEmail = include.attributes.email;
                }
            }
            
            // Inform admin
            if(userEmail != null) {
                sendNewListingNotification(userEmail);
            }

            sendTransit(req, res, { data: listing.toObject(), included: included }); 
        });
    });
}

// Handle update listing (used for Integration 'approve' API as well)
function update(req, res) {
    Listing.findOne({ 'id.uuid': req.body.id.uuid }, { id: 1, type: 1, 'relationships.author': 1, 'relationships.images.data': { $slice: 1 }, attributes: 1 }).then(listing => {
        var updates = getUpdates(req, listing);
     
        Listing.updateOne({'id.uuid': req.body.id.uuid }, updates).then(result => {
            console.log('listing updated: (', req.body.id.uuid, '): ', result);

            req.query['id'] = req.body.id.uuid;
            ownShow(req, res);
        });
    });
};

// Handle update listing (used for Integration API as well)
function publishDraft(req, res) {
    var updates = {};

    updates['attributes.state'] = 'published';
    Listing.updateOne({ id: req.body.id }, updates).then(result => {
        console.log('listing updated: (', req.body.id.uuid, '): ', result);

        req.query['id'] = req.body.id.uuid;
        ownShow(req, res);
    });
}

// Handle close listing (used for Integration API as well)
function close(req, res) {
    var updates = {};

    updates['attributes.state'] = 'closed';
    Listing.updateOne({ id: req.body.id }, updates).then(result => {
        console.log('listing updated: (', req.body.id.uuid, '): ', result);

        req.query['id'] = req.body.id.uuid;
        ownShow(req, res);
    });
}

// Handle open listing (used for Integration API as well)
function open(req, res) {
    var updates = {};

    updates['attributes.state'] = 'published';
    Listing.updateOne({ id: req.body.id }, updates).then(result => {
        console.log('listing updated: (', req.body.id.uuid, '): ', result);

        req.query['id'] = req.body.id.uuid;
        ownShow(req, res);
    });
}

export default { query, show, ownQuery, ownShow, createDraft, update, publishDraft, close, open }