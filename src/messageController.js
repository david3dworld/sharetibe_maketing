import { Message } from './messageModel.js';
import { getUserById } from './userController.js';
import { getTransactionById, addMessage } from './transactionController.js';
import { getStripeAccount, getStripeCustomer, getStripePaymentMethod } from './stripeController.js';
import { getImage } from './imageController.js';
import { generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { UUID } from './types.js';

async function getIncludes(req, messages) {
    var included = [];
    var includes = req.query['include'];
    var what = includes.split(',')

    if(what[0] == 'sender') {
        for(const message of messages) {
            const user = await getUserById(message.relationships.sender.data.id.uuid);

            if(included.filter(obj => user.id.uuid == obj.id.uuid).length == 0) {
                if(what[1] == 'sender.profileImage' && user.relationships != undefined && user.relationships.profileImage != undefined && user.relationships.profileImage != null &&
                                        user.relationships.profileImage.data != undefined && user.relationships.profileImage.data != null) {
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

    return included;
}

export async function getMessage(id) {
    return await Message.findOne({'id.uuid': id}).lean();;
}

async function getMessages(tranId) {
    var messages = [];
    var tran = await getTransactionById(tranId);

    for(const message of tran.relationships.messages.data)
        messages.push(await getMessage(message.id.uuid));

    return messages;
}

// Handle message send
function send(req, res) {
    var message = new Message;

    message.id = new UUID(generateGuid());
    message.attributes.content = req.body.content;
    message.relationships.sender.data.id.uuid = req.user;

    message.save().then(res2 => {
        addMessage(req.body.transactionId.uuid, message).then(tran => {
            sendTransit(req, res, { data: res2.toObject() });
        });
    });
};

// Handle message query
function query(req, res) {
    getMessages(req.query.transaction_id).then(messages => {
        var ret = {};
        
        ret['meta'] = {
            totalItems: messages.length,
            totalPages: 1,
            page: 1,
            perPage: Number(req.query.per_page) };
        ret['data'] = messages;

        if(req.query['include'] != undefined) {
            getIncludes(req, messages).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;

                sendTransit(req, res, ret);
            })
        }
        else
            sendTransit(req, res, ret);
    })
}

export default { send, query };