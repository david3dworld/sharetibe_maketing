import mongoose from 'mongoose';
import crypto from 'crypto';

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

// I know, I know, I should use salt!
userSchema.methods.encryptPassword = function (email, password) {
    return crypto.createHmac('sha256', password).update(email).digest('hex');
};

userSchema.virtual('passwordHash')
    .set(function (password) {
        this.password = this.encryptPassword(this.attributes.email, password);
    })
    .get(function () { return this.password; });

userSchema.methods.checkPassword = function (email, password) {
    return this.encryptPassword(email, password) === this.password;
};

// Export user model
export const User = mongoose.model('user', userSchema);