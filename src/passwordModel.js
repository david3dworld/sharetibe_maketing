import mongoose from 'mongoose';

const passwordSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'passwordReset' },
    user: { type: String },
    createdAt: { type: Date, default: Date.now }
}, { id: false });

// Create a TTL index
passwordSchema.index( { createdAt: 1 }, { expireAfterSeconds: 3600 } );

// Export review model
export const Password = mongoose.model('password', passwordSchema);