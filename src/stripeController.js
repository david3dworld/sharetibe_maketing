import Stripe from 'stripe'; 

import { StripeAccount, StripeCustomer, StripePaymentMethod } from './stripeModel.js';
import { getListingById } from './listingController.js';
import { generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { UUID } from './types.js';
import { updateUser, getUserById } from './userController.js';

async function getIncludes(req, customer) {
    var included = [];

    if(customer.relationships.defaultPaymentMethod != undefined) {
        var paymentMethod = await StripePaymentMethod.findOne({ 'id.uuid': customer.relationships.defaultPaymentMethod.data.id.uuid }).lean();

        included.push(paymentMethod);
        
        return included;
    } else {
        return included;
    }
}

async function fetchAccountHelper(req) {
    var id = req.user;
    var user = await getUserById(id);
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
    var stripeAccount = await StripeAccount.findOne({ 'id.uuid': user.relationships.stripeAccount.data.id.uuid });
    var acc = await stripe.accounts.retrieve(stripeAccount.attributes.stripeAccountId);
    
    stripeAccount.attributes.stripeAccountData = acc;
    var mod = await stripeAccount.save();

    return stripeAccount.toObject();
}

async function createAccountHelper(req) {
    var id = req.user;
    var user = await getUserById(id);

    // Customer exists?
    if(user.relationships != undefined && user.relationships.stripeAccount != undefined) {
        return await StripeAccount.findOne({ 'id.uuid': user.relationships.stripeAccount.data.id.uuid }).lean();
    } else {
        const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
        var stripeAccount = new StripeAccount;
        stripeAccount.id = new UUID(generateGuid());

        // Create actual account
        var acc = await stripe.accounts.create({
            type: 'custom',
            country: req.body.country,
            email: user.attributes.email,
            requested_capabilities: req.body.requestedCapabilities,
            account_token: req.body.accountToken,
            external_account: req.body.bankAccountToken,
            business_profile: {
                mcc: req.body.businessProfileMCC,
                url: req.body.businessProfileURL,
            },
            metadata: {
                'user-id': user.id.uuid,
                'stripe-account-id': stripeAccount.id.uuid
            },
            settings: {
                payouts: {
                    schedule: {
                        interval: 'manual',
                    }
                }
            }
        });

        // Link to ffs object and save
        stripeAccount.attributes.stripeAccountData = acc;
        stripeAccount.attributes.stripeAccountId = acc.id;
        var sa = await stripeAccount.save();

        // Link to current user
        updateUser(user.id.uuid, { 
            'relationships.stripeAccount.data':  { id: stripeAccount.id, type: 'stripeAccount' },
            'attributes.stripeConnected': true,
        });
 
        return stripeAccount.toObject();
    }
}

async function updateAccountHelper(req) {
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
    var id = req.user;
    var user = await getUserById(id);
    var stripeAccount = await StripeAccount.findOne({ 'id.uuid': user.relationships.stripeAccount.data.id.uuid });
    
    var acc = await stripe.accounts.update(stripeAccount.attributes.stripeAccountId, {
        external_account: req.body.bankAccountToken,
        requested_capabilities: req.body.requestedCapabilities,
    });

    stripeAccount.attributes.stripeAccountData = acc;
    var mode = await stripeAccount.save();

    return stripeAccount.toObject();
}

async function createAccountLinkHelper(req) {
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
    var id = req.user;
    var user = await getUserById(id);
    var stripeAccount = await StripeAccount.findOne({ 'id.uuid': user.relationships.stripeAccount.data.id.uuid });

    var link = await stripe.accountLinks.create( {
        account: stripeAccount.attributes.stripeAccountId,
        failure_url: req.body.failureURL,
        success_url: req.body.successURL,
        type: req.body.type,
    });

    return({
        id: new UUID(generateGuid()),
        type: 'stripeAccountLink',
        attributes: {
            url: link.url,
            expiresAt: new Date(link.expires_at * 1000).toISOString(),
        }
    });
}

async function createCustomerHelper(req) {
    var user = await getUserById(req.user);

    // Customer exists?
    if(user.relationships.stripeCustomer != undefined) {
        return await StripeCustomer.findOne({ 'id.uuid': user.relationships.stripeCustomer.data.id.uuid }).lean();
    } else {
        const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
        var paymentMethod = await stripe.paymentMethods.retrieve(req.body.stripePaymentMethodId);

        // Create payment method object
        var stripePaymentMethod = new StripePaymentMethod;
        stripePaymentMethod.id = new UUID(generateGuid());
        stripePaymentMethod.attributes.stripePaymentMethodId = paymentMethod.id;
        stripePaymentMethod.attributes.card = {
            brand: paymentMethod.card.brand,
            last4Digits: paymentMethod.card.last4,
            expirationYear: paymentMethod.card.exp_year,
            expirationMonth: paymentMethod.card.exp_month,
        };
        var pm = await stripePaymentMethod.save();

        // Create customer object
        var stripeCustomer = new StripeCustomer;
        stripeCustomer.id = new UUID(generateGuid());

        var customer = await stripe.customers.create({
            payment_method: paymentMethod.id,
            email: user.attributes.email,
            name: user.attributes.profile.firstName + ' ' + user.attributes.profile.lastName,
            metadata: {
                'user-id': user.id.uuid,
                'stripe-customer-id': stripeCustomer.id.uuid
            }
        });

        stripeCustomer.attributes.stripeCustomerId = customer.id;
        stripeCustomer.relationships =  { 
                                            defaultPaymentMethod: {
                                                data: {
                                                    id: new UUID(stripePaymentMethod.id.uuid),
                                                    type: 'stripePaymentMethod'
                                                }
                                            }
                                        };
        var c = await stripeCustomer.save();

        // Link customer to current user
        updateUser(user.id.uuid, { 'relationships.stripeCustomer.data':  { id: stripeCustomer.id, type: 'stripeCustomer' }});

        return stripeCustomer.toObject();
    }
}

async function addPaymentMethodHelper(req) {
    var user = await getUserById(req.user);

    // Customer exists?
    if(user.relationships.stripeCustomer != undefined) {
        const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
        var stripeCustomer = await StripeCustomer.findOne({ 'id.uuid': user.relationships.stripeCustomer.data.id.uuid });
        var paymentMethod = await stripe.paymentMethods.retrieve(req.body.stripePaymentMethodId);
              
        try {
            var c = await stripe.paymentMethods.attach( paymentMethod.id, { customer: stripeCustomer.attributes.stripeCustomerId });
        }
        catch(err) {
            var x = 22;
        }

        // Create payment method object
        var stripePaymentMethod = new StripePaymentMethod;
        stripePaymentMethod.id = new UUID(generateGuid());
        stripePaymentMethod.attributes.stripePaymentMethodId = paymentMethod.id;
        stripePaymentMethod.attributes.card = {
            brand: paymentMethod.card.brand,
            last4Digits: paymentMethod.card.last4,
            expirationYear: paymentMethod.card.exp_year,
            expirationMonth: paymentMethod.card.exp_month,
        };
        var pm = await stripePaymentMethod.save();
        var args = {
            data: {
                id: stripePaymentMethod.id,
                type: 'stripePaymentMethod'
            }
        };

        var c = await StripeCustomer.updateOne({ 'id.uuid': stripeCustomer.id.uuid }, { 'relationships.defaultPaymentMethod': args } );

        return await StripeCustomer.findOne({ 'id.uuid': stripeCustomer.id.uuid }).lean();
    } 
}

async function deletePaymentMethodHelper(req)
{
    var user = await getUserById(req.user);

    // Customer exists?
    if(user.relationships.stripeCustomer != undefined) {
        const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
        var stripeCustomer = await StripeCustomer.findOne({ 'id.uuid': user.relationships.stripeCustomer.data.id.uuid });
        var stripePaymentMethod = await StripePaymentMethod.findOne({ 'id.uuid': stripeCustomer.relationships.defaultPaymentMethod.data.id.uuid });

        try {
            var pm = await stripe.paymentMethods.detach(stripePaymentMethod.attributes.stripePaymentMethodId);
        }
        catch(err) {
            var x = 22;
        }

        var c = await StripeCustomer.updateOne({ 'id.uuid': stripeCustomer.id.uuid }, { $unset: { 'relationships.defaultPaymentMethod': 1 }} )

        return await StripeCustomer.findOne({ 'id.uuid': stripeCustomer.id.uuid }).lean();
    }
}

export async function getStripeAccount(id) {
    return await StripeAccount.findOne({ 'id.uuid': id.uuid }).lean();
}

export async function getStripeCustomer(id) {
    return await StripeCustomer.findOne({ 'id.uuid': id.uuid }).lean();
}

export async function getStripePaymentMethod(id) {
    return await StripePaymentMethod.findOne({ 'id.uuid': id.uuid }).lean();
}

export async function createPaymentIntent(req, transact) {
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
    var listing = await getListingById(transact.relationships.listing.data.id.uuid);
    var args = {
        amount: transact.attributes.payinTotal.amount,
        currency: transact.attributes.payinTotal.currency,
        payment_method_types: ['card'],
        capture_method: 'manual',
        description: listing.attributes.title,
        statement_descriptor: 'OldenCars',
        metadata: {
            'transaction-id': transact.id.uuid
        }
    }

    // See if the customer has a payment method 
    var customer = await getUserById(transact.relationships.customer.data.id.uuid);
    if(customer.relationships !== undefined && customer.relationships.stripeCustomer !== undefined) {
        var stripeCustomer = await getStripeCustomer(customer.relationships.stripeCustomer.data.id);
        var stripePaymentMethod = await getStripePaymentMethod(stripeCustomer.relationships.defaultPaymentMethod.data.id);

        args['payment_method'] = stripePaymentMethod.attributes.stripePaymentMethodId;
        args['customer'] = stripeCustomer.attributes.stripeCustomerId;
    }

    // Create the stripe paymentIntent ids
    return await stripe.paymentIntents.create(args);
}

export async function capturePaymentIntent(req, transact) {
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

    return await stripe.paymentIntents.capture(
        transact.attributes.protectedData.stripePaymentIntents.default.stripePaymentIntentId);
}

export async function refundPayment(req, transact) {
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

    return await stripe.paymentIntents.cancel(transact.attributes.protectedData.stripePaymentIntents.default.stripePaymentIntentId);
}

export async function transferPayment(req, transact) {
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);
    const pi = await stripe.paymentIntents.retrieve(transact.attributes.protectedData.stripePaymentIntents.default.stripePaymentIntentId);
    const provider = await getUserById(transact.relationships.provider.data.id.uuid);
    const listing = await getListingById(transact.relationships.listing.data.id.uuid);
    const stripeAccount = await StripeAccount.findOne({'id.uuid': provider.relationships.stripeAccount.data.id.uuid})

    return await stripe.transfers.create(
        {
          amount: transact.attributes.payoutTotal.amount,
          currency: transact.attributes.payoutTotal.currency,
          source_transaction: pi.charges.data[0].id,
          destination: stripeAccount.attributes.stripeAccountId,
          description: listing.attributes.title,
          metadata: {
              'transaction-id': transact.id.uuid
          }
        });
}

