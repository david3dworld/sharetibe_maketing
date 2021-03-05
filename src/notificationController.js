import sgMail from '@sendgrid/mail';
import template from 'lodash.template'

import { Notification } from './notificationModel.js';
import { getUserById } from './userController.js';
import { getListingById } from './listingController.js';
import { generateGuid } from './util.js';
import { UUID } from './types.js';

async function populateCollection() {
    var notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/enquiry';
    notification.attributes.on = 'transition/enquire';
    notification.attributes.to = [ 'provider' ];
    notification.attributes.subject = 'OldenCars enquiry';
    notification.attributes.message = 'You have an enquiry from ${ customer.attributes.profile.firstName } for your \'${ listing.attributes.title }\'.';
    notification.attributes.template = 'd-b60864c62b9f48e1bff0e6413f87e8a6';
    await notification.save();
    
    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/confirm-payment';
    notification.attributes.on = 'transition/confirm-payment';
    notification.attributes.to = [ 'provider' ];
    notification.attributes.subject = 'OldenCars booking request';
    notification.attributes.message = 'You have a booking request from ${ customer.attributes.profile.firstName } for your \'${ listing.attributes.title }\'. Please respond as soon as possible.';
    notification.attributes.template = 'd-c717de2936b54d108a706d0f5b7da99c';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/new-booking-request2';
    notification.attributes.on = 'transition/confirm-payment';
    notification.attributes.to = [ 'operator' ];
    notification.attributes.subject = 'New booking request';
    notification.attributes.message = '${ customer.attributes.profile.firstName } requested \'${ listing.attributes.title }\' from ${ provider.attributes.profile.firstName }';
    notification.attributes.template = 'd-c717de2936b54d108a706d0f5b7da99c';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/booking-request-accepted';
    notification.attributes.on = 'transition/accept';
    notification.attributes.to = [ 'customer'];
    notification.attributes.subject = 'OldenCars booking accepted';
    notification.attributes.message = '${ provider.attributes.profile.firstName } has accepted your booking request.';
    notification.attributes.template = 'd-c717de2936b54d108a706d0f5b7da99c';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/booking-request-declined';
    notification.attributes.on = 'transition/decline';
    notification.attributes.to = [ 'customer'];
    notification.attributes.subject = 'OldenCars booking declined';
    notification.attributes.message = '${ provider.attributes.profile.firstName } has declined your booking request.';
    notification.attributes.template = 'd-c717de2936b54d108a706d0f5b7da99c';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/booking-request-auto-declined';
    notification.attributes.on = 'transition/expire';
    notification.attributes.to = [ 'customer'];
    notification.attributes.subject = 'OldenCars booking expired';
    notification.attributes.message = 'Your request for \'${ listing.attributes.title }\' has expired';
    notification.attributes.template = 'd-c717de2936b54d108a706d0f5b7da99c';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/money-paid';
    notification.attributes.on = 'transition/complete';
    notification.attributes.to = [ 'provider'];
    notification.attributes.subject = 'OldenCars booking completed';
    notification.attributes.message = 'The booking for \'${ listing.attributes.title }\' is complete. ';
    notification.attributes.template = 'd-057f1f31cfcf43a781cfb084dfb4efe3';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/review-period-start-provider';
    notification.attributes.on = 'transition/complete';
    notification.attributes.to = [ 'provider'];
    notification.attributes.subject = 'OldenCars review invited...';
    notification.attributes.message = '${ customer.attributes.profile.firstName } is waiting for your review. ';
    notification.attributes.template = 'd-057f1f31cfcf43a781cfb084dfb4efe3';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/review-period-start-customer';
    notification.attributes.on = 'transition/complete';
    notification.attributes.to = [ 'customer'];
    notification.attributes.subject = 'OldenCars review invited...';
    notification.attributes.message = '${ provider.attributes.profile.firstName } is waiting for your review. ';
    notification.attributes.template = 'd-057f1f31cfcf43a781cfb084dfb4efe3';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/review-by-provider-first';
    notification.attributes.on = 'transition/review-1-by-provider';
    notification.attributes.to = [ 'customer'];
    notification.attributes.subject = 'OldenCars review submitted, your turn...';
    notification.attributes.message = '${ provider.attributes.profile.firstName } has left a review. Post your review to see it. ';
    notification.attributes.template = 'd-057f1f31cfcf43a781cfb084dfb4efe3';
    await notification.save();

    notification = new Notification;      
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/review-by-customer-first';
    notification.attributes.on = 'transition/review-1-by-customer';
    notification.attributes.to = [ 'provider'];
    notification.attributes.subject = 'OldenCars review submitted, your turn...';
    notification.attributes.message = '${ customer.attributes.profile.firstName } has left a review. Post your review to see it. ';
    notification.attributes.template = 'd-057f1f31cfcf43a781cfb084dfb4efe3';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/review-by-provider-second';
    notification.attributes.on = 'transition/review-2-by-provider,';
    notification.attributes.to = [ 'customer'];
    notification.attributes.subject = 'OldenCars review published';
    notification.attributes.message = 'Your review has been published';
    notification.attributes.template = 'd-057f1f31cfcf43a781cfb084dfb4efe3';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/review-by-provider-second2';
    notification.attributes.on = 'transition/review-2-by-provider,';
    notification.attributes.to = [ 'provider'];
    notification.attributes.subject = 'OldenCars review published';
    notification.attributes.message = 'Your review has been published';
    notification.attributes.template = 'd-057f1f31cfcf43a781cfb084dfb4efe3';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/review-by-customer-second';
    notification.attributes.on = 'transition/review-2-by-customer';
    notification.attributes.to = [ 'provider'];
    notification.attributes.subject = 'OldenCars review published';
    notification.attributes.message = 'Your review has been published';
    notification.attributes.template = 'd-057f1f31cfcf43a781cfb084dfb4efe3';
    await notification.save();

    notification = new Notification;
    notification.id = new UUID(generateGuid()); 
    notification.attributes.name = 'notification/review-by-customer-second2';
    notification.attributes.on = 'transition/review-2-by-customer';
    notification.attributes.to = [ 'customer'];
    notification.attributes.subject = 'OldenCars review published';
    notification.attributes.message = 'Your review has been published';
    notification.attributes.template = 'd-057f1f31cfcf43a781cfb084dfb4efe3';
    await notification.save();

    return 1;
}

