import { User } from './userModel.js';
import { getImage } from './imageController.js';
import { getStripeAccount, getStripeCustomer, getStripePaymentMethod } from './stripeController.js';
import { sendNewUserNotification } from './notificationController.js';
import { getPaging, generateGuid } from './util.js';
import { sendTransit } from './sdk.js';
import { UUID } from './types.js';

function getUpdates(req, user) {
    var updates = {};

    if(req.body.protectedData != undefined) 
        updates['attributes.profile.protectedData'] = Object.assign(user.attributes.profile.protectedData, req.body.protectedData);
    if(req.body.publicData != undefined) 
        updates['attributes.profile.publicData'] = Object.assign(user.attributes.profile.publicData, req.body.publicData);
    if(req.body.privateData != undefined) 
        updates['attributes.profile.privateData'] = Object.assign(user.attributes.profile.privateData, req.body.privateData);
    if(req.body.metadata != undefined) 
        updates['attributes.profile.metadata'] = Object.assign(user.attributes.profile.metadata, req.body.metadata);
    if(req.body.firstName != undefined)
        updates['attributes.profile.firstName'] = req.body.firstName;
    if(req.body.lastName != undefined)
        updates['attributes.profile.lastName'] = req.body.lastName;
    if(req.body.displayName != undefined)
        updates['attributes.profile.displayName'] = req.body.displayName;
    if(req.body.bio != undefined)
        updates['attributes.profile.bio'] = req.body.bio;
    if(req.body.profileImageId != undefined)
        updates['relationships.profileImage.data'] = { id: req.body.profileImageId, type: 'image' };
    if(req.body.deleted != undefined)
        updates['attributes.deleted'] = req.body.deleted;
    if(req.body.banned != undefined)
        updates['attributes.banned'] = req.body.banned;
    
    return updates;
}

function getUserProjection(query) {
    var projection = {};

    if(query['fields.user'] != undefined) {
        var fields = query['fields.user'].split(',');

        for(const field of fields) {
            projection['attributes.' + field] = 1;
        }
    }

    if(query['password'] != undefined) {
        projection['password'] = 1;
    }

    if (query['include'] != undefined) {
        projection['relationships'] = 1;
    }
        
    // If any projection has been specified, FTW also wants id and type
    if (Object.keys(query).length != 0) {
        projection['id'] = 1;
        projection['type'] = 1;
        projection['attributes'] = 1;
    }

    return projection; 
}

function getUserSelection(query) {
    var sel = {};

    if(query['id'] != undefined) {
        sel['id.uuid'] = query['id'];
    };

    return sel;
}

async function getIncludes(req, users) {
    var included = [];

    for(const user of users) {
        // Always include stripeAccount even if not in the include query
        if(user.relationships != undefined && user.relationships.stripeAccount != undefined) {
            included.push(await getStripeAccount(user.relationships.stripeAccount.data.id));
        }

        // Always include stripeCustomer even if not in the include query (else FTW borks)
        if(user.relationships != undefined && user.relationships.stripeCustomer != undefined) {
            let cust = await getStripeCustomer(user.relationships.stripeCustomer.data.id);

            if(cust.relationships.defaultPaymentMethod != undefined) {
                included.push(await getStripePaymentMethod(cust.relationships.defaultPaymentMethod.data.id));
            }

            included.push(cust);
        }

        // Always include profileImage even if not in the include query (else FTW borks)
        if(user.relationships != undefined && user.relationships.profileImage != undefined &&
                    user.relationships.profileImage.data != undefined && user.relationships.profileImage.data != null) {
            included.push(await getImage(req.query, user.relationships.profileImage.data.id.uuid));
        }
    }

    return included;
}

export async function getUserById(id) {
    return await User.findOne({ 'id.uuid': id }).lean();  
}

export async function getUser(query) {
    var sel = getUserSelection(query)
    var projection = getUserProjection(query);
    var paging = getPaging(query);

    return await User.findOne(sel, projection, paging).lean();
}

export async function updateUser(id, updates) {
    return await User.updateOne({'id.uuid': id}, updates);
}

function show(req, res) {
    getUser(req.query).then(user => {
        var ret = { data: user };
    
        ret['meta'] = {
            totalItems: 1,
            totalPages: 1,
            page: 1,
            perPage: 1 };

        if(req.query['include'] != undefined) {
            const users = [ user ];

            getIncludes(req, users).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;

                sendTransit(req, res, ret);
            })
        }
        else
            sendTransit(req, res, ret);
    })
};

function currentShow(req, res) {
    var newquery = Object.assign({}, req.query);

    newquery['id'] = req.user; 
    newquery['fields.user'] = 'profile,email,emailVerified,banned';
    getUser(newquery).then(user => {
        var ret = { data: user };
    
        ret['data'].type = 'currentUser';
        ret['meta'] = {
            totalItems: 1,
            totalPages: 1,
            page: 1,
            perPage: 1 };

        if(req.query['include'] != undefined) {
            const users = [ user ];

            getIncludes(req, users).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;

                sendTransit(req, res, ret);
            })
        }
        else
            sendTransit(req, res, ret);
    })
    .catch(err => {
        res.status(500);
            sendTransit(req, res, { errors: [ 
                { id: new UUID('5e57af67-b849-49e1-9dc9-eea05b469760'), 
                  status: 500, 
                  code: 'exception', 
                  title: 'exception'  }
            ]});
    })
};

