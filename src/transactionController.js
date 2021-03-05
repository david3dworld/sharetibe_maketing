import { getUserById } from './userController.js';
import { getListingById } from './listingController.js';
import { getImage } from './imageController.js';
import { getMessage } from './messageController.js';
import { sendNotification } from './notificationController.js';
import { createPaymentIntent, capturePaymentIntent, refundPayment, transferPayment, getStripeAccount, getStripeCustomer, getStripePaymentMethod } from './stripeController.js';
import { getBookingById, createBooking, acceptBooking, declineBooking } from './bookingController.js';
import { getReview, createReview, publishReview } from './reviewController.js';
import { getTransition } from './transitionController.js';
import { Transaction, LineItem, TransitionLine } from './transactionModel.js';
import { generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { UUID, Money, BigDecimal } from './types.js'

function getTransSelection(req) {
    var userId = req.user;
    var sel = {};

    if(req.query.last_transitions != undefined) {
       sel['attributes.lastTransition'] = { $in: req.query.last_transitions };
    }

    if(req.query.only != undefined) {
        if(req.query.only == 'sale') {
            sel['relationships.provider.data.id.uuid'] = userId;
        }
        else if(req.query.only == 'order') {
            sel['relationships.customer.data.id.uuid'] = userId;
        }
    }
    else {
        sel['$or'] = [
            { 'relationships.provider.data.id.uuid': userId },
            { 'relationships.customer.data.id.uuid': userId } ];
    }
 
    return sel;
}

async function getIncludes(req, trans) {
    var included = [];
    var includes = req.query['include'];
    var whats = includes.split(',');

    // Seems listings are wanted whatever the include is! FTW/SDK bug
    if(whats['listing'] == undefined) whats.push('listing');

    // Seems creation of transaction requires customer whatever!
    if(whats['customer'] == undefined) whats.push('customer');

    for(const tran of trans) {
        for(const what of whats) {
            if(what == 'customer' || what == 'provider') {
                const user = (what == 'customer') ? await getUserById(tran.relationships.customer.data.id.uuid) :
                                                    await getUserById(tran.relationships.provider.data.id.uuid);

                if(included.filter(obj => user.id.uuid == obj.id.uuid).length == 0) {
                    if(user.relationships != undefined && user.relationships.profileImage != undefined && user.relationships.profileImage.data != undefined) {
                        included.push(await getImage(req.query, user.relationships.profileImage.data.id.uuid));
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
                    
                    included.push(user);
                }
            } 

            if(what == 'listing') {
                const listing = await getListingById(tran.relationships.listing.data.id.uuid);

                if(included.filter(obj => listing.id.uuid == obj.id.uuid).length == 0) {
                    // While not stated in the includes, looks like it wants the images too!
                    for(const image of listing.relationships.images.data) {
                        included.push(await getImage(req.query, image.id.uuid));
                    }

                    included.push(listing);
                }   
            }

            if(what == 'reviews') {
                for(const rev of tran.relationships.reviews.data) {
                    const review = await getReview(rev.id.uuid);
        
                    if(included.filter(obj => review.id.uuid == obj.id.uuid).length == 0) {
                        if(included.filter(obj => review.relationships.subject.data.id.uuid == obj.id.uuid).length == 0) {
                            included.push(await getUserById(review.relationships.subject.data.id.uuid));
                        }
                        if(included.filter(obj => review.relationships.author.data.id.uuid == obj.id.uuid).length == 0) {
                            included.push(await getUserById(review.relationships.author.data.id.uuid));
                        }

                        included.push(review.toObject());
                    }
                }
            }

            if(what == 'booking') {
                if(tran.relationships.booking != undefined && tran.relationships.booking.data != undefined) {
                    included.push(await getBookingById(tran.relationships.booking.data.id.uuid));
                }
            }
        }

        // While not even mentioned in the includes, FTW wants the reviews
        for(const rev of tran.relationships.reviews.data) {
            if(included.filter(obj => rev.id.uuid == obj.id.uuid).length == 0) {
                const review = await getReview(rev.id.uuid);

                if(included.filter(obj => review.relationships.subject.data.id.uuid == obj.id.uuid).length == 0) {
                    included.push(await getUserById(review.relationships.subject.data.id.uuid));
                }

                if(included.filter(obj => review.relationships.author.data.id.uuid == obj.id.uuid).length == 0) {
                    included.push(await getUserById(review.relationships.author.data.id.uuid));
                }

                included.push(review.toObject());
            }
        }

        // While not even mentioned in the includes, FTW wants the messages
        for(const message of tran.relationships.messages.data) {
            if(included.filter(obj => message.id.uuid == obj.id.uuid).length == 0) {
                included.push(await getMessage(message.id.uuid));
            }
        }
    }

    return included;
}

async function calculatePrice(req, transact) {
    var listing = await getListingById(transact.relationships.listing.data.id.uuid);
    var start = req.body.params.bookingStart;
    var end = req.body.params.bookingEnd;
    var units = parseInt((end - start) / (1000 * 60 * 60 * 24), 10);
    var line = new LineItem;

    line.code = 'line-item/day';
    line.quantity = new BigDecimal(units);
    line.units = new BigDecimal(units);
    line.reversal = false;
    line.unitPrice = new Money(listing.attributes.price.amount, 'GBP');
    line.lineTotal = new Money(listing.attributes.price.amount * units, 'GBP');
    line.includeFor = [ 'customer', 'provider' ];

    return line;
}

async function calculateCommission(req, transact, commission) {
    var line = new LineItem;
    
    line.code = 'line-item/provider-commission';
    line.percentage = new BigDecimal(-commission);
    line.reversal = false;
    line.unitPrice = new Money(transact.attributes.payoutTotal.amount, transact.attributes.payoutTotal.currency);
    line.lineTotal = new Money((transact.attributes.payoutTotal.amount * -commission) / 100, transact.attributes.payoutTotal.currency);
    line.includeFor = [ 'provider'];

    return line;
}

async function calculateRefund(req, transact) {
    var listing = await getListingById(transact.relationships.listing.data.id.uuid);
    var booking = await getBookingById(transact.relationships.booking.data.id.uuid);
    var units = parseInt((booking.attributes.end - booking.attributes.start) / (1000 * 60 * 60 * 24), 10);
    var line = new LineItem;

    line.code = 'line-item/day';
    line.reversal = true;
    line.quantity = new BigDecimal(units);
    line.units = new BigDecimal(units);
    line.unitPrice = new Money(listing.attributes.price.amount, transact.attributes.payoutTotal.currency);
    line.lineTotal = new Money(listing.attributes.price.amount * -units, transact.attributes.payoutTotal.currency);
    line.includeFor = [ 'customer', 'provider' ];

    return line;
}

async function calculateRefundCommission(req, transact) {
    var line = new LineItem;

    line.code = 'line-item/provider-commission';
    line.percentage = transact.attributes.lineItems[1].percentage; // HACK
    line.reversal = true;
    line.unitPrice = new Money(transact.attributes.lineItems[1].unitPrice.amount, transact.attributes.payoutTotal.currency);
    line.lineTotal = new Money(transact.attributes.lineItems[1].lineTotal.amount * -1, transact.attributes.payoutTotal.currency);
    line.includeFor = [ 'provider'];

    return line;
}

async function executeTransition(req, transact, transit) {
    var transitLine = new TransitionLine;

    // Create the transition line
    transitLine.transition = transit.attributes.name;
    transitLine.by = transit.attributes.actor[0];
    transitLine.createdAt = new Date();

    // Perform the transit actions...
    for(var i = 0; i < transit.attributes.actions.length; i++) {
        switch(transit.attributes.actions[i]) {
            case 'create-booking': {
                const booking = await createBooking(req, transact)

                // Link to transation
                transact.relationships.booking.data = { id: booking.id, type: booking.type };
                break;
            }
            case 'calculate-tx-daily-total-price': {
                const line = await calculatePrice(req, transact)

                transact.attributes.lineItems.push(line);
                transact.attributes.payinTotal = new Money(line.lineTotal.amount, line.lineTotal.currency);
                transact.attributes.payoutTotal = new Money(line.lineTotal.amount, line.lineTotal.currency);
                break;
            }
            case 'calculate-tx-provider-commission': {
                const line = await calculateCommission(req, transact, transit.attributes.params.req.commission)

                transact.attributes.lineItems.push(line);
                transact.attributes.payoutTotal = new Money(transact.attributes.payinTotal.amount + line.lineTotal.amount, transact.attributes.payinTotal.currency);
                break;
            }
            case 'stripe-create-payment-intent': {
                const paymentIntent = await createPaymentIntent(req, transact);
                const intent = {
                    stripePaymentIntents: {
                        default: {
                            stripePaymentIntentClientSecret: paymentIntent.client_secret,
                            stripePaymentIntentId: paymentIntent.id
                        }
                    } 
                };

                transact.attributes.protectedData = intent;
                break;
            }
            case 'stripe-confirm-payment-intent': {
                // Done in FTW??????
                break;
            } 
            case 'accept-booking': {
                const booking = await acceptBooking(req, transact);           
                break;
            } 
            case 'stripe-capture-payment-intent': {
                const paymentIntent = await capturePaymentIntent(req, transact);
                break;
            } 
            case 'decline-booking': {
                const booking = await declineBooking(req, transact);
                break;
            } 
            case 'calculate-full-refund': {
                const line1 = await calculateRefund(req, transact);
                const line2 = await calculateRefundCommission(req, transact);

                transact.attributes.lineItems.push(line1);
                transact.attributes.lineItems.push(line2);

                transact.attributes.payinTotal = new Money(0, line1.lineTotal.currency);
                transact.attributes.payoutTotal = new Money(0, line1.lineTotal.currency);
                break;
            }            
            case 'stripe-refund-payment': {
                const paymentIntent = await refundPayment(req, transact);
                var intent = { 
                    stripePaymentIntents: {
                        default: {
                            stripePaymentIntentClientSecret: '',
                            stripePaymentIntentId: ''
                        }
                    }
                };

                transact.attributes.protectedData = intent;
                break;
            } 
            case 'stripe-create-payout': {
                const transfer = await transferPayment(req, transact);

                break;
            } 
            case 'post-review-by-customer': {
                var review = await createReview(req, transact, 'ofProvider');

                // Link to transaction
                transact.relationships.reviews.data.push({ id: review.id, type: review.type });
                break;
            } 
            case 'post-review-by-provider': {
                var review = await createReview(req, transact, 'ofCustomer');

                // Link to transaction
                transact.relationships.reviews.data.push({ id: review.id, type: review.type });
                break;
            }
            case 'publish-reviews': {
                for(var j = 0; j < transact.relationships.reviews.data.length; j++) {
                    const i = await publishReview(transact.relationships.reviews.data[j].id)
                }
            }
        }
    }

    return transitLine.toObject();
}

async function transitionState(req, transact) {
    if(transact == undefined)
        transact = await Transaction.findOne({ 'id.uuid': req.body.id.uuid }); 
    var transition = await getTransition(req.body.transition);
    var transitLine = await executeTransition(req, transact, transition);

    // Uppdate the transaction
    transact.attributes.transitions.push(transitLine);
    transact.attributes.lastTransition = req.body.transition;
    transact.attributes.lastTransitionedAt = new Date();

    // Send notification
    sendNotification(transact);

    // Save transaction
    var t = await transact.save();

    return t.toObject();
}

async function createTransaction(req) {
    var listing = await getListingById(req.body.params.listingId.uuid);
    var userId = req.user;
    var transact = new Transaction;
    
    // Initialize transaction 
    transact.id = new UUID(generateGuid());
    transact.relationships.listing.data.id.uuid = req.body.params.listingId.uuid;
    transact.relationships.provider.data.id.uuid = listing.relationships.author.data.id.uuid;
    transact.relationships.customer.data.id.uuid = userId;

    // Set the transition state
    return await transitionState(req, transact)
}

async function getTransactions(req) {
    const sel = getTransSelection(req);

    return await Transaction.find(sel).lean();;
}

export async function getTransactionById(id) {
    return await Transaction.findOne({ 'id.uuid': id });
}

export async function addMessage(id, message)
{
    var tran = await getTransactionById(id);

    tran.relationships.messages.data.push({ id: message.id, type: 'message' })
    
    return await tran.save();
}

// Handle transaction show
function show(req, res) {
    getTransactionById(req.query.id).then(tran => {
        var ret = { data: tran.toObject() };

        if(req.query['include'] != undefined) {
            var trans = [ tran ];

            getIncludes(req, trans).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;

                sendTransit(req, res, ret);
            })
        }
        else {
            sendTransit(req, res, ret);
        }

    })
}

