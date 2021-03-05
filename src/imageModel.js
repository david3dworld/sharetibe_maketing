import mongoose from 'mongoose';

// Setup schema
const imageSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'image' },
    attributes: { 
        variants: { 
            'square-small': { type: mongoose.Mixed },
            'square-small2x': { type: mongoose.Mixed },
            'default': { type: mongoose.Mixed },
            'landscape-crop': { type: mongoose.Mixed },
            'landscape-crop2x': { type: mongoose.Mixed },
            'landscape-crop4x': { type: mongoose.Mixed },
            'landscape-crop6x': { type: mongoose.Mixed },
            'scaled-small': { type: mongoose.Mixed },
            'scaled-medium': { type: mongoose.Mixed },
            'scaled-large': { type: mongoose.Mixed },
            'scaled-xlarge': { type: mongoose.Mixed },
        }
    }
}, { id: false });

// Export image model
export const Image = mongoose.model('image', imageSchema);