export async function initNotifications() {
    Notification.find({}).then(res => {
        if(res.length == 0) {
            populateCollection().then(x => {
                return x;
            })
        }
    })
}

export async function sendNotification(transact) {
    const provider = await getUserById(transact.relationships.provider.data.id.uuid);
    const customer = await getUserById(transact.relationships.customer.data.id.uuid);
    const listing = await getListingById(transact.relationships.listing.data.id.uuid);
    const notes = await Notification.find({ 'attributes.on' : transact.attributes.lastTransition });

    for(const note of notes) {
        const compiled = template(note.attributes.message);
        const msg = {
            from: 'OldenCars <support@oldencars.co.uk>',
            to: '',
            subject: note.attributes.subject,
            templateId: note.attributes.template,
            dynamic_template_data: {
                message: compiled({'listing': listing, 'customer': customer, 'provider': provider}),
            },
        };
        var sep = '';

        for(const to of note.attributes.to) {
            if(to == 'provider')
                msg.to = msg.to + sep + provider.attributes.email;
            if(to == 'customer')
                msg.to = msg.to + sep + customer.attributes.email;
            if(to == 'system')
                msg.to = msg.to + sep + 'sales@oldencars.com';
            if(to == 'operator')
                msg.to = msg.to + sep + 'support@oldencars.com';
            sep = ','
        }

        sgMail.setApiKey(process.env.SENDGRID_API_KEY);
        sgMail.send(msg)
        .then(() => {
            var v=22;
        })
        .catch(error => {
            console.error(error);

            if (error.response) {
                const {message, code, response} = error;
                const {headers, body} = response;
                
                console.error(body);
            }
        });
    }
}

export async function sendNewUserNotification(email) {
    const msg = {
        from: 'OldenCars <support@oldencars.co.uk>',
        to: 'admin@oldencars.com',
        subject: 'New User',
        templateId: 'd-d0ded9102ce246d98653ebab0bfd38cd',
        dynamic_template_data: {
            message: email,
        },
    };

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sgMail.send(msg)
    .then(() => {
        var v=22;
    })
    .catch(error => {
        console.error(error);

        if (error.response) {
            const {message, code, response} = error;
            const {headers, body} = response;
            
            console.error(body);
        }
    });
}

export async function sendNewListingNotification(email) {
    const msg = {
        from: 'OldenCars <support@oldencars.co.uk>',
        to: 'admin@oldencars.com',
        subject: 'New Listing',
        templateId: 'd-e0271133984a487c9b50371a0dc69213',
        dynamic_template_data: {
            message: email,
        },
    };

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sgMail.send(msg)
    .then(() => {
        var v=22;
    })
    .catch(error => {
        console.error(error);

        if (error.response) {
            const {message, code, response} = error;
            const {headers, body} = response;
            
            console.error(body);
        }
    });
}

 