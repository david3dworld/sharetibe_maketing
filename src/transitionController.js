import { getTransactionById } from './transactionController.js'
import { Transition } from './transitionModel.js';
import { generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { UUID } from './types.js';

async function populateCollection() {
    var transition = new Transition;
    
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/enquire';
    transition.attributes.actor = [ 'customer' ];
    transition.attributes.actions = [ ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    },
    transition.attributes.to = 'state/enquiry';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/request-payment';
    transition.attributes.actor = [ 'customer' ];
    transition.attributes.actions = [ 'create-booking', 
                                      'calculate-tx-daily-total-price',
                                      'calculate-tx-provider-commission',
                                      'stripe-create-payment-intent'];
    transition.attributes.params = { 
        req: {
            observe_availability: true,
            commission: 20 
        }, 
        opt: null 
    };
    transition.attributes.to = 'state/pending-payment';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/request-payment-after-enquiry';
    transition.attributes.actor = [ 'customer' ];
    transition.attributes.actions = [ 'create-booking', 
                                      'calculate-tx-daily-total-price',
                                      'calculate-tx-provider-commission',
                                      'stripe-create-payment-intent'];
    transition.attributes.params = { 
        req: {
            observe_availability: true,
            commission: 20 
        }, 
        opt: null 
    };
    transition.attributes.from = 'state/enquiry';
    transition.attributes.to = 'state/pending-payment';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/expire-payment';
    transition.attributes.actor = [ 'system' ];
    transition.attributes.actions = [ 'decline-booking', 
                                      'calculate-full-refund',
                                      'stripe-refund-payment' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/pending-payment';
    transition.attributes.to = 'state/payment-expired';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/confirm-payment';
    transition.attributes.actor = [ 'customer' ];
    transition.attributes.actions = [ 'stripe-confirm-payment-intent' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/pending-payment';
    transition.attributes.to = 'state/preauthorized';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/accept';
    transition.attributes.actor = [ 'provider' ];
    transition.attributes.actions = [ 'accept-booking',
                                      'stripe-capture-payment-intent' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/confirm-payment'; // was preauthorized;
    transition.attributes.to = 'state/accepted';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/decline';
    transition.attributes.actor = [ 'provider' ];
    transition.attributes.actions = [ 'decline-booking',
                                      'calculate-full-refund',
                                      'stripe-refund-payment' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/confirm-payment'; // was preauthorized
    transition.attributes.to = 'state/declined';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/expire';
    transition.attributes.actor = [ 'system' ];
    transition.attributes.actions = [ 'decline-booking',
                                      'calculate-full-refund',
                                      'stripe-refund-payment' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/confirm-payment'; // was preauthorized
    transition.attributes.to = 'state/declined';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/complete';
    transition.attributes.actor = [ 'system' ];
    transition.attributes.actions = [ 'stripe-create-payout' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/accepted';
    transition.attributes.to = 'state/delivered';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/cancel';
    transition.attributes.actor = [ 'operator' ];
    transition.attributes.actions = [ 'cancel-booking',
                                      'calculate-full-refund',
                                      'stripe-refund-payment' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/accepted';
    transition.attributes.to = 'state/cancelled';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/review-1-by-provider';
    transition.attributes.actor = [ 'provider' ];
    transition.attributes.actions = [ 'post-review-by-provider' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/delivered';
    transition.attributes.to = 'state/reviewed-by-provider';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/review-2-by-provider';
    transition.attributes.actor = [ 'provider' ];
    transition.attributes.actions = [ 'post-review-by-provider',
                                      'publish-reviews' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/reviewed-by-provider';
    transition.attributes.to = 'state/reviewed';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/review-1-by-customer';
    transition.attributes.actor = [ 'customer' ];
    transition.attributes.actions = [ 'post-review-by-customer' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/delivered';
    transition.attributes.to = 'state/reviewed-by-customer';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/review-2-by-customer';
    transition.attributes.actor = [ 'customer' ];
    transition.attributes.actions = [ 'post-review-by-customer',
                                      'publish-reviews' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/reviewed-by-provider';
    transition.attributes.to = 'state/reviewed';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/expire-review-period';
    transition.attributes.actor = [ 'system' ];
    transition.attributes.actions = [  ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/delivered';
    transition.attributes.to = 'state/reviewed';
    await transition.save();

    transition = new Transition;
    transition.id = new UUID(generateGuid()); 
    transition.attributes.name = 'transition/expire-customer-review-period';
    transition.attributes.actor = [ 'system' ];
    transition.attributes.actions = [ 'publish-reviews' ];
    transition.attributes.params = { 
        req: null,
        opt: null 
    };
    transition.attributes.from = 'state/reviewed-by-provider';
    transition.attributes.to = 'state/reviewed';
    await transition.save();

    return 1;
}

async function getNextTransitions(from)
{
    return await Transition.find({ 'attributes.from': 'state/' + from.slice(11,) }).lean();
}

export async function initTransitions() {
    Transition.find({}).then(res => {
        if(res.length == 0) {
            populateCollection().then(x => {
                return x;
            })
        }
    })
}

export async function getTransition(from) {
    return await Transition.findOne({ 'attributes.name': from })
}

// Handle transition query
function query(req, res) {
    var ret = {}
    var meta = {
        totalItems: 0,
        totalPages: 1,
        page: 1,
        perPage: 100
    }; 

    ret['meta'] = meta;

    if(req.query.transactionId != undefined) {
        getTransactionById(req.query.transactionId).then(tran => {
            getNextTransitions(tran.attributes.lastTransition).then(trans => {
                ret['meta'].totalItems = trans.length;
                ret['data'] = trans;

                sendTransit(req, res, ret)
            })
        });
    } else if(req.query.lastTransition != undefined) {
        getNextTransitions(lastTransition).then(trans => {
            ret['meta'].totalItems = trans.length;
            ret['data'] = trans;

            sendTransit(req, res, ret)
        })
    }
};

export default { initTransitions, query };