// Handle transaction query
function query(req, res) {
   getTransactions(req).then(trans => {
        var ret = { data: trans };
        
        ret['meta'] = {
            totalItems: trans.length,
            totalPages: 1,
            page: Number(req.query.page) || 1,
            perPage: Number(req.query.per_page) || 100 };
        
        if(req.query['include'] != undefined) {
            getIncludes(req, trans).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;

                sendTransit(req, res, ret);
            })
        }
        else {
            sendTransit(req, res, ret);
        }
   });
};

// Handle transaction initiate
function initiate(req, res) {
    createTransaction(req).then(tran => {
        var ret = { data: tran };
        var trans = [ tran ];

        if(req.query['include'] != undefined) {
            getIncludes(req, trans).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;

                sendTransit(req, res, ret);
            })
        }
        else
            sendTransit(req, res, ret);
    })
};

// Handle initiative speculative HACK
function initiateSpeculative(req, res) {
    getListingById(req.body.params.listingId.uuid).then(listing => {
        var start = req.body.params.bookingStart;
        var end = req.body.params.bookingEnd;
        var units = parseInt((end - start) / (1000 * 60 * 60 * 24), 10);

        var ret = 
        { 
            data: {
                booking: {
                    id: new UUID(generateGuid()),
                    type: 'booking',
                    attributes: {
                      seats: 1,
                      start: req.body.params.bookingStart,
                      end: req.body.params.bookingEnd,
                      displayStart: req.body.params.bookingStart,
                      displayEnd: req.body.params.bookingEnd,
                      state: 'pending'
                    }
                },
                id: new UUID(generateGuid()),
                type: 'transaction',
                attributes: {
                    createdAt: new Date(),
                    processName: 'preauth-with-nightly-booking',
                    processVersion: 3,
                    lastTransition: req.body.transition,
                    lastTransitionedAt: new Date(),
                    payinTotal: new Money(listing.attributes.price.amount * units, 'GBP'),
                    payoutTotal: new Money(listing.attributes.price.amount * units * 0.8, 'GBP'),
                    lineItems: [
                        {
                            code: 'line-item/day',
                            quantity: new BigDecimal(units),
                            units: new BigDecimal(units),
                            seats: 1,
                            reversal: false,
                            unitPrice: new Money(listing.attributes.price.amount, 'GBP'),
                            lineTotal: new Money(listing.attributes.price.amount * units, 'GBP'),
                            includeFor: [
                                'customer',
                                'provider'
                            ]
                        },
                        {
                            code: "line-item/provider-commission",
                            percentage: new BigDecimal(-20.0),
                            reversal: false,
                            unitPrice: new Money(listing.attributes.price.amount * units, 'GBP'),
                            lineTotal: new Money(listing.attributes.price.amount * units * 0.2, 'GBP'),
                            includeFor: [
                                "provider"
                            ]
                        }
                    ],
                    protectedData: {},
                    transitions: [
                        {
                            transition: req.body.transition,
                            createdAt: new Date(),
                            by: 'customer'
                        }
                    ]
                }
            }
        }
        
        sendTransit(req, res, ret)
    });
}

