import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'availabilityException' },
    attributes: {
        seats: { type: Number, default: 1 },
        start: { type: Date, default: Date.now },
        end: { type: Date, default: Date.now }
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
        }
    }
}, { id: false });

// Export availability model
export const Availability = mongoose.model('availability', availabilitySchema);