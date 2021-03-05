import { Review } from './reviewModel.js';
import { getTransactionById } from './transactionController.js';
import { getStripeAccount, getStripeCustomer, getStripePaymentMethod } from './stripeController.js';
import { getUserById } from './userController.js';
import { getImage } from './imageController.js';
import { generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { UUID } from './types.js';

async function getIncludes(req, reviews) {
    var included = [];
    var whats = req.query['include'].split(',');

    for(const review of reviews) {
        for(const what of whats) {
            if(what == 'subject' || what == 'author') {
                const user = (what == 'subject') ? await getUserById(review.relationships.subject.data.id.uuid) :
                                                    await getUserById(review.relationships.author.data.id.uuid);

                if(included.filter(obj => user.id.uuid == obj.id.uuid).length == 0) {
                    if(user.relationships.profileImage != undefined && user.relationships.profileImage.data != undefined) {
                        included.push(await getImage(req.query, user.relationships.profileImage.data.id.uuid));
                    }

                    // FTW bulks without!
                    if(user.relationships != undefined && user.relationships.stripeAccount != undefined) { 
                        included.push(await getStripeAccount(user.relationships.stripeAccount.data.id));
                    }

                    // FTW bulks without!
                    if(user.relationships != undefined && user.relationships.stripeCustomer != undefined) { 
                        const cust = await getStripeCustomer(user.relationships.stripeCustomer.data.id);

                        if(cust.relationships.defaultPaymentMethod != undefined) {
                            included.push(await getStripePaymentMethod(cust.relationships.defaultPaymentMethod.data.id));
                        }

                        included.push(cust);
                    }
                    
                    included.push(user);
                }
            } 
        }
    }
    
    return included;
}

function getReviewProjection(query) {
    var projection = {};

    // Add the include projection including limits
    if (query['include'] != undefined) {
        var includes = query['include'].split(',');

        for(const include of includes) {
            if(include == 'author' || include == 'subject' || include == 'listing')
                projection['relationships.' + include] = 1; 
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

async function getQuery(query) {
    var projection = getReviewProjection(query);
    var reviews = [];

    // Another pace where two query parameters mean the same thing - DOC ERROR
    if(query.subjectId != undefined)
        query['subject_id'] = query.subjectId;
    if(query.listingId != undefined)
        query['listing_id'] = query.listingId;

    if(query.listing_id != undefined)
        reviews = await Review.find({ 'relationships.listing.data.id.uuid': query.listing_id }, projection).lean();
    else if(query.subject_id != undefined)
        reviews = await Review.find({ 'relationships.subject.data.id.uuid': query.subject_id }, projection).lean();
    else if(query.type != undefined)
        reviews = await Review.find({ 'attributes.type': query.type}, projection).lean(); 
    else if(req.query.transactionId != undefined) {
        const transact = await getTransactionById(query.transactionId);

        for(const review of transact.relationships.review) {
            reviews.push(await Review.findOne({ 'id.uuid' : review.data[i].id.uuid }, projection).lean())
        };
    } else if(query.state != undefined) {
        const states = query.state.split(',');

        for(const state of states) {
            reviews.concat(await Review.find({ 'attributes.state': state }, projection).lean())
        };
    }

    return reviews;
}

export async function createReview(req, transact, of) {
    var review = new Review;

    review.id = new UUID(generateGuid());
    review.attributes.type = of;
    review.attributes.state = 'pending';
    review.attributes.deleted = false;
    review.attributes.rating = req.body.params.reviewRating;
    review.attributes.content = req.body.params.reviewContent;
    review.relationships.author.data.id.uuid = of == 'ofProvider' ?  transact.relationships.customer.data.id.uuid : transact.relationships.provider.data.id.uuid;
    review.relationships.listing.data.id.uuid = transact.relationships.listing.data.id.uuid;
    review.relationships.subject.data.id.uuid = of == 'ofProvider' ?  transact.relationships.provider.data.id.uuid : transact.relationships.customer.data.id.uuid;

    // Save
    var res = await review.save();

    return review;
}

export async function publishReview(id) {
    var review = await getReview(id.uuid);

    review.attributes.state = 'public';
    
    // Save
    var res = await review.save();

    return review;
}

export async function getReview(id) {
    return await Review.findOne({ 'id.uuid': id });
}

// Handle a review request (id == review id)
function show(req, res) {
    Review.findOne({ 'id.uuid': req.query.id }).then(review => {
        sendTransit(req, res, { data: review })
    })
};

// Handle reviews for listing/provider or users
function query(req, res) {
    getQuery(req.query).then(reviews => {
        var ret = { data: reviews };

        ret['meta'] = {
            totalItems: reviews.length,
            totalPages: 1,
            page: 1,
            perPage: 100
        }

        if(req.query['include'] != undefined) {
            getIncludes(req, reviews).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;

                sendTransit(req, res, ret);
            })
        }
        else
            sendTransit(req, res, ret)
    })
};

export default { query, show };