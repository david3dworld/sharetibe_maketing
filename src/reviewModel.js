import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'review' },
    attributes: { 
        type: { type: String },
        state: { type: String },
        rating: { type: Number },
        content: { type: String },
        deleted: { type: Boolean },
        createdAt: { type: Date, default: Date.now }
    },
    relationships: {
        author: {
            data: {
                id: { 
                    _sdkType: { type: String, default: 'UUID' },
                    uuid: { type: String }
                },
                type: { type: String, default: 'user' }
            }
        },
        listing: {
            data: {
                id: { 
                    _sdkType: { type: String, default: 'UUID' },
                    uuid: { type: String }
                },
                type: { type: String, default: 'listing' },
            }
        },
        subject: {
            data: {
                id: { 
                    _sdkType: { type: String, default: 'UUID' },
                    uuid: { type: String }
                },
                type: { type: String, default: 'user' },
            }
        }
    }
}, { id: false });

// Export review model
export const Review = mongoose.model('review', reviewSchema);