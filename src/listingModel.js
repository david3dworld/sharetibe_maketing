import mongoose from 'mongoose';

// Setup schema
const imageSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'image' },
}, { id: false });

const listingSchema = new mongoose.Schema({
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
            type: { type: String, default: 'availability-plan/day' },
            entries: { type: Array, default: [
                { dayOfWeek: 'mon',
                  seats: 1
                },
                { dayOfWeek: 'tue',
                  seats: 1
                },
                { dayOfWeek: 'wed',
                  seats: 1
                },
                { dayOfWeek: 'thu',
                  seats: 1
                },
                { dayOfWeek: 'fri',
                  seats: 1
                },
                { dayOfWeek: 'sat',
                  seats: 1
                },
                { dayOfWeek: 'sun',
                  seats: 1
                }
            ]} 
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
            data: [ imageSchema ] 
        }
    },
    location: {
        type: { type: String, default: 'Point'},
        coordinates: [ ]
    }
}, { id: false, timestamps: {} });

// Create a keyword index
listingSchema.index( { 
    'attributes.description': 'text', 
    'attributes.title': 'text', 
    'attributes.publicData.make': 'text',
    'attributes.publicData.model': 'text',
    'attributes.publicData.rules': 'text' } );

// Export listing model
export const Listing = mongoose.model('listing', listingSchema);