const mongoose = require('mongoose');
const Stripe = require('stripe');
const { UUID } = require('sharetribe-flex-sdk').types;

// Setup schema
const userSchema = new mongoose.Schema({
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
    password: { type: String, required: true }
}, { id: false, timestamps: {} });

const stripeAccountSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'stripeAccount' },
    attributes: { 
        stripeAccountId: { type: String },
        stripeAccountData: { type: mongoose.Mixed }
    }
}, { id: false });

const StripeAccount = mongoose.model('stripeAccount', stripeAccountSchema);
const User = mongoose.model('user', userSchema);

function generateGuid() {
    var result, i, j;
    result = '';
    for(j=0; j<32; j++) {
      if( j == 8 || j == 12 || j == 16 || j == 20) 
        result = result + '-';
      i = Math.floor(Math.random()*16).toString(16).toUpperCase();
      result = result + i;
    }
    return result;
}

function importStripeAccount(acct) {
    // YOUR PRIVATE KEY
    const stripe = new Stripe('sk_test_3HFz4h2erVmIdsVtB7M0R2Ya00OZYjzqAQ');

    stripe.accounts.retrieve(acct, function(err, account) {
        var stripeAccount = new StripeAccount;
        User.findOne({ 'attributes.email': account.email }).then(user => {
            var stripeAccount = new StripeAccount;

            // Link to ffs object and save
            stripeAccount.id = new UUID(generateGuid());
            stripeAccount.attributes.stripeAccountData = account;
            stripeAccount.attributes.stripeAccountId = account.id;
            stripeAccount.save().then(rs => {
                // Link to current user
                User.updateOne({'id.uuid': user.id.uuid }, { 
                    'relationships.stripeAccount.data':  { id: stripeAccount.id, type: 'stripeAccount' },
                    'attributes.stripeConnected': true,
                }).then(res2 => {
                    console.log(res2);
                });
            });
        })
    });
}

function mainImport() {
    //var myArgs = process.argv.slice(2);
    var myArgs = [
        "acct_1FfCtiDim24KP95T",
        "acct_1Fr6xYAvJGTCQHDE",
        "acct_1G74tRA4vgw4xo1X",
        "acct_1GILaXAdWG5pwGus",
        "acct_1GILqKJlfX7r099V",
        "acct_1GIaHzK66DF8BGbY",
        "acct_1GIauKJtlaQUDQLa",
        "acct_1GIhGVHJOzpQbvuh",
        "acct_1GItPiGdb7awAYfa",
        "acct_1GIu62H3wXahWdf1",
        "acct_1GJk1XJBeJhGBURO",
        "acct_1GJmQtIWYzPpuZsx",
        "acct_1GJx4OEIJouqcshj",
        "acct_1GJxxDCwaTPLDqA8",
        "acct_1GJzthLGhCDyVkTy",
        "acct_1GLEEzJkElqRwAJk",
        "acct_1GN1CeLJk3QvTXbG",
        "acct_1GOKFALowCqxEFjE",
        "acct_1GWkERBDqPyhcunP",
        "acct_1GcU18HeKUOZgg0I"
    ];


    // Connect to Mongoose and set connection variable (YOUR MONGODB)
    mongoose.connect('mongodb://mongoadmin:Winchester2020@185.43.51.91:27017/ffs?authSource=admin', { 
        useNewUrlParser: true, 
        useUnifiedTopology: true 
    });
    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function() {
        console.log("Db connected successfully");
    });

    for(const acct of myArgs) {
        importStripeAccount(acct);
    }
}

mainImport()
