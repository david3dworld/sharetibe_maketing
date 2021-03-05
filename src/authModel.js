import mongoose from 'mongoose';

var accessTokenSchema = new mongoose.Schema({
    userId: { type: String },
    clientId: { type: String, required: true },
    scope: { type: String },
    tokenHash: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

var refreshTokenSchema = new mongoose.Schema({
    userId: { type: String },
    clientId: { type: String, required: true },
    scope: { type: String },
    token: { type: String, unique: true, required: true },
    createdAt: { type: Date, default: Date.now }
});

// Create a TTL index
accessTokenSchema.index( { createdAt: 1 }, { expireAfterSeconds: 86400 } );


// Export auth models
export const RefreshToken = mongoose.model('refreshtoken', refreshTokenSchema);
export const AccessToken = mongoose.model('authtoken', accessTokenSchema);