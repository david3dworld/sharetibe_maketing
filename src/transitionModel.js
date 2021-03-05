import mongoose from 'mongoose';

const transitionSchema = new mongoose.Schema({
    id: { 
        _sdkType: { type: String, default: 'UUID' },
        uuid: { type: String }
    },
    type: { type: String, default: 'processTransition' },
    attributes: { 
        name: { type: String },
        actor: [ { type: String } ],
        actions: [ { type: String } ],
        params: {
            req: { type: mongoose.Mixed },
            opt: { type: mongoose.Mixed }
        },
        from: { type: String },
        to: { type: String } 
    }
}, { id: false });

// Export message model
export const Transition = mongoose.model('transition', transitionSchema);