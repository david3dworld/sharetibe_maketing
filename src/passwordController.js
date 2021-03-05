import sgMail from '@sendgrid/mail';
import template from 'lodash.template';

import { User } from './userModel.js';
import { generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { Password } from './passwordModel.js';
import { UUID } from './types.js';

async function sendEmail(user, token) {
    const message = 'Hi ${ user.attributes.profile.firstName },<br><br>You have indicated that you have forgotten your OldenCars password. Click the following link to reset your password:<br><br>${ link }<br><br>If you don\'t use this link within 1 hour, it will expire. You can request a new password reset link, if you need to.<br><br>If you didn\'t request this, please ignore this email. Your password won\'t be changed until you use the link above to set a new one.';
    const link = 'https://oldencars.com/reset-password?t=' + token + '&e=' + user.attributes.email;
    const compiled = template(message);
    const msg = {
        from: 'OldenCars <support@oldencars.co.uk>',
        to: user.attributes.email,
        subject: 'OldenCars password reset',
        templateId: 'd-74fefb2b2aa040268ec8be0eb12bb4b6',
        dynamic_template_data: {
            message: compiled({'user': user, 'link': link}),
        },
    };

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    return await sgMail.send(msg);
}

async function requestHelper(req) {
    const user = await User.findOne({'attributes.email': req.body.email});

    if(user != null) {
        var r = new Password;
        
        r.id = new UUID(generateGuid());
        r.user = user.id.uuid;
        const r2 = await r.save();

        const e = await sendEmail(user, r.id.uuid)

        return await Password.findOne({'user': user.id.uuid}, { id: 1, type: 1}).lean();
    }
    else {
        return Promise.reject(new Error('No such email'));
    }
}

async function resetHelper(req) {
    const pass = await Password.findOne({'id.uuid': req.body.passwordResetToken}, { id: 1, type: 1}).lean();

    if(pass != null) {
        var user = await User.findOne({'attributes.email': req.body.email})

        user.passwordHash = req.body.newPassword;
        const u = await user.save();

        return Promise.resolve(pass);
    }
    else {
        return Promise.reject(new Error('Invalid token'));
    }
}

function request(req, res) {
    requestHelper(req).then(token => {
        const ret = { data: token };

        sendTransit(req, res, ret);
    }).catch(e => {
        const errors = [
            {
                code: 'email-not-found',
                id: new UUID(generateGuid()),
                status: 409,
                title: 'Email not found'
            }
        ];

        res.status(409);
        sendTransit(req, res, { errors: errors })
    })
}

function reset(req, res) {
    resetHelper(req).then(token => {
        const ret = { data: token };

        sendTransit(req, res, ret);
    }).catch(e => {
        const errors = [
            {
                code: 'Invalid-token',
                id: new UUID(generateGuid()),
                status: 403,
                title: 'Invalid token'
            }
        ];

        res.status(403);
        sendTransit(req, res, { errors: errors })
    })
}

export default { reset, request };