const { UUID } = require('sharetribe-flex-sdk').types;
const sharetribeSdk = require('sharetribe-flex-sdk');
const mongoose = require('mongoose');
const crypto = require('crypto');

// Setup schemas
const userSchema = mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'user' },
    attributes: {
        banned: { type: Boolean },
        deleted: { type: Boolean },
        createdAt: { type: Date, default: Date.now },
        email: { type: String },
        emailVerified: { type: Boolean },
        pendingEmail: { type: String }, 
        stripeConnected: { type: Boolean },
        stripePayoutsEnabled: { type: Boolean },
        stripeChargesEnabled: { type: Boolean },
        profile: {
            firstName: { type: String },
            lastName: { type: String },
            displayName: { type: String },
            abbreviatedName: { type: String },
            bio: { type: String },
            publicData: { type: mongoose.Mixed },
            protectedData: { type: mongoose.Mixed },
            privateData: { type: mongoose.Mixed },
            metadata: { type: mongoose.Mixed }
        }
    },
    relationships: { type: mongoose.Mixed },
    password: { type: String }
}, { id: false, timestamps: {} });

var fullImageSchema = mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'image' },
    attributes: {
        variants: {
            'square-small': { type: mongoose.Mixed },
            'square-small2x': { type: mongoose.Mixed },
            'default': { type: mongoose.Mixed },
            'landscape-crop': { type: mongoose.Mixed },
            'landscape-crop2x': { type: mongoose.Mixed },
            'landscape-crop4x': { type: mongoose.Mixed },
            'landscape-crop6x': { type: mongoose.Mixed },
            'scaled-small': { type: mongoose.Mixed },
            'scaled-medium': { type: mongoose.Mixed },
            'scaled-large': { type: mongoose.Mixed },
            'scaled-xlarge': { type: mongoose.Mixed },
        }
    }
}, { id: false });

var imageSchema = mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'image' },
}, { id: false });

var listingSchema = mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'listing' },
    attributes: {
        description: { type: String },
        deleted: { type: Boolean },
        geolocation: { 
            _sdkType: { type: String, default: 'LatLng' },
            lat: { type: mongoose.Number },
            lng: { type: mongoose.Number }
        },
        createdAt: { type: Date, default: Date.now },
        state: { type: String },
        title: { type: String },
        availabilityPlan: {
            type: { type: String, default: 'availability-plan/day' }
        },
        publicData: { 
            location: {
                address: { type: String },
                building: { type: String }
            },
            make: { type: String },
            model: { type: String },
            rules: { type: String },
            year: { type: Number }
         },
        price: {
            _sdkType: { type: String, default: 'Money'},
            amount: { type: Number },
            currency: { type: String, default: 'GBP' }
        },
        metadata: { type: mongoose.Mixed },
    },
    relationships: { 
        author: { 
            data: {
                id: { 
                    _sdkType: { type: String, default: 'UUID' },
                    uuid: { type: String }
                },
                type: { type: String, default: 'user' },
            }
        },
        images: {
            data: [imageSchema] 
        }
    },
    location: {
        type: { type: String, default: 'Point'},
        coordinates: [ ]
    }
}, { id: false, timestamps: {} } );

// You need to import (mongoimport) the user.csv export for users that don't have 
// listings. This needs to be in the target database BEFORE running this script

var importSchema = mongoose.Schema({ 
    "Id" : { type: String },
    "FirstName" : { type: String },
    "LastName" : { type: String },
    "DisplayName" : { type: String },
    "CreatedAt" : { type: String },
    "Banned" : { type: String },
    "NumOfOpenListings" : { type: String },
    "NumOfClosedListings" : { type: String },
    "EmailAddress" : { type: String },
    "EmailVerified" : { type: String },
    "PublicData" : { type: String },
    "PrivateData" : { type: String },
    "ProtectedData" : { type: String },
}, { id: false });

// Connect to Mongoose and set connection variable
mongoose.connect('mongodb://mongoadmin:Winchester2020@185.43.51.91:27017/ffs?authSource=admin', { 
     useNewUrlParser: true, 
     useUnifiedTopology: true 
});
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
     console.log("Db connected successfully")
});

const Listing = mongoose.model('listing', listingSchema);
const Image = mongoose.model('timage', imageSchema);
const FullImage = mongoose.model('image', fullImageSchema);
const User = mongoose.model('user', userSchema);
const Import = mongoose.model('oldencars-test-users', importSchema);

// Set the ClientID of your sharetribe instance (production)
var sdk = sharetribeSdk.createInstance({
    clientId: "84899e44-ffdb-401b-9aaf-6ab3a7d49a99", 
//    baseUrl: "http://localhost:8080/"
});

async function getUser(userId) {
    return new Promise(resolve => {
        sdk.users.show( { id: userId, include: 'profileImage',
                            'fields.image': 'variants.default,variants.landscape-crop,variants.landscape-crop2x,variants.landscape-crop4x,variants.landscape-crop6x,variants.scaled-small,variants.scaled-medium,variants.scaled-large,variants.scaled-xlarge,variants.square-small,variants.square-small2x' }, 
                        {'attributes.profile.privateData': 1, 
                                            'attributes.profile.publicData': 1, 
                                            'attributes.profile.meteData': 1 } ).then(res => {
            resolve(res);
        }).catch(err => {
            console.log(err, userId);
        });
    });
}