// Stripe fetch account 
function fetchAccount(req, res) {
    fetchAccountHelper(req).then(account => {
        var ret = { data: account };

        sendTransit(req, res, ret);
    });
}

// Stripe create account 
function createAccount(req, res) {
    createAccountHelper(req).then(account => {
        var ret = { data: account };

        sendTransit(req, res, ret);
    });
}

// Stripe update account 
function updateAccount(req, res) {
    updateAccountHelper(req).then(account => {
        var ret = { data: account };

        sendTransit(req, res, ret);
    });
}

// Stripe create account link
function createAccountLink(req, res) {
    createAccountLinkHelper(req).then(accountLink => {
        var ret = { data: accountLink };

        sendTransit(req, res, ret);
    }); 
}

// Stripe create person
function createPerson(req, res) {
    var ret =  { 
        data: {
            id: new UUID(generateGuid()),
            type: "stripeSetupIntent",
            attributes: {
                stripeSetupIntentId: "seti_1Ewp1XXXXXXGQQ9xoFZb4Ypn",
                clientSecret: "seti_1Ewp1SLSea1GQQ9xoFZb4Ypn_secret_foo"
            }
        }
    };

    sendTransit(req, res, ret);
}

// Stripe setup intent create
function createSetupIntent(req, res) {
    const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

    stripe.setupIntents.create({ payment_method_types: ['card']}).then(setupIntent => {
        var ret =  { 
            data: {
                id: new UUID(generateGuid()),
                type: 'stripeSetupIntent',
                attributes: {
                    stripeSetupIntentId: setupIntent.id,
                    clientSecret: setupIntent.client_secret
                }
            }
        };

        sendTransit(req, res, ret);
    });
}

// Stripe create customer
function createCustomer(req, res) {
    createCustomerHelper(req).then(customer => {
        var ret = { data: customer };

        if(req.query['include'] != undefined) {
            getIncludes(req, customer).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;
                
                sendTransit(req, res, ret);
            })
        } else {
            sendTransit(req, res, ret);
        }
    });
}

// Stripe add payment method
function addPaymentMethod(req, res) {
    addPaymentMethodHelper(req).then(customer => {
        var ret = { data: customer };

        sendTransit(req, res, ret);
    });
}

// Stripe delete payment method
function deletePaymentMethod(req, res) {
    deletePaymentMethodHelper(req).then(customer => {
        var ret = { data: customer };

        sendTransit(req, res, ret);
    });
}

export default { fetchAccount, createAccount, updateAccount, createAccountLink, createPerson, createSetupIntent, createCustomer, addPaymentMethod, deletePaymentMethod };