import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'booking' },
    attributes: { 
        seats: { type: Number, default: 1 },
        start: { type: Date },
        end: { type: Date },
        displayStart: { type: Date },
        displayEnd: { type: Date },
        state: { type: String }
    },
    relationships: {
/*        transaction: {*/
            data: {
                id: { 
                    _sdkType: { type: String, default: 'UUID' },
                    uuid: { type: String }
                },
                type: { type: String, default: 'transaction' }
            }
/*        }*/
    }
}, { id: false });

// Export booking model
export const Booking = mongoose.model('booking', bookingSchema);