async function importall() {
    sdk.listings.query( { include:'author,images,author.profileImage', 
                          'fields.image': 'variants.default,variants.landscape-crop,variants.landscape-crop2x,variants.landscape-crop4x,variants.landscape-crop6x,variants.scaled-small,variants.scaled-medium,variants.scaled-large,variants.scaled-xlarge,variants.square-small,variants.square-small2x' }).then(res => { 
        for(var i = 0; i < res.data.data.length; i++) {
            var listing = new Listing();
            var src = res.data.data[i];

            listing.id.uuid = src.id.uuid;
            listing.type = src.type;
            listing.attributes.description = src.attributes.description;
            listing.attributes.deleted = src.attributes.deleted;
            listing.attributes.createdAt = src.attributes.createdAt;
            listing.attributes.state = src.attributes.state;
            listing.attributes.title = src.attributes.title;
            listing.attributes.geolocation.lat = src.attributes.geolocation.lat;
            listing.attributes.geolocation.lng = src.attributes.geolocation.lng;
            if(src.attributes.publicData.location != undefined) {
                listing.attributes.publicData.location.address = src.attributes.publicData.location.address;
                listing.attributes.publicData.location.building = src.attributes.publicData.location.building;
            }
            listing.attributes.publicData.make = src.attributes.publicData.make;
            listing.attributes.publicData.model = src.attributes.publicData.model
            listing.attributes.publicData.rules = src.attributes.publicData.rules;
            listing.attributes.publicData.year = src.attributes.publicData.year;
            listing.attributes.price.currency = src.attributes.price.currency;
            listing.attributes.price.amount = src.attributes.price.amount;
            listing.relationships.author.data.id.uuid = src.relationships.author.data.id.uuid;
            listing.relationships.author.data.type = src.relationships.author.data.type;
            listing.location.coordinates[0] = src.attributes.geolocation.lng;            
            listing.location.coordinates[1] = src.attributes.geolocation.lat;            

            for(var j = 0; j < src.relationships.images.data.length; j++) {
                var image = new Image();

                image.id.uuid = src.relationships.images.data[j].id.uuid;
                listing.relationships.images.data.push(image);
            }

            listing.save(function (err) {
                if (err)
                    console.log('error:', err);
            });
        }
        console.log(res.data.data.length, 'listings processed')
        var users = 0; images = 0

        // Import the images
        for(var i = 0; i < res.data.included.length; i++) {
            var src = res.data.included[i];

            if(src.type == 'image') {
                var image = new FullImage();

                image = Object.assign(image, src);
                image.save(function (err) {
                    if (err)
                        console.log('error:', err);
                }); 

                images++;
            };
        }

        // Import the users from the console export
        Import.find({}, async function(err2, res2) {
            for(var j = 0; j < res2.length; j++) {
                var user = new User;
                var userFound = false;

                // User already imported via SDK?
                for(var k = 0; k < res.data.included.length && !userFound; k++) {
                    var src = res.data.included[k];

                    if(src.type == 'user' && res2[j].Id == src.id.uuid) {
                        user = Object.assign(user, src);
                        userFound = true;
                    };  
                }

                if(!userFound) {
                    var userId = new UUID(res2[j].Id);
                    const x = await getUser(userId);

                    user = Object.assign(user, x.data.data); 

                    // Check if there's a profileImage, we have it from the listings import
                    if(user.relationships != undefined &&
                            user.relationships.profileImage != undefined &&
                            user.relationships.profileImage.data != undefined &&
                            user.relationships.profileImage.data.id != undefined) {
                        var notFound = true;

                        for(var i = 0; i < res.data.included.length && notFound; i++) {
                            var src = res.data.included[i];
    
                            if(src.type = 'image' && 
                                    user.relationships.profileImage.data.id.uuid == src.id.uuid) {
                                        notFound = false;
                            }
                        }

                        // Otherwise it should be included by getUser
                        if(notFound) {
                            var src = x.data.included[0];
                            var image = new FullImage();

                            image = Object.assign(image, src);
                            image.save(function (err) {
                                if (err)
                                    console.log('error:', err);
                            }); 

                            images++;
                        }
                    }
                }

                user.attributes.profile.firstName = res2[j].FirstName;
                user.attributes.profile.lastName = res2[j].LastName;
                user.attributes.profile.protectedData = JSON.parse(res2[j].ProtectedData);
                user.attributes.email = res2[j].EmailAddress;
                user.attributes.emailVerified = res2[j].EmailVerified;
                user.password = crypto.createHmac('sha256', 'oldencars').update(user.attributes.email).digest('hex')

                user.save(function (err) {
                    if (err)
                        console.log('error:', err);
                    else
                        users++;
                }); 
            }

            console.log(users, 'users processed');
            console.log(images, 'images processed');
        });
    });
}

importall();
