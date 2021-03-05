import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'timeSlot' },
    attributes: { 
        type: { type: String, default: 'time-slot/day' },
        seats: { type: Number, default: 1 },
        start: { type: Date, default: Date.now },
        end: { type: Date }
    }
}, { id: false });

// Export timeSlot model
export const TimeSlot = mongoose.model('timeSlot', timeSlotSchema);