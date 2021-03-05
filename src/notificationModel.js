import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'notification' },
    attributes: { 
        name: { type: String },
        on: { type: String },
        to: [ { type: String } ],
        subject: { type: String },
        message: { type: String },
        template: { type: String }
    }
}, { id: false });

// Export notification model
export const Notification = mongoose.model('notification', notificationSchema);