// Handle create user
function create(req, res) {
    User.findOne( { 'attributes.email': req.body.email, 'attributes.deleted': false }).then(existing => {
        if(existing == null) {
            var user = new User;

            user.id = new UUID(generateGuid());
            user.attributes.email = req.body.email;
            user.attributes.banned = false;
            user.attributes.deleted = false;
            user.attributes.emailVerified = true;
            user.attributes.pendingEmail = null;
            user.attributes.profile.firstName = req.body.firstName;
            user.attributes.profile.lastName = req.body.lastName;
            user.attributes.profile.abbreviatedName = req.body.firstName.toUpperCase()[0] + req.body.lastName.toUpperCase()[0];
            if(req.body.displayName == undefined) 
                user.attributes.profile.displayName = req.body.firstName;
            else
                user.attributes.profile.displayName = req.body.displayName;
            user.attributes.profile.bio = req.body.bio;
            user.attributes.profile.publicData = req.body.publicData;
            user.attributes.profile.protectedData = req.body.protectedData;
            user.attributes.profile.privateData = req.body.privateData;
            user.passwordHash = req.body.password;

            user.save().then(result => {
                console.log('profile created: (', user.attributes.email, '): ', result);

                // Inform admin
                sendNewUserNotification(req.body.email);

                user.type = 'currentUser'
                sendTransit(req, res, { data: user.toObject() }); 
            })
        }
        else {
            res.status(409);
            sendTransit(req, res, { errors: [
                { id: new UUID('5e57af67-b849-49e1-9dc9-eea05b469760'), 
                  status: 409, 
                  code: 'email-taken', 
                  title: 'Email address is already taken' }
            ]}); 
        }
    });
}

// Handle update profile
function update(req, res) {
    User.findOne({'id.uuid': req.user}).then(user2 => {
        var updates = getUpdates(req, user2);

        updateUser(req.user, updates).then(result => {
            User.findOne({'id.uuid': req.user}).lean().then(user => {
                const users = [ user ];
    
                user.type = 'currentUser';
                getIncludes(req, users).then(included => {
                    sendTransit(req, res, { data: user, included: included } ); 
                })
            })
        })
    })    
};

// Handle change password
function changePassword(req, res) {
    User.findOne({'id.uuid': req.user}).then(user => {
        if(user.checkPassword(user.attributes.email, req.body.currentPassword)) {
            user.passwordHash = req.body.newPassword;
            user.save().then(user => {
                const users = [ user ];

                user.type = 'currentUser';
                getIncludes(req, users).then(included => {
                    sendTransit(req, res, { data: user.toObject(), included: included } ); 
                })
            });
        }
        else {
            res.status(403);
            sendTransit(req, res, { errors: [ 
                { id: new UUID('5e57af67-b849-49e1-9dc9-eea05b469760'), 
                  status: 403, 
                  code: 'forbidden', 
                  title: 'Forbidden'  }
            ]});
        }
    })
};

// Handle change email
function changeEmail(req, res) {
    User.findOne({'id.uuid': req.user}).then(user => {
        if(user.checkPassword(user.attributes.email, req.body.currentPassword)) {
            User.findOne({ 'attributes.email': req.body.email }).then(nu => {
                if(nu == null) {
                    user.attributes.email = req.body.email;
                    user.passwordHash = req.body.currentPassword;
                    user.save().then(user => {
                        const users = [ user ];

                        user.type = 'currentUser';
                        getIncludes(req, users).then(included => {
                            sendTransit(req, res, { data: user.toObject(), included: included } ); 
                        })
                    })
                } else {
                    res.status(409);
                    sendTransit(req, res, { errors: [
                        { id: new UUID('5e57af67-b849-49e1-9dc9-eea05b469760'), 
                        status: 409, 
                        code: 'email-taken', 
                        title: 'Email address is already taken' }
                    ]}); 
                }
            })
        }
        else {
            res.status(403);
            sendTransit(req, res, { errors: [ 
                { id: new UUID('5e57af67-b849-49e1-9dc9-eea05b469760'), 
                  status: 403, 
                  code: 'forbidden', 
                  title: 'Forbidden'  }
            ]});
        }
    })
};

/********************* Integration API ***********************/

function queryall(req, res) {
    var sel = getUserSelection(req.query)
    var projection = getUserProjection(req.query);
    var paging = getPaging(req.query);

    User.find(sel, projection, paging).lean().then(users => {
        var ret = { data: users };
    
        ret['meta'] = {
            totalItems: users.length,
            totalPages: 1,
            page: 1,
            perPage: users.length };
        
        if(req.query['include'] != undefined) {
            getIncludes(req, users).then(includes => {
                if(includes.length > 0)
                    ret['included'] = includes;

                sendTransit(req, res, ret);
            })
        }
        else
            sendTransit(req, res, ret);
    })
}

function updateProfile(req, res) {
    User.findOne({'id.uuid': req.body.id.uuid}).then(user2 => {
        var updates = getUpdates(req, user2);

        updateUser(req.body.id.uuid, updates).then(result => {
            User.findOne({'id.uuid': req.body.id.uuid}).lean().then(user => {
                const users = [ user ];

                getIncludes(req, users).then(included => {
                    sendTransit(req, res, { data: user, included: included } ); 
                })
            })
        })
    })
}

export default { show, queryall, currentShow, create, update, updateProfile, changePassword, changeEmail };