// Handle transaction transition
function transition(req, res) {
    transitionState(req).then(tran => {
        var ret = { data: tran };
        var trans = [ tran ];

        // Include everything
        req.query['include'] = 'reviews,messages'
        getIncludes(req, trans).then(includes => {
            if(includes.length > 0)
                ret['included'] = includes;

            sendTransit(req, res, ret);
        }) 
    })
}

/********************* Integration API ***********************/

function getIntegSelection(req) {
    var sel = {};

    if(req.query.userId != undefined) {
        sel['$or'] = [
            { 'relationships.provider.data.id.uuid': req.query.userId },
            { 'relationships.customer.data.id.uuid': req.query.userId } ];
    }
    else if(req.query.customerId != undefined) {
        sel['relationships.customer.data.id.uuid'] = req.query.customerId;
    }
    else if(req.query.providerId != undefined) {
        sel['relationships.provider.data.id.uuid'] = req.query.providerId;
    }

    if(req.query.listingId != undefined) {
        sel['relationships.listing.data.id.uuid'] = req.query.listingId;
    }

    return sel;
}

function queryall(req, res) {
    const sel = getIntegSelection(req);

    Transaction.find(sel).lean().then(trans => {
        var ret = { data: trans };
        
        ret['meta'] = {
            totalItems: trans.length,
            totalPages: 1,
            page: Number(req.query.page) || 1,
            perPage: Number(req.query.per_page) || 100 
        };
        
        if(req.query['include'] != undefined) {
            getIncludes(req, trans).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;

                sendTransit(req, res, ret);
            })
        }
        else {
            sendTransit(req, res, ret);
        }
    })
}

export default { show, query, queryall, initiate, initiateSpeculative, transition };