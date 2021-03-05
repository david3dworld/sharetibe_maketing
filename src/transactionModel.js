import mongoose from 'mongoose';
import { BigDecimal } from './types.js';

const lineItemSchema = new mongoose.Schema({
    code: { type: String },
    quantity: { 
        _sdkType: { type: String, default: 'BigDecimal' },
        value: { type: Number, default: 0 }
    },
    units: { 
        _sdkType: { type: String, default: 'BigDecimal' },
        value: { type: Number, default: 0 }
    },
    seats: { type: Number },
    percentage: { 
        _sdkType: { type: String, default: 'BigDecimal' },
        value: { type: Number, default: 0 }
    },
    reversal: { type: Boolean },
    unitPrice: {
        _sdkType: { type: String, default: 'Money'},
        amount: { type: Number },
        currency: { type: String, default: 'GBP' }
    },
    lineTotal: {
        _sdkType: { type: String, default: 'Money'},
        amount: { type: Number },
        currency: { type: String, default: 'GBP' }
    },
    includeFor: [ { type: String } ]
}, { id: false });

const transitionLineSchema = new mongoose.Schema({
    transition: { type: String },
    createdAt: { type: Date, default: Date.now },
    by: { type: String },
}, { id: false });

const reviewSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'review' },
}, { id: false });

const messageSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'message' },
}, { id: false });

const transactionSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'transaction' },
    attributes: { 
        createdAt: { type: Date, default: Date.now },
        processName: { type: String, default: 'preauth-with-daily-booking' },
        processVersion: { type: Number, default: 1 },
        lastTransition: { type: String },
        lastTransitionedAt: { type: Date, default: Date.now },
        payinTotal: { 
            _sdkType: { type: String, default: 'Money'},
            amount: { type: Number },
            currency: { type: String, default: 'GBP' }
        },
        payoutTotal: { 
            _sdkType: { type: String, default: 'Money'},
            amount: { type: Number },
            currency: { type: String, default: 'GBP' }
        },
        lineItems: [ lineItemSchema ],
        protectedData: { type: mongoose.Mixed },
        transitions: [ transitionLineSchema ],   
    },
    relationships: {
        listing: { 
            data: {
                id: { 
                    _sdkType: { type: String, default: 'UUID' },
                    uuid: { type: String }
                },
                type: { type: String, default: 'listing' },
            }
        },
        provider: { 
            data: {
                id: { 
                    _sdkType: { type: String, default: 'UUID' },
                    uuid: { type: String }
                },
                type: { type: String, default: 'user' },
            }
        },
        customer: { 
            data: {
                id: { 
                    _sdkType: { type: String, default: 'UUID' },
                    uuid: { type: String }
                },
                type: { type: String, default: 'user' },
            }
        },
        booking: {
            data: {}
        },
        reviews: {
            data: [ reviewSchema ]
        },
        messages: {
            data: [ messageSchema ]
        }
    }
}, { id: false, timestamps: {} });

// Export transaction models
export const TransitionLine = mongoose.model('transitionline', transitionLineSchema);
export const LineItem = mongoose.model('lineitem', lineItemSchema);
export const Transaction = mongoose.model('transaction', transactionSchema);