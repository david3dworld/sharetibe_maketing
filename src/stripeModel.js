import mongoose from 'mongoose';

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

const stripePaymentMethodSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'stripePaymentMethod' },
    attributes: { 
        type: { type: String, default: 'stripe-payment-method/card' },
        stripePaymentMethodId: { type: String },
        card: {
            brand: { type: String },
            last4Digits: { type: String },
            expirationYear: { type: Number },
            expirationMonth: { type: Number },
        }
    }
}, { id: false });

const stripeCustomerSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'stripeCustomer' },
    attributes: { 
        stripeCustomerId: { type: String },
    },
    relationships: { type: mongoose.Mixed },
}, { id: false });

// Export stripe models
export const StripeAccount = mongoose.model('stripeAccount', stripeAccountSchema);
export const StripePaymentMethod = mongoose.model('stripePaymentMethod', stripePaymentMethodSchema);
export const StripeCustomer = mongoose.model('stripeCustomer', stripeCustomerSchema);